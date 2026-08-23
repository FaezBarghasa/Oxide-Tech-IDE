#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_full_swarm_execution() {
        // Create a simple DAG
        let mut dag = SwarmDag::new();

        let task_a = TaskNode::new("Task A".to_string(), AgentType::Backend, vec![]);
        let task_b = TaskNode::new("Task B".to_string(), AgentType::Backend, vec![task_a.id]);
        let task_c = TaskNode::new("Task C".to_string(), AgentType::Backend, vec![task_a.id]);
        let task_d = TaskNode::new("Task D".to_string(), AgentType::Backend, vec![task_b.id, task_c.id]);

        dag.add_task(task_a.clone());
        dag.add_task(task_b.clone());
        dag.add_task(task_c.clone());
        dag.add_task(task_d.clone());

        dag.add_dependency(task_a.id, task_b.id).unwrap();
        dag.add_dependency(task_a.id, task_c.id).unwrap();
        dag.add_dependency(task_b.id, task_d.id).unwrap();
        dag.add_dependency(task_c.id, task_d.id).unwrap();

        // Verify topological sort
        let sorted = dag.validate_and_sort().unwrap();
        assert_eq!(sorted.len(), 4);

        // Verify wave scheduling
        let scheduler = WaveScheduler::new(&dag).unwrap();
        assert_eq!(scheduler.get_total_waves(), 3);
        assert_eq!(scheduler.get_max_parallelism(), 2);

        // Verify ready tasks
        let ready = dag.get_ready_tasks();
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0], task_a.id);
    }

    #[tokio::test]
    async fn test_sandbox_isolation() {
        // This test requires root privileges
        if !nix::unistd::Uid::effective().is_root() {
            println!("Skipping sandbox test: not running as root");
            return;
        }

        let agent_id = Uuid::new_v4();
        let cgroup_config = CgroupConfig {
            memory_limit_bytes: 100_000_000,  // 100MB
            cpu_quota_us: 50_000,
            cpu_period_us: 100_000,
            pids_limit: 10,
        };

        let cgroup_manager = CgroupManager::new(agent_id).unwrap();
        cgroup_manager.apply_limits(&cgroup_config).unwrap();

        let executor = SandboxExecutor::new(agent_id, cgroup_manager);

        // Execute a simple command
        let result = executor.execute(
            &["echo", "hello"],
            &[],
            &PathBuf::from("/tmp"),
        ).await.unwrap();

        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("hello"));

        // Cleanup
        let cleanup = SandboxCleanup::new(
            agent_id,
            PathBuf::from(format!("/sys/fs/cgroup/oxide-agent-{}", agent_id)),
            PathBuf::from("/tmp/overlay"),
            PathBuf::from("/tmp/worktree"),
        );
        cleanup.cleanup_all().await.unwrap();
    }
}