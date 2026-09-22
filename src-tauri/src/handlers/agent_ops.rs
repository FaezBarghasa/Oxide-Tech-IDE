use oxide_agent::{
    create_standard_tool_registry, AgentConfig, AgentEngine, AgentEvent, AgentMode,
    AgentOrchestrator, AgentResult, AgentRuntime, AgentTask, AppliedFix,
    BugIntroductionCandidate, EmbeddedAgent, EvolutionEvent, GeneratedHalDriver,
    HardFaultDiagnosis, HealingAgent, ParallelAgentInfo, TemporalService,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::OnceCell;

static AGENT_ENGINE: OnceCell<Arc<AgentEngine>> = OnceCell::const_new();
static AGENT_ORCHESTRATOR: OnceCell<Arc<AgentOrchestrator>> = OnceCell::const_new();

async fn get_or_init_engine() -> Arc<AgentEngine> {
    AGENT_ENGINE
        .get_or_init(|| async {
            let tools = create_standard_tool_registry().await;
            let config = AgentConfig::default();
            Arc::new(AgentEngine::new(tools, config))
        })
        .await
        .clone()
}

async fn get_or_init_orchestrator() -> Arc<AgentOrchestrator> {
    AGENT_ORCHESTRATOR
        .get_or_init(|| async {
            let engine = get_or_init_engine().await;
            Arc::new(AgentOrchestrator::new(engine, 5))
        })
        .await
        .clone()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteTaskPayload {
    pub prompt: String,
    pub mode: Option<String>,
    pub workspace_path: Option<String>,
    pub context_hints: Option<Vec<String>>,
}

/// Execute an agent task in foreground with streaming events
#[tauri::command]
pub async fn agent_execute_task(
    payload: ExecuteTaskPayload,
) -> Result<AgentResult, String> {
    let engine = get_or_init_engine().await;
    let mode = match payload.mode.as_deref() {
        Some("yolo") => AgentMode::Yolo,
        Some("ask") => AgentMode::Ask,
        _ => AgentMode::Plan,
    };

    let task = AgentTask {
        id: uuid::Uuid::new_v4().to_string(),
        prompt: payload.prompt,
        mode,
        context_hints: payload.context_hints.unwrap_or_default(),
        workspace_path: payload.workspace_path.unwrap_or_else(|| ".".to_string()),
        token_budget: Some(30_000),
    };

    let (event_tx, _) = tokio::sync::broadcast::channel(128);
    engine
        .run(task, event_tx)
        .await
        .map_err(|e| format!("Agent execution failed: {}", e))
}

/// Approve pending plan or staged diff
#[tauri::command]
pub async fn agent_approve_plan(task_id: String) -> Result<bool, String> {
    let engine = get_or_init_engine().await;
    if let Some(session) = engine.get_session(&task_id).await {
        session.approve();
        Ok(true)
    } else {
        Err(format!("Task session {} not found", task_id))
    }
}

/// Reject pending plan or staged diff
#[tauri::command]
pub async fn agent_reject_plan(task_id: String) -> Result<bool, String> {
    let engine = get_or_init_engine().await;
    if let Some(session) = engine.get_session(&task_id).await {
        session.reject();
        Ok(true)
    } else {
        Err(format!("Task session {} not found", task_id))
    }
}

/// Spawn a parallel agent in orchestrator
#[tauri::command]
pub async fn agent_spawn_parallel(
    prompt: String,
    mode: Option<String>,
    workspace_path: Option<String>,
    runtime: Option<String>,
) -> Result<String, String> {
    let orch = get_or_init_orchestrator().await;
    let agent_mode = match mode.as_deref() {
        Some("yolo") => AgentMode::Yolo,
        Some("ask") => AgentMode::Ask,
        _ => AgentMode::Plan,
    };

    let task = AgentTask {
        id: uuid::Uuid::new_v4().to_string(),
        prompt,
        mode: agent_mode,
        context_hints: Vec::new(),
        workspace_path: workspace_path.unwrap_or_else(|| ".".to_string()),
        token_budget: Some(30_000),
    };

    let agent_runtime = match runtime.as_deref() {
        Some("docker") => AgentRuntime::DockerContainer {
            image: "rust:1.85-alpine".to_string(),
            mount_repo: true,
        },
        Some("ssh") => AgentRuntime::SSHRemote {
            host: "localhost".to_string(),
            user: "root".to_string(),
            key_path: std::path::PathBuf::from("~/.ssh/id_rsa"),
        },
        _ => AgentRuntime::InProcess,
    };

    orch.spawn(task, agent_runtime)
        .await
        .map_err(|e| format!("Failed to spawn parallel agent: {}", e))
}

/// List all running parallel agents in orchestrator
#[tauri::command]
pub async fn agent_list_parallel() -> Result<Vec<ParallelAgentInfo>, String> {
    let orch = get_or_init_orchestrator().await;
    Ok(orch.list_agents().await)
}

/// Cancel an active parallel agent
#[tauri::command]
pub async fn agent_cancel_parallel(agent_id: String) -> Result<bool, String> {
    let orch = get_or_init_orchestrator().await;
    orch.cancel_agent(&agent_id)
        .await
        .map_err(|e| format!("Failed to cancel agent: {}", e))
}

/// Get recorded event timeline for an agent
#[tauri::command]
pub async fn agent_get_events(agent_id: String) -> Result<Vec<AgentEvent>, String> {
    let orch = get_or_init_orchestrator().await;
    orch.get_events(&agent_id)
        .await
        .map_err(|e| format!("Failed to get events: {}", e))
}

/// Run self-healing compiler loop on a diagnostic error
#[tauri::command]
pub async fn agent_heal_compile_errors(
    workspace_path: String,
    raw_error: String,
    file_path: String,
    line: usize,
) -> Result<Option<AppliedFix>, String> {
    let engine = get_or_init_engine().await;
    let healer = HealingAgent::new(engine);
    healer
        .run_healing(&workspace_path, &raw_error, &file_path, line)
        .await
        .map_err(|e| format!("Healing loop error: {}", e))
}

/// Diagnose MCU HardFault from register state
#[tauri::command]
pub async fn agent_embedded_diagnose_fault(
    chip: String,
    pc: u32,
    lr: u32,
    cfsr: u32,
    hfsr: u32,
) -> Result<HardFaultDiagnosis, String> {
    let agent = EmbeddedAgent::new();
    agent
        .diagnose_hard_fault(&chip, pc, lr, cfsr, hfsr)
        .await
        .map_err(|e| format!("Fault diagnosis error: {}", e))
}

/// Generate async Embassy HAL driver for peripheral
#[tauri::command]
pub async fn agent_generate_hal_driver(
    peripheral: String,
    chip_target: String,
) -> Result<GeneratedHalDriver, String> {
    let agent = EmbeddedAgent::new();
    agent
        .generate_hal_driver(&peripheral, &chip_target)
        .await
        .map_err(|e| format!("Driver generation error: {}", e))
}

/// Temporal bisect to find commit introducing a bug
#[tauri::command]
pub async fn agent_temporal_find_commit(
    workspace_path: String,
    bug_description: String,
) -> Result<Vec<BugIntroductionCandidate>, String> {
    let temporal = TemporalService::new();
    temporal
        .find_introducing_commit(&workspace_path, &bug_description)
        .await
        .map_err(|e| format!("Temporal search error: {}", e))
}

/// Temporal module evolution timeline
#[tauri::command]
pub async fn agent_temporal_module_evolution(
    workspace_path: String,
    module_path: String,
) -> Result<Vec<EvolutionEvent>, String> {
    let temporal = TemporalService::new();
    temporal
        .module_evolution(&workspace_path, &module_path)
        .await
        .map_err(|e| format!("Module evolution error: {}", e))
}
