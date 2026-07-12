use std::collections::HashMap;
use jaro_winkler::jaro_winkler;

#[derive(Debug, Clone)]
pub struct LoopDiagnostics {
    pub compiler_error: String,
    pub edited_files: Vec<String>,
    pub proposed_fix: String,
    pub timestamp: u64,
}

pub struct LoopDefuser {
    history: Vec<LoopDiagnostics>,
    limit: usize,
    threshold: f64,
}

impl LoopDefuser {
    pub fn new(limit: usize, threshold: f64) -> Self {
        Self {
            history: Vec::new(),
            limit,
            threshold,
        }
    }

    pub fn register_turn(&mut self, turn: LoopDiagnostics) -> (bool, HashMap<String, f32>) {
        let mut is_oscillating = false;
        let mut logit_bias = HashMap::new();

        for past_turn in &self.history {
            let error_similarity = jaro_winkler(&turn.compiler_error, &past_turn.compiler_error);
            let fix_similarity = jaro_winkler(&turn.proposed_fix, &past_turn.proposed_fix);

            if error_similarity > self.threshold && fix_similarity > self.threshold {
                is_oscillating = true;
                break;
            }
        }

        if is_oscillating {
            logit_bias.insert("try".to_string(), -10.0);
            logit_bias.insert("wait".to_string(), -10.0);
            logit_bias.insert("same".to_string(), -10.0);
        }

        self.history.push(turn);
        if self.history.len() > self.limit {
            self.history.remove(0);
        }

        (is_oscillating, logit_bias)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_oscillation_detection() {
        let mut defuser = LoopDefuser::new(10, 0.9);

        let turn1 = LoopDiagnostics {
            compiler_error: "error: expected type, found `}`".to_string(),
            edited_files: vec!["file.rs".to_string()],
            proposed_fix: "add a semicolon".to_string(),
            timestamp: 0,
        };

        let turn2 = LoopDiagnostics {
            compiler_error: "error: expected type, found `}`".to_string(),
            edited_files: vec!["file.rs".to_string()],
            proposed_fix: "add a semicolon".to_string(),
            timestamp: 1,
        };

        let (is_oscillating, _) = defuser.register_turn(turn1);
        assert!(!is_oscillating);

        let (is_oscillating, logit_bias) = defuser.register_turn(turn2);
        assert!(is_oscillating);
        assert!(logit_bias.contains_key("try"));
    }
}
