use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;

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
