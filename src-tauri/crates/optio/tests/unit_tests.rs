#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_eor_convergence() {
        // Mock harness that succeeds on 3rd iteration
        struct MockHarness {
            iteration: std::sync::atomic::AtomicU32,
        }

        #[async_trait]
        impl Harness for MockHarness {
            async fn execute_in_sandbox(&self, _: &PathBuf, _: &[&str]) -> OxideResult<ObservationResult> {
                let iter = self.iteration.fetch_add(1, std::sync::atomic::Ordering::SeqCst);

                if iter < 2 {
                    Ok(ObservationResult {
                        exit_code: 1,
                        stdout: String::new(),
                        stderr: "error[E0308]: mismatched types".to_string(),
                        parsed_errors: vec![CompilerError {
                            code: "E0308".to_string(),
                            message: "mismatched types".to_string(),
                            file: "src/main.rs".to_string(),
                            line: 10,
                            column: 5,
                        }],
                        oom_killed: false,
                    })
                } else {
                    Ok(ObservationResult {
                        exit_code: 0,
                        stdout: "Compilation successful".to_string(),
                        stderr: String::new(),
                        parsed_errors: vec![],
                        oom_killed: false,
                    })
                }
            }

            async fn write_file(&self, _: &PathBuf, _: &str, _: &str) -> OxideResult<()> {
                Ok(())
            }

            async fn read_file(&self, _: &PathBuf, _: &str) -> OxideResult<String> {
                Ok(String::new())
            }
        }

        // Mock agent that generates different code each iteration
        struct MockAgent;

        #[async_trait]
        impl Agent for MockAgent {
            async fn generate_code(&self, _: &TaskContext) -> OxideResult<Vec<(String, String)>> {
                Ok(vec![("src/main.rs".to_string(), "fn main() {}".to_string())])
            }

            async fn reflect_on_errors(&self, _: &TaskContext, _: &str) -> OxideResult<Vec<(String, String)>> {
                Ok(vec![("src/main.rs".to_string(), "fn main() { println!(\"fixed\"); }".to_string())])
            }
        }

        let harness = MockHarness {
            iteration: std::sync::atomic::AtomicU32::new(0),
        };
        let agent = MockAgent;

        let task_context = TaskContext {
            task_id: Uuid::new_v4(),
            description: "Test task".to_string(),
            worktree_path: PathBuf::from("/tmp/test"),
            initial_prompt: "Fix the code".to_string(),
            ast_context: String::new(),
            episodic_memory: vec![],
        };

        let mut eor = EorMachine::new(task_context, 10);
        let result = eor.run_loop(&harness, &agent).await.unwrap();

        assert_eq!(result, EorPhase::Converged);
        assert_eq!(eor.iteration, 2);
    }

    #[tokio::test]
    async fn test_oscillation_detection() {
        let mut detector = OscillationDetector::new(10);

        detector.add_code("fn main() { let x = 1; }");
        assert!(!detector.detect_oscillation());

        detector.add_code("fn main() { let x = 2; }");
        assert!(!detector.detect_oscillation());

        // Back to the first code
        detector.add_code("fn main() { let x = 1; }");
        assert!(detector.detect_oscillation());
    }
}