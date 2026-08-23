use std::process::Command;
use anyhow::{Result, bail};
use std::path::PathBuf;

pub struct WorktreeManager {
    pub base_repo_dir: PathBuf,
}

impl WorktreeManager {
    pub fn new(base_repo_dir: PathBuf) -> Self {
        Self { base_repo_dir }
    }

    pub fn create_task_worktree(&self, task_id: &str, branch_name: &str) -> Result<PathBuf> {
        let target_path = self.base_repo_dir.join(".worktrees").join(task_id);

        let output = Command::new("git")
            .current_dir(&self.base_repo_dir)
            .args(["worktree", "add", "-b", branch_name, target_path.to_str().unwrap_or_default(), "HEAD"])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            bail!("Git Worktree Add Failed: {}", stderr);
        }

        Ok(target_path)
    }

    pub async fn create_worktree(&self, branch_name: &str) -> Result<PathBuf> {
        self.create_task_worktree(branch_name, branch_name)
    }

    pub async fn commit_checkpoint(&self, message: &str) -> Result<()> {
        let output = Command::new("git")
            .current_dir(&self.base_repo_dir)
            .args(["commit", "-am", message])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            bail!("Git Commit Failed: {}", stderr);
        }
        Ok(())
    }

    pub async fn rollback(&self) -> Result<()> {
        let output = Command::new("git")
            .current_dir(&self.base_repo_dir)
            .args(["reset", "--hard", "HEAD~1"])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            bail!("Git Rollback Failed: {}", stderr);
        }
        Ok(())
    }
}
