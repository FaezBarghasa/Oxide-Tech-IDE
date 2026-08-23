use std::path::PathBuf;
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Clone)]
pub struct TaskContext {
    pub task_id: String,
    pub instruction: String,
    pub worktree_path: PathBuf,
}

#[derive(Debug, Clone)]
pub struct ObservationResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EorPhase {
    Execute,
    Observe,
    Reflect,
    Completed,
    Failed,
}

pub struct LoopEngine {
    pub max_iterations: u32,
    pub current_iteration: u32,
    pub phase: EorPhase,
}

impl LoopEngine {
    pub fn new(max_iterations: u32) -> Self {
        Self {
            max_iterations,
            current_iteration: 0,
            phase: EorPhase::Execute,
        }
    }

    pub fn next_step(&mut self, observation: &ObservationResult) -> OxideResult<EorPhase> {
        self.current_iteration += 1;

        if observation.success {
            self.phase = EorPhase::Completed;
            return Ok(EorPhase::Completed);
        }

        if self.current_iteration >= self.max_iterations {
            self.phase = EorPhase::Failed;
            return Err(OxideError::LoopLimitExceeded { max_iterations: self.max_iterations });
        }

        self.phase = EorPhase::Reflect;
        Ok(EorPhase::Reflect)
    }
}
