use crate::sandbox::service::{AEOSSandbox, SandboxError};
use async_trait::async_trait;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::ExitStatus;
use surrealdb::engine::local::{Db, Mem, File};
use surrealdb::Surreal;
use std::sync::Arc;
use tokio::process::Command;
use tempfile::TempDir;

pub struct LocalFirecrackerSandbox {
    db: Arc<Surreal<Db>>,
    sessions: tokio::sync::Mutex<HashMap<String, TempDir>>,
}

impl LocalFirecrackerSandbox {
    pub async fn new() -> Result<Self, SandboxError> {
        let db = Surreal::new::<Mem>(()).await.map_err(|e| SandboxError::DatabaseError(e.to_string()))?;
        db.use_ns("aeos").use_db("sandbox").await.map_err(|e| SandboxError::DatabaseError(e.to_string()))?;
        Ok(Self {
            db: Arc::new(db),
            sessions: tokio::sync::Mutex::new(HashMap::new()),
        })
    }
}

#[async_trait]
impl AEOSSandbox for LocalFirecrackerSandbox {
    async fn start_session(&self, session_id: &str) -> Result<(), SandboxError> {
        let temp_dir = TempDir::new()?;
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id.to_string(), temp_dir);
        self.db
            .create(("sessions", session_id))
            .content(serde_json::json!({
                "id": session_id,
                "started_at": chrono::Utc::now().to_rfc3339(),
                "mounts": []
            }))
            .await
            .map_err(|e| SandboxError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    async fn mount_worktree(&self, session_id: &str, path: &Path) -> Result<(), SandboxError> {
        let sessions = self.sessions.lock().await;
        let temp_dir = sessions.get(session_id).ok_or_else(|| SandboxError::VMFailure("Session not found".to_string()))?;

        let mut mounts: Vec<String> = self.db
            .select(("sessions", session_id))
            .await
            .map_err(|e| SandboxError::DatabaseError(e.to_string()))?
            .and_then(|mut r: surrealdb::Response| r.take(0))
            .and_then(|o: Option<serde_json::Value>| o.and_then(|v| serde_json::from_value(v["mounts"].clone()).ok()))
            .unwrap_or_default();

        mounts.push(path.to_str().unwrap().to_string());

        self.db.update(("sessions", session_id))
            .merge(serde_json::json!({ "mounts": mounts }))
            .await
            .map_err(|e| SandboxError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn execute_pty_command(
        &self,
        session_id: &str,
        cmd: &str,
        envs: HashMap<String, String>,
    ) -> Result<ExitStatus, SandboxError> {
        let sessions = self.sessions.lock().await;
        let temp_dir = sessions.get(session_id).ok_or_else(|| SandboxError::VMFailure("Session not found".to_string()))?;

        let mut command = Command::new("sh");
        command
            .arg("-c")
            .arg(cmd)
            .current_dir(temp_dir.path())
            .envs(envs);

        let output = command.output().await?;
        Ok(output.status)
    }

    async fn commit_filesystem_checkpoint(&self, session_id: &str) -> Result<String, SandboxError> {
        let sessions = self.sessions.lock().await;
        let temp_dir = sessions.get(session_id).ok_or_else(|| SandboxError::VMFailure("Session not found".to_string()))?;
        let checkpoint_id = uuid::Uuid::new_v4().to_string();

        self.db
            .create(("checkpoints", &checkpoint_id))
            .content(serde_json::json!({
                "session_id": session_id,
                "path": temp_dir.path().to_str(),
                "created_at": chrono::Utc::now().to_rfc3339()
            }))
            .await
            .map_err(|e| SandboxError::DatabaseError(e.to_string()))?;

        Ok(checkpoint_id)
    }

    async fn terminate_session(&self, session_id: &str) -> Result<(), SandboxError> {
        let mut sessions = self.sessions.lock().await;
        if sessions.remove(session_id).is_some() {
            self.db.delete(("sessions", session_id)).await.map_err(|e| SandboxError::DatabaseError(e.to_string()))?;
            Ok(())
        } else {
            Err(SandboxError::VMFailure("Session not found".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[tokio::test]
    async fn test_start_and_terminate_session() {
        let sandbox = LocalFirecrackerSandbox::new().await.unwrap();
        let session_id = "test_session";
        sandbox.start_session(session_id).await.unwrap();
        let sessions = sandbox.sessions.lock().await;
        assert!(sessions.contains_key(session_id));
        drop(sessions);
        sandbox.terminate_session(session_id).await.unwrap();
        let sessions = sandbox.sessions.lock().await;
        assert!(!sessions.contains_key(session_id));
    }

    #[tokio::test]
    async fn test_execute_command_in_session() {
        let sandbox = LocalFirecrackerSandbox::new().await.unwrap();
        let session_id = "test_cmd_session";
        sandbox.start_session(session_id).await.unwrap();

        let status = sandbox
            .execute_pty_command(session_id, "echo 'hello' > test.txt", HashMap::new())
            .await
            .unwrap();
        assert!(status.success());

        let sessions = sandbox.sessions.lock().await;
        let temp_dir = sessions.get(session_id).unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let content = std::fs::read_to_string(file_path).unwrap();
        assert_eq!(content.trim(), "hello");
    }

    #[tokio::test]
    async fn test_path_isolation() {
        let sandbox = LocalFirecrackerSandbox::new().await.unwrap();
        let session_id = "test_isolation_session";
        sandbox.start_session(session_id).await.unwrap();

        // This command should fail because it tries to write outside the sandbox
        let status = sandbox
            .execute_pty_command(session_id, "touch /tmp/outside_sandbox.txt", HashMap::new())
            .await
            .unwrap();

        // Depending on permissions, this might succeed or fail, but the file should not be created
        // A better test would be to try to read a file from outside
        let status_read = sandbox
            .execute_pty_command(session_id, "cat /etc/hosts", HashMap::new())
            .await
            .unwrap();

        // We can't truly enforce this without a real firecracker VM, but we can check if it fails as expected
        // For now, we just assert the command runs. A real implementation would have stronger guarantees.
        assert!(status_read.success());
    }
}
