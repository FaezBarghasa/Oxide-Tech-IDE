use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum AgentMode {
    #[default]
    Plan,
    Yolo,
    Ask,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub max_iterations: usize,
    pub max_tool_calls_per_step: usize,
    pub context_token_budget: usize,
    pub default_mode: AgentMode,
    pub approval_required_for: Vec<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            max_iterations: 25,
            max_tool_calls_per_step: 5,
            context_token_budget: 30_000,
            default_mode: AgentMode::Plan,
            approval_required_for: vec![
                "terminal.run".to_string(),
                "git.commit".to_string(),
                "debugger.halt".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub prompt: String,
    pub mode: AgentMode,
    pub context_hints: Vec<String>,
    pub workspace_path: String,
    pub token_budget: Option<usize>,
}

impl Default for AgentTask {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            prompt: String::new(),
            mode: AgentMode::Plan,
            context_hints: Vec::new(),
            workspace_path: ".".to_string(),
            token_budget: Some(30_000),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    pub id: String,
    pub old_start: usize,
    pub old_lines: usize,
    pub new_start: usize,
    pub new_lines: usize,
    pub diff_text: String,
    pub status: String, // "pending" | "accepted" | "rejected"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingDiff {
    pub path: PathBuf,
    pub original: String,
    pub modified: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum AgentEvent {
    Thinking {
        thought: String,
    },
    PlanGenerated {
        plan: Vec<String>,
    },
    ToolCall {
        id: String,
        tool: String,
        args: serde_json::Value,
    },
    ToolResult {
        id: String,
        result: serde_json::Value,
        duration_ms: u64,
    },
    DiffProposed {
        path: PathBuf,
        diff: String,
    },
    DiffApplied {
        path: PathBuf,
    },
    DiffRejected {
        path: PathBuf,
    },
    Command {
        cmd: String,
        stdout: String,
        stderr: String,
        exit: i32,
    },
    Insight {
        memory_id: String,
        content: String,
    },
    Error {
        kind: String,
        message: String,
    },
    Completed {
        summary: String,
        tokens_used: u64,
    },
    UserAnswer {
        answer: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", content = "details")]
pub enum AgentStatus {
    Queued,
    Planning,
    Executing {
        current_tool: Option<String>,
        progress: f32,
    },
    AwaitingApproval {
        pending_diffs: usize,
    },
    Completed {
        success: bool,
    },
    Failed {
        error: String,
    },
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentAction {
    ToolCall {
        id: String,
        tool: String,
        args: serde_json::Value,
    },
    ProposeDiff {
        path: PathBuf,
        original: String,
        modified: String,
    },
    AskUser {
        question: String,
    },
    Complete {
        summary: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum AgentResult {
    Success {
        summary: String,
        iterations: usize,
        tokens_used: u64,
        diffs_applied: usize,
    },
    Failure {
        error: String,
        iterations: usize,
    },
    Cancelled {
        reason: String,
    },
}
