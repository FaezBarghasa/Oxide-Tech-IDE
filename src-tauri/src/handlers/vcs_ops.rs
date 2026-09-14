use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatusDetail {
    pub path: String,
    pub status: String, // "untracked" | "modified" | "added" | "deleted" | "renamed" | "conflict" | "ignored"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineDiffDetail {
    pub line_number: u32,
    pub kind: String, // "added" | "modified" | "deleted"
    pub old_content: Option<String>,
    pub new_content: Option<String>,
}

#[tauri::command]
pub async fn vcs_get_detailed_status(
    workspace_path: String,
) -> Result<Vec<GitFileStatusDetail>, String> {
    let output = Command::new("git")
        .arg("status")
        .arg("--porcelain=v1")
        .current_dir(Path::new(&workspace_path))
        .output()
        .await
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }

        let index_stat = &line[0..1];
        let worktree_stat = &line[1..2];
        let path = line[3..].trim().to_string();

        let (status, staged) = match (index_stat, worktree_stat) {
            ("?", "?") => ("untracked".to_string(), false),
            ("A", " ") => ("added".to_string(), true),
            ("M", " ") => ("modified".to_string(), true),
            (" ", "M") => ("modified".to_string(), false),
            ("M", "M") => ("modified".to_string(), true),
            ("D", " ") => ("deleted".to_string(), true),
            (" ", "D") => ("deleted".to_string(), false),
            ("R", " ") => ("renamed".to_string(), true),
            ("U", _) | (_, "U") | ("A", "A") | ("D", "D") => ("conflict".to_string(), false),
            ("!", "!") => ("ignored".to_string(), false),
            _ => ("modified".to_string(), false),
        };

        results.push(GitFileStatusDetail {
            path,
            status,
            staged,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn vcs_get_line_diffs(
    file_path: String,
    workspace_path: String,
) -> Result<Vec<LineDiffDetail>, String> {
    let output = Command::new("git")
        .arg("diff")
        .arg("-U0")
        .arg("--")
        .arg(&file_path)
        .current_dir(Path::new(&workspace_path))
        .output()
        .await
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut diffs = Vec::new();

    // Parse unified diff headers e.g. @@ -10,0 +11,3 @@ or @@ -15,2 +15,2 @@
    let mut current_line = 1u32;
    for line in stdout.lines() {
        if line.starts_with("@@ ") {
            if let Some(plus_idx) = line.find('+') {
                let rest = &line[plus_idx + 1..];
                let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(num) = num_str.parse::<u32>() {
                    current_line = num;
                }
            }
        } else if line.starts_with('+') && !line.starts_with("+++") {
            diffs.push(LineDiffDetail {
                line_number: current_line,
                kind: "added".to_string(),
                old_content: None,
                new_content: Some(line[1..].to_string()),
            });
            current_line += 1;
        } else if line.starts_with('-') && !line.starts_with("---") {
            diffs.push(LineDiffDetail {
                line_number: current_line,
                kind: "deleted".to_string(),
                old_content: Some(line[1..].to_string()),
                new_content: None,
            });
        }
    }

    Ok(diffs)
}
