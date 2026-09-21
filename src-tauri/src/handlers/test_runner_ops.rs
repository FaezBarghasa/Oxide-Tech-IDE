use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceTestItem {
    pub id: String,
    pub name: String,
    pub package: String,
    pub module_path: String,
    pub status: String, // "idle" | "running" | "passed" | "failed"
    pub duration_ms: Option<u64>,
    pub output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRunResult {
    pub test_id: String,
    pub passed: bool,
    pub duration_ms: u64,
    pub stdout: String,
    pub stderr: String,
    pub failure_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverageFileReport {
    pub file_path: String,
    pub covered_percent: f64,
    pub covered_lines: u32,
    pub total_lines: u32,
    pub covered_line_numbers: Vec<u32>,
    pub uncovered_line_numbers: Vec<u32>,
}

#[tauri::command]
pub async fn discover_workspace_tests(
    workspace_path: String,
) -> Result<Vec<WorkspaceTestItem>, String> {
    let path = Path::new(&workspace_path);
    let output = Command::new("cargo")
        .args(["test", "--", "--list", "--format=terse"])
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!("Failed to list cargo tests: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut tests = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(test_name) = trimmed.strip_suffix(": test") {
            let parts: Vec<&str> = test_name.split("::").collect();
            let module = if parts.len() > 1 {
                parts[..parts.len() - 1].join("::")
            } else {
                "root".to_string()
            };
            let short_name = parts.last().unwrap_or(&test_name).to_string();

            tests.push(WorkspaceTestItem {
                id: test_name.to_string(),
                name: short_name,
                package: "workspace".to_string(),
                module_path: module,
                status: "idle".to_string(),
                duration_ms: None,
                output: None,
            });
        }
    }

    Ok(tests)
}

#[tauri::command]
pub async fn run_single_test(
    workspace_path: String,
    test_id: String,
) -> Result<TestRunResult, String> {
    let path = Path::new(&workspace_path);
    let start_time = std::time::Instant::now();

    let output = Command::new("cargo")
        .args(["test", &test_id, "--", "--exact", "--nocapture"])
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute test '{}': {}", test_id, e))?;

    let duration_ms = start_time.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let passed = output.status.success();

    let failure_message = if !passed {
        let panic_line = stdout
            .lines()
            .chain(stderr.lines())
            .find(|l| {
                l.contains("panicked at") || l.contains("assertion failed") || l.contains("FAILED")
            })
            .map(|l| l.trim().to_string());
        panic_line.or_else(|| Some("Test failed with non-zero exit code".to_string()))
    } else {
        None
    };

    Ok(TestRunResult {
        test_id,
        passed,
        duration_ms,
        stdout,
        stderr,
        failure_message,
    })
}

/// Streaming test runner: runs all cargo tests with `--message-format=json`
/// and emits `test:event` Tauri events in real-time.
/// Each event payload: `{ test_id: string, event: "started"|"passed"|"failed", duration_ms?: number, message?: string }`
#[tauri::command]
pub async fn run_all_tests_streaming(
    app: AppHandle,
    workspace_path: String,
) -> Result<u32, String> {
    let path = Path::new(&workspace_path);

    let mut child = Command::new("cargo")
        .args(["test", "--message-format=json", "--", "--nocapture"])
        .current_dir(path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn cargo test: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture test stdout".to_string())?;

    let mut reader = BufReader::new(stdout).lines();
    let mut total_tests = 0u32;

    while let Ok(Some(line)) = reader.next_line().await {
        if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) {
            let reason = msg.get("reason").and_then(|v| v.as_str()).unwrap_or("");

            match reason {
                "test-started" => {
                    let test_name = msg
                        .get("test")
                        .and_then(|t| t.get("name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let _ = app.emit("test:event", serde_json::json!({
                        "test_id": test_name,
                        "event": "started"
                    }));
                }
                "test-ok" => {
                    let test_name = msg
                        .get("test")
                        .and_then(|t| t.get("name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let exec_time = msg.get("exec_time").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    total_tests += 1;
                    let _ = app.emit("test:event", serde_json::json!({
                        "test_id": test_name,
                        "event": "passed",
                        "duration_ms": (exec_time * 1000.0) as u64
                    }));
                }
                "test-failed" => {
                    let test_name = msg
                        .get("test")
                        .and_then(|t| t.get("name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let exec_time = msg.get("exec_time").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let stdout_text = msg.get("stdout").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    total_tests += 1;
                    let _ = app.emit("test:event", serde_json::json!({
                        "test_id": test_name,
                        "event": "failed",
                        "duration_ms": (exec_time * 1000.0) as u64,
                        "message": stdout_text
                    }));
                }
                _ => {}
            }
        }
    }

    let _ = child.wait().await;
    Ok(total_tests)
}

/// Invokes `cargo llvm-cov --json` and returns per-file coverage reports.
/// Frontend uses this to render green/red gutter line bars in Monaco.
#[tauri::command]
pub async fn llvm_cov_report(
    workspace_path: String,
) -> Result<Vec<CoverageFileReport>, String> {
    let path = Path::new(&workspace_path);

    let output = Command::new("cargo")
        .args(["llvm-cov", "--json", "--ignore-filename-regex=target/"])
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!(
            "Failed to run cargo llvm-cov: {}. Install with: cargo install cargo-llvm-cov",
            e
        ))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("cargo llvm-cov failed: {}", stderr));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let coverage: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse coverage JSON: {}", e))?;

    let mut reports = Vec::new();

    if let Some(data_array) = coverage.get("data").and_then(|d| d.as_array()) {
        for data in data_array {
            if let Some(files) = data.get("files").and_then(|f| f.as_array()) {
                for file in files {
                    let filename = file
                        .get("filename")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();

                    if filename.is_empty() {
                        continue;
                    }

                    let mut covered_lines = 0u32;
                    let mut total_lines = 0u32;
                    let mut covered_line_numbers = Vec::new();
                    let mut uncovered_line_numbers = Vec::new();

                    if let Some(segments) = file.get("segments").and_then(|s| s.as_array()) {
                        let mut seen_lines = std::collections::HashSet::new();
                        for seg in segments {
                            if let (Some(line), Some(count), Some(has_count)) = (
                                seg.get(0).and_then(|v| v.as_u64()),
                                seg.get(2).and_then(|v| v.as_u64()),
                                seg.get(3).and_then(|v| v.as_bool()),
                            ) {
                                if has_count && seen_lines.insert(line as u32) {
                                    total_lines += 1;
                                    if count > 0 {
                                        covered_lines += 1;
                                        covered_line_numbers.push(line as u32);
                                    } else {
                                        uncovered_line_numbers.push(line as u32);
                                    }
                                }
                            }
                        }
                    }

                    let covered_percent = if total_lines > 0 {
                        (covered_lines as f64 / total_lines as f64) * 100.0
                    } else {
                        0.0
                    };

                    reports.push(CoverageFileReport {
                        file_path: filename,
                        covered_percent,
                        covered_lines,
                        total_lines,
                        covered_line_numbers,
                        uncovered_line_numbers,
                    });
                }
            }
        }
    }

    Ok(reports)
}
