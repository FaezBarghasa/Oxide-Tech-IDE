#[cfg(test)]
mod chaos_tests {
    use oxide_core::SandboxExecutor;

    #[tokio::test]
    async fn test_sandbox_crash_recovery() {
        // Execute a command that exits with non-zero code
        let result = SandboxExecutor::execute(&["bash", "-c", "exit 1"], &[])
            .await
            .unwrap();

        assert_eq!(result.exit_code, 1);

        // Should be able to execute another command
        let result2 = SandboxExecutor::execute(&["echo", "recovery"], &[])
            .await
            .unwrap();

        assert_eq!(result2.exit_code, 0);
        assert!(result2.stdout.contains("recovery"));
    }

    #[tokio::test]
    async fn test_sandbox_env_isolation() {
        let envs = vec![("OXIDE_CHAOS_TEST".to_string(), "active_signal".to_string())];
        let result = SandboxExecutor::execute(&["bash", "-c", "echo $OXIDE_CHAOS_TEST"], &envs)
            .await
            .unwrap();

        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("active_signal"));
    }
}
