use tauri::command;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct StartSwarmCommand {
    pub prompt: String,
}

#[derive(Serialize)]
pub struct SwarmIdResponse {
    pub swarm_id: String,
}

#[command]
pub async fn start_swarm(cmd: StartSwarmCommand) -> Result<SwarmIdResponse, String> {
    // Call the vibe-kanban API
    // In a real implementation, this would use a shared state
    Ok(SwarmIdResponse {
        swarm_id: uuid::Uuid::new_v4().to_string(),
    })
}

#[derive(Serialize)]
pub struct SwarmStatus {
    pub total_tasks: usize,
    pub completed_tasks: usize,
    pub failed_tasks: usize,
}

#[command]
pub async fn get_swarm_status() -> Result<SwarmStatus, String> {
    // Query the shared DAG state
    Ok(SwarmStatus {
        total_tasks: 10,
        completed_tasks: 5,
        failed_tasks: 0,
    })
}

#[command]
pub async fn escalate_agent(agent_id: String) -> Result<(), String> {
    // Pause the agent's EOR loop
    Ok(())
}

#[command]
pub async fn approve_action(action_id: String) -> Result<(), String> {
    // Approve a pending action (e.g., git push, terraform apply)
    Ok(())
}

pub fn register_commands(app: &mut tauri::Builder) {
    app.invoke_handler(tauri::generate_handler![
        start_swarm,
        get_swarm_status,
        escalate_agent,
        approve_action,
    ]);
}