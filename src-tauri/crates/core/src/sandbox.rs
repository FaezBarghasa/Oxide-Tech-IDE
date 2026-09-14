use nix::unistd::{fork, ForkResult, execvp, pipe};
use nix::sys::wait::{waitpid, WaitStatus};
use nix::sys::signal::{kill, Signal};
use nix::unistd::Pid;
use std::ffi::CString;
use std::os::fd::AsRawFd;
use std::path::PathBuf;
use tokio::io::{AsyncReadExt, BufReader};
use uuid::Uuid;
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub struct SandboxExecutor;

impl SandboxExecutor {
    pub async fn execute(
        command: &[&str],
        env_vars: &[(String, String)],
    ) -> OxideResult<ExecutionResult> {
        let (stdout_read, stdout_write) = pipe().map_err(|e| OxideError::IoError(std::io::Error::other(e.to_string())))?;
        let (stderr_read, stderr_write) = pipe().map_err(|e| OxideError::IoError(std::io::Error::other(e.to_string())))?;

        match unsafe { fork() } {
            Ok(ForkResult::Parent { child }) => {
                drop(std::fs::File::from(stdout_write));
                drop(std::fs::File::from(stderr_write));

                let mut stdout_reader = BufReader::new(tokio::fs::File::from_std(std::fs::File::from(stdout_read)));
                let mut stderr_reader = BufReader::new(tokio::fs::File::from_std(std::fs::File::from(stderr_read)));

                let mut stdout_buf = String::new();
                let mut stderr_buf = String::new();

                let stdout_handle = tokio::spawn(async move {
                    stdout_reader.read_to_string(&mut stdout_buf).await.map(|_| stdout_buf)
                });
                let stderr_handle = tokio::spawn(async move {
                    stderr_reader.read_to_string(&mut stderr_buf).await.map(|_| stderr_buf)
                });

                let stdout = stdout_handle.await.map_err(|e| OxideError::ExecutionError { code: -1, stderr: e.to_string() })??;
                let stderr = stderr_handle.await.map_err(|e| OxideError::ExecutionError { code: -1, stderr: e.to_string() })??;

                let status = waitpid(child, None).map_err(|e| OxideError::ExecutionError {
                    code: -1,
                    stderr: format!("Waitpid failed: {}", e),
                })?;

                let exit_code = match status {
                    WaitStatus::Exited(_, code) => code,
                    WaitStatus::Signaled(_, sig, _) => 128 + sig as i32,
                    _ => -1,
                };

                Ok(ExecutionResult {
                    exit_code,
                    stdout,
                    stderr,
                })
            },
            Ok(ForkResult::Child) => {
                unsafe {
                    libc::dup2(stdout_write.as_raw_fd(), 1);
                    libc::dup2(stderr_write.as_raw_fd(), 2);
                }
                drop(stdout_read);
                drop(stderr_read);
                drop(stdout_write);
                drop(stderr_write);

                for (key, value) in env_vars {
                    unsafe { std::env::set_var(key, value); }
                }

                let args: Vec<CString> = command.iter().map(|s| CString::new(*s).unwrap()).collect();
                let _ = execvp(&args[0], &args);

                std::process::exit(127);
            }
            Err(e) => Err(OxideError::ExecutionError {
                code: -1,
                stderr: format!("Fork failed: {}", e),
            })
        }
    }
}

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
        tracing::info!("Starting sandbox cleanup for agent {}", self.agent_id);
        self.kill_cgroup_processes().await?;
        self.remove_cgroup().await?;
        self.remove_overlay_dirs().await?;
        self.remove_worktree().await?;
        tracing::info!("Cleanup finished for agent {}", self.agent_id);
        Ok(())
    }

    async fn kill_cgroup_processes(&self) -> OxideResult<()> {
        let procs_file = self.cgroup_path.join("cgroup.procs");
        if !procs_file.exists() {
            return Ok(());
        }
        let content = tokio::fs::read_to_string(&procs_file).await.map_err(OxideError::IoError)?;
        for line in content.lines() {
            if let Ok(pid) = line.parse::<i32>() {
                let _ = kill(Pid::from_raw(pid), Signal::SIGKILL);
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        Ok(())
    }

    async fn remove_cgroup(&self) -> OxideResult<()> {
        if self.cgroup_path.exists() {
            tokio::fs::remove_dir_all(&self.cgroup_path).await.map_err(OxideError::IoError)?;
        }
        Ok(())
    }

    async fn remove_overlay_dirs(&self) -> OxideResult<()> {
        if self.overlay_path.exists() {
            tokio::fs::remove_dir_all(&self.overlay_path).await.map_err(OxideError::IoError)?;
        }
        Ok(())
    }

    async fn remove_worktree(&self) -> OxideResult<()> {
        let output = tokio::process::Command::new("git")
            .args(["worktree", "remove", "--force", &self.worktree_path.to_string_lossy()])
            .output()
            .await
            .map_err(OxideError::IoError)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("Worktree removal notice: {}", stderr);
        }
        Ok(())
    }
}
