use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskAttempt {
    pub id: i32,
    pub task_id: i32,
    pub status: String,
    pub final_diff: Option<String>,
    pub compiler_error: Option<String>,
}
