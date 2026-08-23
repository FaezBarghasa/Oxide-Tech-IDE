
use nix::sched::{unshare, CloneFlags};
use nix::unistd::{setgid, setuid, Gid, Uid};
use tokio::process::Command;
use uuid::Uuid;
use bytes::{Bytes, BytesMut};
use std::path::{Path, PathBuf};
use std::ffi::OsStr;
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Clone)]
pub struct SandboxConfig {
    pub memory_limit_bytes: u64,
    pub cpu_max_hz: u64, // In percentage * 100, e.g., 10000 for 1 core
    pub cpu_max_period_us: u64, // e.g., 100000 for 100ms
    pub workspace_path: PathBuf,
}

#[derive(Debug)]
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: Bytes,
    pub stderr: Bytes,
}

pub struct CgroupGuard {
    cgroup_path: PathBuf,
}

impl Drop for CgroupGuard {
    fn drop(&mut self) {
        // Synchronously remove the cgroup directory on drop.
        // This is one of the few places a blocking call is acceptable in a Drop impl.
        let _ = std::fs::remove_dir(&self.cgroup_path);
    }
}

pub async fn create_cgroup(agent_id: &Uuid, config: &SandboxConfig) -> OxideResult<CgroupGuard> {
    let cgroup_path = PathBuf::from(format!("/sys/fs/cgroup/oxide-{}", agent_id));
    tokio::fs::create_dir_all(&cgroup_path).await?;

    // Set memory limit
    tokio::fs::write(
        cgroup_path.join("memory.max"),
        config.memory_limit_bytes.to_string(),
    ).await?;

    // Set CPU limit
    let cpu_max_string = format!("{} {}", config.cpu_max_hz, config.cpu_max_period_us);
    tokio::fs::write(
        cgroup_path.join("cpu.max"),
        cpu_max_string,
    ).await?;

    // Add current process to the cgroup
    let pid = nix::unistd::getpid();
    tokio::fs::write(
        cgroup_path.join("cgroup.procs"),
        pid.to_string(),
    ).await?;

    Ok(CgroupGuard { cgroup_path })
}


pub async fn execute_isolated<I, S>(cmd: I, envs: &[(String, String)]) -> OxideResult<ExecutionResult>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    // This function should be called within a context where namespaces are already set up.
    // The actual unshare() call should happen in the parent process that spawns this.
    // For simplicity in this example, we'll assume it's been handled.

    let mut command = Command::new(cmd.into_iter().next().ok_or_else(|| OxideError::SandboxError {
        message: "Command cannot be empty".to_string(),
    })?);

    command.args(cmd.into_iter().skip(1));
    command.envs(envs.iter().map(|(k, v)| (k, v)));

    // Redirect stdout and stderr
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command.spawn()?;

    let stdout_handle = child.stdout.take().unwrap();
    let stderr_handle = child.stderr.take().unwrap();

    let stdout_reader = async {
        let mut reader = tokio::io::BufReader::new(stdout_handle);
        let mut buffer = BytesMut::new();
        tokio::io::copy(&mut reader, &mut buffer).await.map(|_| buffer.freeze())
    };

    let stderr_reader = async {
        let mut reader = tokio::io::BufReader::new(stderr_handle);
        let mut buffer = BytesMut::new();
        tokio::io::copy(&mut reader, &mut buffer).await.map(|_| buffer.freeze())
    };

    let (status_res, stdout_res, stderr_res) = tokio::join!(
        child.wait(),
        stdout_reader,
        stderr_reader
    );

    let status = status_res?;
    let stdout = stdout_res?;
    let stderr = stderr_res?;

    Ok(ExecutionResult {
        exit_code: status.code().unwrap_or(-1),
        stdout,
        stderr,
    })
}


#[cfg(test)]
mod tests {
    use super::*;
    use nix::unistd::getuid;

    // This test needs to run as root to create cgroups.
    // It will be skipped if not run as root.
    #[tokio::test]
    #[ignore]
    async fn test_cgroup_and_execution() {
        if !getuid().is_root() {
            println!("Skipping cgroup test because not running as root.");
            return;
        }

        let agent_id = Uuid::new_v4();
        let config = SandboxConfig {
            memory_limit_bytes: 100 * 1024 * 1024, // 100 MB
            cpu_max_hz: 5000, // 50% of one core
            cpu_max_period_us: 100000,
            workspace_path: PathBuf::from("/tmp"),
        };

        // The guard will clean up the cgroup when it goes out of scope
        let _cgroup_guard = create_cgroup(&agent_id, &config).await.unwrap();

        // Now, we'd ideally fork and unshare namespaces before executing.
        // `nix::fork` is tricky in async context. A better approach is to have a separate
        // binary that sets up the environment. For this test, we'll just execute directly
        // within the created cgroup.

        let result = execute_isolated(&["echo", "test"], &[]).await.unwrap();

        assert_eq!(result.exit_code, 0);
        assert_eq!(result.stdout.as_ref(), b"test\n");
        assert!(result.stderr.is_empty());
    }

    #[tokio::test]
    async fn test_simple_execution() {
         let result = execute_isolated(&["echo", "simple test"], &[]).await.unwrap();
         assert_eq!(result.exit_code, 0);
         assert_eq!(result.stdout.as_ref(), b"simple test\n");
    }
}
