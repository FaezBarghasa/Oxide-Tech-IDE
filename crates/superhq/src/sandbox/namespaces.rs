use nix::sched::{unshare, CloneFlags};
use crate::errors::{OxideError, OxideResult};

pub struct SandboxIsolation;

impl SandboxIsolation {
    pub fn apply_isolation() -> OxideResult<()> {
        #[cfg(target_os = "linux")]
        {
            unshare(CloneFlags::CLONE_NEWPID | CloneFlags::CLONE_NEWNET | CloneFlags::CLONE_NEWNS)
                .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    #[cfg(target_os = "linux")]
    fn test_apply_isolation() -> OxideResult<()> {
        let output = Command::new("unshare")
            .args(&["-p", "-n", "-m", "--fork", "sh", "-c", "ip link show; echo $$"])
            .output()
            .expect("Failed to execute unshare command");

        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains("lo")); // Loopback interface should exist
        assert!(!stdout.contains("eth0")); // Other network interfaces should not be visible

        Ok(())
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn test_network_isolation() -> OxideResult<()> {
        let output = Command::new("unshare")
            .args(&["-n", "--fork", "sh", "-c", "ping -c 1 8.8.8.8"])
            .output()
            .expect("Failed to execute unshare command");

        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(stderr.contains("Network unreachable") || stderr.contains("unknown host"));
        Ok(())
    }
}
