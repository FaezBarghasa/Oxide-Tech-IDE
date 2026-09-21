use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: u32,
    pub column_start: u32,
    pub column_end: u32,
    pub line_text: String,
    pub match_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFileGroup {
    pub file_path: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub use_regex: bool,
    pub include_glob: Option<String>, // e.g. "*.rs"
    pub exclude_glob: Option<String>, // e.g. "target/**"
    pub max_results: Option<u32>,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            case_sensitive: false,
            whole_word: false,
            use_regex: false,
            include_glob: None,
            exclude_glob: Some("target/**,node_modules/**,.git/**".to_string()),
            max_results: Some(500),
        }
    }
}

// ── ripgrep-based text search ─────────────────────────────────────────────────

/// Search workspace text via ripgrep, returning grouped results by file.
/// Emits `search:match` events for streaming results.
#[tauri::command]
pub async fn search_workspace_text(
    app: AppHandle,
    workspace_path: String,
    query: String,
    options: Option<SearchOptions>,
) -> Result<Vec<SearchFileGroup>, String> {
    let opts = options.unwrap_or_default();
    let path = Path::new(&workspace_path);

    // Build ripgrep args
    let mut args: Vec<String> = vec![
        "--json".to_string(),
        "--line-number".to_string(),
        "--column".to_string(),
    ];

    if !opts.case_sensitive {
        args.push("--ignore-case".to_string());
    }
    if opts.whole_word {
        args.push("--word-regexp".to_string());
    }
    if !opts.use_regex {
        args.push("--fixed-strings".to_string());
    }
    if let Some(include) = &opts.include_glob {
        args.push(format!("--glob={}", include));
    }
    if let Some(exclude) = &opts.exclude_glob {
        for pat in exclude.split(',') {
            args.push(format!("--glob=!{}", pat.trim()));
        }
    }
    if let Some(max) = opts.max_results {
        args.push(format!("--max-count={}", max));
    }

    args.push("--".to_string());
    args.push(query.clone());
    args.push(".".to_string());

    let mut child = Command::new("rg")
        .args(&args)
        .current_dir(path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "ripgrep not found or failed to spawn: {}. Install with: cargo install ripgrep",
                e
            )
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture ripgrep stdout")?;

    let mut reader = BufReader::new(stdout).lines();
    let mut groups: std::collections::HashMap<String, Vec<SearchMatch>> =
        std::collections::HashMap::new();

    while let Ok(Some(line)) = reader.next_line().await {
        let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };

        if msg.get("type").and_then(|v| v.as_str()) != Some("match") {
            continue;
        }

        let Some(data) = msg.get("data") else {
            continue;
        };

        let file_path = data
            .get("path")
            .and_then(|p| p.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let line_number = data
            .get("line_number")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let line_text = data
            .get("lines")
            .and_then(|l| l.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim_end_matches('\n')
            .to_string();

        if let Some(submatches) = data.get("submatches").and_then(|v| v.as_array()) {
            for sub in submatches {
                let match_text = sub
                    .get("match")
                    .and_then(|m| m.get("text"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let col_start = sub.get("start").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let col_end = sub.get("end").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

                let m = SearchMatch {
                    file_path: file_path.clone(),
                    line_number,
                    column_start: col_start,
                    column_end: col_end,
                    line_text: line_text.clone(),
                    match_text: match_text.clone(),
                };

                // Emit streaming event
                let _ = app.emit(
                    "search:match",
                    serde_json::json!({
                        "file_path": &file_path,
                        "line_number": line_number,
                        "line_text": &line_text,
                        "match_text": &match_text,
                        "col_start": col_start,
                    }),
                );

                groups.entry(file_path.clone()).or_default().push(m);
            }
        }
    }

    let _ = child.wait().await;

    let mut result: Vec<SearchFileGroup> = groups
        .into_iter()
        .map(|(file_path, matches)| SearchFileGroup { file_path, matches })
        .collect();

    // Sort by file path for deterministic output
    result.sort_by(|a, b| a.file_path.cmp(&b.file_path));
    Ok(result)
}

/// Search workspace symbols via LSP workspace/symbol (delegated to lsp_daemon).
/// Falls back to ctags-style regex search if LSP not running.
#[tauri::command]
pub async fn search_workspace_symbols(
    workspace_path: String,
    query: String,
) -> Result<Vec<SearchMatch>, String> {
    let path = Path::new(&workspace_path);

    // Use ripgrep with Rust-specific symbol patterns as fast fallback
    // Matches: fn, struct, enum, trait, impl, type, const, static, mod
    let pattern = format!(
        r"(pub\s+)?(fn|struct|enum|trait|impl|type|const|static|mod)\s+{}",
        regex_escape(&query)
    );

    let output = Command::new("rg")
        .args([
            "--json",
            "--line-number",
            "--column",
            "--type=rust",
            "--regexp",
            &pattern,
            ".",
        ])
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!("ripgrep symbol search failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout.lines() {
        let Ok(msg) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };

        if msg.get("type").and_then(|v| v.as_str()) != Some("match") {
            continue;
        }

        let Some(data) = msg.get("data") else {
            continue;
        };

        let file_path = data
            .get("path")
            .and_then(|p| p.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let line_number = data
            .get("line_number")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        let line_text = data
            .get("lines")
            .and_then(|l| l.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim_end_matches('\n')
            .to_string();

        let Some(submatches) = data.get("submatches").and_then(|v| v.as_array()) else {
            continue;
        };

        let Some(sub) = submatches.first() else {
            continue;
        };

        results.push(SearchMatch {
            file_path,
            line_number,
            column_start: sub.get("start").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            column_end: sub.get("end").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            line_text,
            match_text: sub
                .get("match")
                .and_then(|m| m.get("text"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        });
    }

    Ok(results)
}

/// Replace all matches in a file — used by Find & Replace
#[tauri::command]
pub async fn search_replace_in_file(
    file_path: String,
    find: String,
    replace: String,
    use_regex: bool,
    case_sensitive: bool,
) -> Result<u32, String> {
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let (new_content, count) = if use_regex {
        let flags = if case_sensitive { "" } else { "(?i)" };
        let pattern = format!("{}{}", flags, find);
        let re = regex::Regex::new(&pattern).map_err(|e| format!("Invalid regex: {}", e))?;
        let count = re.find_iter(&content).count() as u32;
        (
            re.replace_all(&content, replace.as_str()).to_string(),
            count,
        )
    } else {
        let count = if case_sensitive {
            content.matches(&find).count() as u32
        } else {
            content.to_lowercase().matches(&find.to_lowercase()).count() as u32
        };
        let new = if case_sensitive {
            content.replace(&find, &replace)
        } else {
            // Case-insensitive replace via regex
            let re = regex::Regex::new(&format!("(?i){}", regex_escape(&find)))
                .map_err(|e| format!("Regex error: {}", e))?;
            re.replace_all(&content, replace.as_str()).to_string()
        };
        (new, count)
    };

    tokio::fs::write(&file_path, new_content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(count)
}

fn regex_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
    for ch in s.chars() {
        match ch {
            '.' | '+' | '*' | '?' | '^' | '$' | '{' | '}' | '[' | ']' | '|' | '(' | ')' | '\\' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
    }
    out
}
