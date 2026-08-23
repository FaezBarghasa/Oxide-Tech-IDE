#[cfg(test)]
mod integration_tests {
    use core::{SwarmDag, TaskNode, AgentType, WaveScheduler, SandboxExecutor, SandboxCleanup};
    use uuid::Uuid;
    use std::path::PathBuf;

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
        let result = SandboxExecutor::execute(
            &["echo", "hello"],
            &[],
        ).await.unwrap();

        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("hello"));

        let agent_id = Uuid::new_v4();
        let cleanup = SandboxCleanup::new(
            agent_id,
            PathBuf::from(format!("/tmp/cgroup-{}", agent_id)),
            PathBuf::from(format!("/tmp/overlay-{}", agent_id)),
            PathBuf::from(format!("/tmp/worktree-{}", agent_id)),
        );
        let _ = cleanup.cleanup_all().await;
    }
}