use crate::engine::AgentEngine;
use crate::events::*;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppliedFix {
    pub file_path: String,
    pub error_pattern: String,
    pub fix_description: String,
    pub healed_by: String, // "fast_heuristic" | "agent_llm"
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealingTrigger {
    OnSave,
    OnTestFail,
    OnCIReport,
    Manual,
}

pub struct HealingAgent {
    engine: Arc<AgentEngine>,
}

impl HealingAgent {
    pub fn new(engine: Arc<AgentEngine>) -> Self {
        Self { engine }
    }

    /// Autonomous compile-error healing loop
    pub async fn run_healing(
        &self,
        workspace_path: &str,
        raw_error_message: &str,
        file_path: &str,
        line: usize,
    ) -> Result<Option<AppliedFix>> {
        let msg_lower = raw_error_message.to_lowercase();

        let is_unresolved = msg_lower.contains("cannot find value")
            || msg_lower.contains("unresolved import")
            || msg_lower.contains("not found in this scope");
        let is_path_error = msg_lower.contains("path") || msg_lower.contains("pathbuf");

        if is_unresolved && is_path_error && std::path::Path::new(file_path).exists() {
            let content = tokio::fs::read_to_string(file_path).await.unwrap_or_default();
            if !content.contains("use std::path::PathBuf;") {
                let new_content = format!("use std::path::{{Path, PathBuf}};\n{}", content);
                let _ = tokio::fs::write(file_path, new_content).await;
                return Ok(Some(AppliedFix {
                    file_path: file_path.to_string(),
                    error_pattern: "Missing std::path import".to_string(),
                    fix_description: "Added 'use std::path::{Path, PathBuf};'".to_string(),
                    healed_by: "fast_heuristic".to_string(),
                }));
            }
        }

        // 2. Spawn targeted Agent task with cognitive memory
        let prompt = format!(
            "Fix Rust compilation error in {}:{}: {}\nEnsure the fix is minimal, type-safe, and passes cargo check.",
            file_path, line, raw_error_message
        );

        let task = AgentTask {
            id: uuid::Uuid::new_v4().to_string(),
            prompt,
            mode: AgentMode::Yolo, // Auto-apply fix in self-healing mode
            context_hints: vec![file_path.to_string()],
            workspace_path: workspace_path.to_string(),
            token_budget: Some(15_000),
        };

        let (event_tx, _) = tokio::sync::broadcast::channel(32);
        let result = self.engine.run(task, event_tx).await?;

        match result {
            AgentResult::Success { summary, diffs_applied, .. } => {
                if diffs_applied > 0 {
                    Ok(Some(AppliedFix {
                        file_path: file_path.to_string(),
                        error_pattern: raw_error_message.to_string(),
                        fix_description: summary,
                        healed_by: "agent_llm".to_string(),
                    }))
                } else {
                    Ok(None)
                }
            }
            _ => Ok(None),
        }
    }
}
