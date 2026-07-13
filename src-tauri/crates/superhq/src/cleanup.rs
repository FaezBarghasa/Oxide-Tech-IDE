use nix::sys::signal::{kill, Signal};
use nix::unistd::Pid;
use std::path::PathBuf;
use uuid::Uuid;

pub struct SandboxCleanup {
    pub agent_id: Uuid,
    pub cgroup_path: PathBuf,
    pub overlay_path: PathBuf,
    pub worktree_path: PathBuf,
}

impl SandboxCleanup {
    pub fn new(
        agent_id: Uuid,
        cgroup_path: PathBuf,
        overlay_path: PathBuf,
        worktree_path: PathBuf,
    ) -> Self {
        Self {
            agent_id,
            cgroup_path,
            overlay_path,
            worktree_path,
        }
    }

    pub async fn cleanup_all(&self) -> OxideResult<()> {
        tracing::info!("Starting cleanup for agent {}", self.agent_id);

        // Step 1: Kill all processes in the cgroup
        self.kill_cgroup_processes().await?;

        // Step 2: Unmount overlay filesystem
        self.unmount_overlay().await?;

        // Step 3: Remove cgroup directory
        self.remove_cgroup().await?;

        // Step 4: Remove overlay directories
        self.remove_overlay_dirs().await?;

        // Step 5: Remove Git worktree (via git command)
        self.remove_worktree().await?;

        tracing::info!("Cleanup completed for agent {}", self.agent_id);
        Ok(())
    }

    async fn kill_cgroup_processes(&self) -> OxideResult<()> {
        let procs_file = self.cgroup_path.join("cgroup.procs");

        if !procs_file.exists() {
            return Ok(());
        }

        let content = tokio::fs::read_to_string(&procs_file)
            .await
            .map_err(OxideError::IoError)?;

        for line in content.lines() {
            if let Ok(pid) = line.parse::<i32>() {
                // Send SIGKILL to each process
                let _ = kill(Pid::from_raw(pid), Signal::SIGKILL);
            }
        }

        // Wait a bit for processes to die
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        Ok(())
    }

    async fn unmount_overlay(&self) -> OxideResult<()> {
        let merged_path = self.overlay_path.join("merged");

        if merged_path.exists() {
            // Use umount2 with MNT_FORCE and MNT_DETACH
            let result = tokio::task::spawn_blocking(move || {
                nix::mount::umount2(&merged_path, nix::mount::MntFlags::MNT_FORCE | nix::mount::MntFlags::MNT_DETACH)
            })
            .await
            .map_err(|e| OxideError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

            if let Err(e) = result {
                tracing::warn!("Failed to unmount overlay: {}", e);
                // Continue cleanup even if unmount fails
            }
        }

        Ok(())
    }

    async fn remove_cgroup(&self) -> OxideResult<()> {
        if self.cgroup_path.exists() {
            tokio::fs::remove_dir_all(&self.cgroup_path)
                .await
                .map_err(OxideError::IoError)?;
        }
        Ok(())
    }

    async fn remove_overlay_dirs(&self) -> OxideResult<()> {
        if self.overlay_path.exists() {
            tokio::fs::remove_dir_all(&self.overlay_path)
                .await
                .map_err(OxideError::IoError)?;
        }
        Ok(())
    }

    async fn remove_worktree(&self) -> OxideResult<()> {
        // Use git worktree remove command
        let output = tokio::process::Command::new("git")
            .args(&["worktree", "remove", "--force", &self.worktree_path.to_string_lossy()])
            .output()
            .await
            .map_err(OxideError::IoError)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("Failed to remove worktree: {}", stderr);
            // Continue cleanup even if worktree removal fails
        }

        Ok(())
    }
}

impl Drop for SandboxCleanup {
    fn drop(&mut self) {
        // Synchronous cleanup as a last resort
        // This should rarely be hit if cleanup_all() is called explicitly
        tracing::warn!("SandboxCleanup dropped without explicit cleanup for agent {}", self.agent_id);
    }
}