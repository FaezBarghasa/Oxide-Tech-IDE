use std::path::{Path, PathBuf};
use std::collections::HashMap;
use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum SandboxError {
    #[error("Virtual machine failed: {0}")]
    VMFailure(String),
    #[error("I/O operational failure: {0}")]
    IOError(#[from] std::io::Error),
    #[error("The operation timed out")]
    Timeout,
    #[error("Database error: {0}")]
    DatabaseError(String),
}

#[async_trait]
pub trait AEOSSandbox: Send + Sync {
    async fn start_session(&self, session_id: &str) -> Result<(), SandboxError>;
    async fn mount_worktree(&self, session_id: &str, path: &Path) -> Result<(), SandboxError>;
    async fn execute_pty_command(&self, session_id: &str, cmd: &str, envs: HashMap<String, String>) -> Result<std::process::ExitStatus, SandboxError>;
    async fn commit_filesystem_checkpoint(&self, session_id: &str) -> Result<String, SandboxError>;
    async fn terminate_session(&self, session_id: &str) -> Result<(), SandboxError>;
}
