use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::process::Command;
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VerifierType {
    Format,
    Check,
    Lint,
    Test,
    Nextest,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HarnessEvidence {
    pub verifier: VerifierType,
    pub command: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub passed: bool,
}

pub struct HarnessEngine {
    workspace_path: PathBuf,
}

impl HarnessEngine {
    pub fn new(workspace_path: PathBuf) -> Self {
        Self { workspace_path }
    }

    pub async fn run_verifier(&self, verifier: VerifierType) -> OxideResult<HarnessEvidence> {
        let (cmd, args) = match verifier {
            VerifierType::Format => ("cargo", vec!["fmt", "--check"]),
            VerifierType::Check => ("cargo", vec!["check", "--locked"]),
            VerifierType::Lint => ("cargo", vec!["clippy", "--", "-D", "warnings"]),
            VerifierType::Test => ("cargo", vec!["test"]),
            VerifierType::Nextest => ("cargo", vec!["nextest", "run"]),
            VerifierType::Custom => ("cargo", vec!["check"]),
        };

        let start = std::time::Instant::now();
        let command_str = format!("{} {}", cmd, args.join(" "));

        let output = Command::new(cmd)
            .args(&args)
            .current_dir(&self.workspace_path)
            .output()
            .await
            .map_err(OxideError::IoError)?;

        let duration_ms = start.elapsed().as_millis() as u64;
        let exit_code = output.status.code().unwrap_or(-1);
        let passed = output.status.success();

        Ok(HarnessEvidence {
            verifier,
            command: command_str,
            exit_code,
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            duration_ms,
            passed,
        })
    }
}
