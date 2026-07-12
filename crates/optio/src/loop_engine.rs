use async_trait::async_trait;
use uuid::Uuid;
use ahash::AHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EorPhase {
    Idle,
    Executing,
    Observing,
    Reflecting,
    Converged,
    Escalated,
}

#[derive(Debug, Clone)]
pub struct TaskContext {
    pub task_id: Uuid,
    pub description: String,
    pub worktree_path: PathBuf,
    pub initial_prompt: String,
    pub ast_context: String,
    pub episodic_memory: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ObservationResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub parsed_errors: Vec<CompilerError>,
    pub oom_killed: bool,
}

#[derive(Debug, Clone)]
pub struct CompilerError {
    pub code: String,
    pub message: String,
    pub file: String,
    pub line: u32,
    pub column: u32,
}

#[async_trait]
pub trait Harness: Send + Sync {
    async fn execute_in_sandbox(&self, worktree: &PathBuf, command: &[&str]) -> OxideResult<ObservationResult>;
    async fn write_file(&self, worktree: &PathBuf, path: &str, content: &str) -> OxideResult<()>;
    async fn read_file(&self, worktree: &PathBuf, path: &str) -> OxideResult<String>;
}

#[async_trait]
pub trait Agent: Send + Sync {
    async fn generate_code(&self, context: &TaskContext) -> OxideResult<Vec<(String, String)>>;
    async fn reflect_on_errors(&self, context: &TaskContext, errors: &str) -> OxideResult<Vec<(String, String)>>;
}

pub struct EorMachine {
    pub phase: EorPhase,
    pub iteration: u32,
    pub max_iterations: u32,
    pub ast_hashes: Vec<u64>,
    pub task_context: TaskContext,
}

impl EorMachine {
    pub fn new(task_context: TaskContext, max_iterations: u32) -> Self {
        Self {
            phase: EorPhase::Idle,
            iteration: 0,
            max_iterations,
            ast_hashes: Vec::new(),
            task_context,
        }
    }

    pub async fn run_loop(
        &mut self,
        harness: &dyn Harness,
        agent: &dyn Agent,
    ) -> OxideResult<EorPhase> {
        self.phase = EorPhase::Executing;

        loop {
            match self.phase {
                EorPhase::Executing => {
                    tracing::info!("EOR Iteration {} - Executing", self.iteration);

                    // Generate code
                    let files = if self.iteration == 0 {
                        agent.generate_code(&self.task_context).await?
                    } else {
                        // In subsequent iterations, we'll use reflect_on_errors
                        // This branch is handled in Reflecting phase
                        unreachable!("Executing should only be called on first iteration or after reflection")
                    };

                    // Write files to worktree
                    for (path, content) in &files {
                        harness.write_file(&self.task_context.worktree_path, path, content).await?;
                    }

                    // Hash the AST for oscillation detection
                    let combined_code: String = files.iter().map(|(_, c)| c.as_str()).collect();
                    let hash = Self::hash_code(&combined_code);
                    self.ast_hashes.push(hash);

                    // Execute build/test command
                    let observation = harness.execute_in_sandbox(
                        &self.task_context.worktree_path,
                        &["cargo", "build", "--release"],
                    ).await?;

                    self.phase = EorPhase::Observing;

                    // Store observation for next phase
                    // In a real implementation, you'd pass this through the state
                    // For simplicity, we'll handle it inline
                    return self.observe_and_reflect(harness, agent, observation).await;
                }
                _ => break,
            }
        }

        Ok(self.phase)
    }

    async fn observe_and_reflect(
        &mut self,
        harness: &dyn Harness,
        agent: &dyn Agent,
        observation: ObservationResult,
    ) -> OxideResult<EorPhase> {
        self.phase = EorPhase::Observing;
        tracing::info!("EOR Iteration {} - Observing", self.iteration);

        // Check convergence
        if observation.exit_code == 0 && !observation.oom_killed {
            self.phase = EorPhase::Converged;
            tracing::info!("Task converged successfully");
            return Ok(self.phase);
        }

        // Check oscillation
        if self.detect_oscillation() {
            self.phase = EorPhase::Escalated;
            tracing::warn!("Oscillation detected, escalating to human");
            return Ok(self.phase);
        }

        // Check iteration limit
        if self.iteration >= self.max_iterations {
            self.phase = EorPhase::Escalated;
            tracing::warn!("Max iterations reached, escalating to human");
            return Ok(self.phase);
        }

        self.phase = EorPhase::Reflecting;
        tracing::info!("EOR Iteration {} - Reflecting", self.iteration);

        // Format error context for the agent
        let error_context = Self::format_errors(&observation);

        // Ask agent to reflect and generate fixes
        let fixed_files = agent.reflect_on_errors(&self.task_context, &error_context).await?;

        // Write fixed files
        for (path, content) in &fixed_files {
            harness.write_file(&self.task_context.worktree_path, path, content).await?;
        }

        // Hash the new code
        let combined_code: String = fixed_files.iter().map(|(_, c)| c.as_str()).collect();
        let hash = Self::hash_code(&combined_code);
        self.ast_hashes.push(hash);

        // Execute again
        let new_observation = harness.execute_in_sandbox(
            &self.task_context.worktree_path,
            &["cargo", "build", "--release"],
        ).await?;

        self.iteration += 1;

        // Recursively continue the loop
        if new_observation.exit_code == 0 && !new_observation.oom_killed {
            self.phase = EorPhase::Converged;
        } else if self.detect_oscillation() || self.iteration >= self.max_iterations {
            self.phase = EorPhase::Escalated;
        } else {
            // Continue looping
            return self.observe_and_reflect(harness, agent, new_observation).await;
        }

        Ok(self.phase)
    }

    fn detect_oscillation(&self) -> bool {
        if self.ast_hashes.len() < 2 {
            return false;
        }

        let last_hash = self.ast_hashes[self.ast_hashes.len() - 1];

        // Check if the last hash matches any previous hash
        // This indicates the agent is cycling through the same code states
        self.ast_hashes[..self.ast_hashes.len() - 1].contains(&last_hash)
    }

    fn hash_code(code: &str) -> u64 {
        let mut hasher = AHasher::default();
        code.hash(&mut hasher);
        hasher.finish()
    }

    fn format_errors(observation: &ObservationResult) -> String {
        let mut error_text = String::new();

        if observation.oom_killed {
            error_text.push_str("CRITICAL: Process was killed due to out-of-memory (OOM).\n");
            error_text.push_str("The code is consuming too much memory. Consider:\n");
            error_text.push_str("- Using iterators instead of collecting into Vec\n");
            error_text.push_str("- Reducing recursion depth\n");
            error_text.push_str("- Using Box<T> for large structures\n\n");
        }

        if !observation.parsed_errors.is_empty() {
            error_text.push_str("Compiler errors:\n");
            for error in &observation.parsed_errors {
                error_text.push_str(&format!(
                    "{}:{}:{} - {} - {}\n",
                    error.file, error.line, error.column, error.code, error.message
                ));
            }
        }

        if !observation.stderr.is_empty() && observation.parsed_errors.is_empty() {
            error_text.push_str("\nStderr output:\n");
            error_text.push_str(&observation.stderr);
        }

        error_text
    }
}