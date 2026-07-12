use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct AgentStateEvent {
    pub agent_id: String,
    pub phase: String,
    pub iteration: u32,
}

#[derive(Clone, Serialize)]
pub struct LogEvent {
    pub agent_id: String,
    pub level: String,
    pub message: String,
}

pub fn emit_agent_state(app: &AppHandle, event: AgentStateEvent) {
    app.emit("agent-state-changed", event).ok();
}

pub fn emit_log(app: &AppHandle, event: LogEvent) {
    app.emit("agent-log", event).ok();
}