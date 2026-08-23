#[cfg(test)]
mod chaos_tests {
    use super::*;

    #[tokio::test]
    async fn test_sandbox_crash_recovery() {
        let agent_id = Uuid::new_v4();
        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // Execute a command that crashes
        let result = executor.execute(
            &["bash", "-c", "exit 137"],  // SIGKILL
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        // Should capture the exit code
        assert_eq!(result.exit_code, -9);  // Negative signal number

        // Should be able to execute another command
        let result2 = executor.execute(
            &["echo", "recovery"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        assert_eq!(result2.exit_code, 0);
    }

    #[tokio::test]
    async fn test_oom_recovery() {
        if !nix::unistd::Uid::effective().is_root() {
            println!("Skipping oom test: not running as root");
            return;
        }

        let agent_id = Uuid::new_v4();
        let cgroup_config = CgroupConfig {
            memory_limit_bytes: 10_000_000, // 10MB
            cpu_quota_us: 50_000,
            cpu_period_us: 100_000,
            pids_limit: 10,
        };

        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        cgroup_manager.apply_limits(&cgroup_config).unwrap();

        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // This command will allocate more than 10MB and get OOM killed
        let result = executor.execute(
            &["python", "-c", "'a' * 20 * 1024 * 1024"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        assert!(result.oom_killed);
    }
}