#[cfg(test)]
mod security_tests {
    use super::*;

    #[tokio::test]
    async fn test_filesystem_escape_prevention() {
        if !nix::unistd::Uid::effective().is_root() {
            println!("Skipping security test: not running as root");
            return;
        }

        let agent_id = Uuid::new_v4();
        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // Attempt to read /etc/shadow
        let result = executor.execute(
            &["cat", "/etc/shadow"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        // Should fail with permission denied
        assert_ne!(result.exit_code, 0);
        assert!(result.stderr.contains("Permission denied") || result.exit_code != 0);
    }

    #[tokio::test]
    async fn test_network_isolation() {
        if !nix::unistd::Uid::effective().is_root() {
            println!("Skipping security test: not running as root");
            return;
        }

        let agent_id = Uuid::new_v4();
        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // Attempt to access external network
        let result = executor.execute(
            &["curl", "-s", "https://example.com"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        // Should fail (network disabled by default)
        assert_ne!(result.exit_code, 0);
    }

    #[tokio::test]
    async fn test_fork_bomb_prevention() {
        if !nix::unistd::Uid::effective().is_root() {
            println!("Skipping security test: not running as root");
            return;
        }

        let agent_id = Uuid::new_v4();
        let cgroup_config = CgroupConfig {
            memory_limit_bytes: 100_000_000,
            cpu_quota_us: 50_000,
            cpu_period_us: 100_000,
            pids_limit: 10,  // Limit to 10 processes
        };

        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        cgroup_manager.apply_limits(&cgroup_config).unwrap();

        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // Attempt fork bomb
        let result = executor.execute(
            &["bash", "-c", "while true; do bash & done"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        // Should be killed by cgroup limit
        assert_ne!(result.exit_code, 0);
    }
}