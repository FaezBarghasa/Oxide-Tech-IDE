use crate::errors::{OxideError, OxideResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskContext {
    pub task_id: String,
    pub instruction: String,
    pub worktree_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservationResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EorPhase {
    Execute,
    Observe,
    Reflect,
    PausedForHitl,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoopEngine {
    pub max_iterations: u32,
    pub current_iteration: u32,
    pub phase: EorPhase,
    pub error_frequency: HashMap<String, u32>,
    pub oscillation_threshold: u32,
    pub is_oscillating: bool,
}

impl LoopEngine {
    pub fn new(max_iterations: u32) -> Self {
        Self {
            max_iterations,
            current_iteration: 0,
            phase: EorPhase::Execute,
            error_frequency: HashMap::new(),
            oscillation_threshold: 3,
            is_oscillating: false,
        }
    }

    pub fn next_step(&mut self, observation: &ObservationResult) -> OxideResult<EorPhase> {
        self.current_iteration += 1;

        if observation.success {
            self.phase = EorPhase::Completed;
            self.is_oscillating = false;
            return Ok(EorPhase::Completed);
        }

        // Track error signature for Oscillation Guard
        if let Some(err) = &observation.error {
            let signature = err.lines().next().unwrap_or(err).trim().to_string();
            let count = self.error_frequency.entry(signature.clone()).or_insert(0);
            *count += 1;

            if *count >= self.oscillation_threshold {
                self.is_oscillating = true;
                self.phase = EorPhase::PausedForHitl;
                tracing::warn!(
                    "Oscillation Guard triggered for error: '{}' (repeated {} times)",
                    signature,
                    count
                );
                return Ok(EorPhase::PausedForHitl);
            }
        }

        if self.current_iteration >= self.max_iterations {
            self.phase = EorPhase::Failed;
            return Err(OxideError::LoopLimitExceeded {
                max_iterations: self.max_iterations,
            });
        }

        self.phase = EorPhase::Reflect;
        Ok(EorPhase::Reflect)
    }

    /// Resume execution after human operator has provided input / edited diff in HITL modal
    pub fn resume_from_hitl(&mut self) {
        self.is_oscillating = false;
        self.error_frequency.clear();
        self.phase = EorPhase::Execute;
    }
}
