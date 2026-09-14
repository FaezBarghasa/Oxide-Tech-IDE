#[cfg(test)]
mod security_tests {
    use oxide_core::SandboxExecutor;

    #[tokio::test]
    async fn test_nonexistent_command_handling() {
        let result = SandboxExecutor::execute(&["non_existent_binary_xyz_123"], &[]).await;
        // Should return an error or non-zero exit code
        assert!(result.is_err() || result.unwrap().exit_code != 0);
    }

    #[tokio::test]
    async fn test_command_isolation_output() {
        let result = SandboxExecutor::execute(&["echo", "security_check_passed"], &[])
            .await
            .unwrap();

        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("security_check_passed"));
    }
}
