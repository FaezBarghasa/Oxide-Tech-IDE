use std::collections::HashMap;
use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoopDiagnostics {
    pub compiler_error: String,
    pub edited_files: Vec<String>,
    pub proposed_fix: String,
    pub timestamp: u64,
}

pub struct LoopDefuser {
    history: Vec<LoopDiagnostics>,
    limit: usize,
    threshold: f32,
}

impl LoopDefuser {
    pub fn new(limit: usize, threshold: f32) -> Self {
        Self {
            history: Vec::new(),
            limit,
            threshold,
        }
    }

    pub fn register_turn(&mut self, turn: LoopDiagnostics) -> (bool, HashMap<String, f32>) {
        let mut is_looping = false;
        let mut logit_bias = HashMap::new();

        for past_turn in &self.history {
            let error_similarity = jaro_winkler(&turn.compiler_error, &past_turn.compiler_error);
            let fix_similarity = jaro_winkler(&turn.proposed_fix, &past_turn.proposed_fix);

            if error_similarity > self.threshold && fix_similarity > self.threshold {
                is_looping = true;
                logit_bias.insert("try".to_string(), -10.0);
                logit_bias.insert("wait".to_string(), -10.0);
                logit_bias.insert("same".to_string(), -10.0);
                break;
            }
        }

        self.history.push(turn);
        if self.history.len() > self.limit {
            self.history.remove(0);
        }

        (is_looping, logit_bias)
    }
}

// Jaro-Winkler implementation
pub fn jaro_winkler(a: &str, b: &str) -> f64 {
    let a_len = a.len();
    let b_len = b.len();

    if a_len == 0 || b_len == 0 {
        return 0.0;
    }

    let match_distance = (a_len.max(b_len) / 2) - 1;

    let mut a_matches = vec![false; a_len];
    let mut b_matches = vec![false; b_len];

    let mut matches = 0;
    for i in 0..a_len {
        let start = i.saturating_sub(match_distance);
        let end = (i + match_distance + 1).min(b_len);
        for j in start..end {
            if !b_matches[j] && a.chars().nth(i) == b.chars().nth(j) {
                a_matches[i] = true;
                b_matches[j] = true;
                matches += 1;
                break;
            }
        }
    }

    if matches == 0 {
        return 0.0;
    }

    let mut t = 0.0;
    let mut k = 0;
    for i in 0..a_len {
        if a_matches[i] {
            while !b_matches[k] {
                k += 1;
            }
            if a.chars().nth(i) != b.chars().nth(k) {
                t += 0.5;
            }
            k += 1;
        }
    }

    let jaro = ((matches as f64 / a_len as f64)
        + (matches as f64 / b_len as f64)
        + ((matches as f64 - t) / matches as f64))
        / 3.0;

    let mut p = 0.1;
    let mut l = 0;
    while l < 4 && l < a_len && l < b_len && a.chars().nth(l) == b.chars().nth(l) {
        l += 1;
    }

    jaro + (l as f64 * p * (1.0 - jaro))
}


async fn evaluate_loop(defuser: web::Data<std::sync::Mutex<LoopDefuser>>, turn: web::Json<LoopDiagnostics>) -> impl Responder {
    let mut defuser = defuser.lock().unwrap();
    let (is_looping, logit_bias) = defuser.register_turn(turn.into_inner());
    HttpResponse::Ok().json(serde_json::json!({
        "is_looping": is_looping,
        "logit_bias": logit_bias,
    }))
}

pub async fn run_server() -> std::io::Result<()> {
    let defuser = web::Data::new(std::sync::Mutex::new(LoopDefuser::new(10, 0.8)));
    HttpServer::new(move || {
        App::new()
            .app_data(defuser.clone())
            .route("/antidoom/evaluate", web::post().to(evaluate_loop))
    })
    .bind("127.0.0.1:8081")?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_loop_detection() {
        let mut defuser = LoopDefuser::new(10, 0.8);
        let turn1 = LoopDiagnostics {
            compiler_error: "error: expected type, found `}`".to_string(),
            edited_files: vec!["file1.rs".to_string()],
            proposed_fix: "add a semicolon".to_string(),
            timestamp: 0,
        };
        let turn2 = LoopDiagnostics {
            compiler_error: "error: expected type, found `}`".to_string(),
            edited_files: vec!["file1.rs".to_string()],
            proposed_fix: "add a semicolon".to_string(),
            timestamp: 1,
        };

        defuser.register_turn(turn1);
        let (is_looping, _) = defuser.register_turn(turn2);
        assert!(is_looping);
    }
}
