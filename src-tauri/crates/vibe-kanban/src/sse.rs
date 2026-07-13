use serde::Serialize;

pub struct SseFormatter;

impl SseFormatter {
    pub fn format_event<T: Serialize>(event_name: &str, data: &T) -> OxideResult<String> {
        let json = serde_json::to_string(data)
            .map_err(|e| OxideError::SerializationError(e))?;

        Ok(format!("event: {}\ndata: {}\n\n", event_name, json))
    }

    pub fn format_comment(comment: &str) -> String {
        format!(": {}\n\n", comment)
    }

    pub fn format_retry(milliseconds: u64) -> String {
        format!("retry: {}\n\n", milliseconds)
    }
}

#[derive(Debug, Serialize)]
pub struct AgentStateEvent {
    pub agent_id: String,
    pub phase: String,
    pub iteration: u32,
    pub token_usage: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct LogEvent {
    pub agent_id: String,
    pub level: String,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct TaskCompletionEvent {
    pub task_id: String,
    pub status: String,
    pub duration_ms: u64,
    pub tokens_used: u64,
}