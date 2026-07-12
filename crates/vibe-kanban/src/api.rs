use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use crate::dag::SwarmDag;

pub struct AppState {
    pub dag: Arc<tokio::sync::RwLock<SwarmDag>>,
}

#[derive(Deserialize)]
pub struct StartSwarmRequest {
    pub prompt: String,
    pub max_parallel_agents: Option<usize>,
}

#[derive(Serialize)]
pub struct StartSwarmResponse {
    pub swarm_id: String,
    pub task_count: usize,
    pub estimated_tokens: u64,
}

#[derive(Serialize)]
pub struct SwarmStatusResponse {
    pub total_tasks: usize,
    pub completed_tasks: usize,
    pub failed_tasks: usize,
    pub running_tasks: usize,
    pub pending_tasks: usize,
}

pub async fn start_swarm(
    data: web::Data<AppState>,
    req: web::Json<StartSwarmRequest>,
) -> impl Responder {
    // In a real implementation, this would call the Orchestrator
    // For now, return a mock response
    HttpResponse::Ok().json(StartSwarmResponse {
        swarm_id: Uuid::new_v4().to_string(),
        task_count: 5,
        estimated_tokens: 50_000,
    })
}

pub async fn get_swarm_status(data: web::Data<AppState>) -> impl Responder {
    let dag = data.dag.read().await;

    let total_tasks = dag.node_map.len();
    let completed_tasks = dag.node_map.values()
        .filter(|(_, task)| task.status == crate::dag::TaskStatus::Completed)
        .count();
    let failed_tasks = dag.node_map.values()
        .filter(|(_, task)| task.status == crate::dag::TaskStatus::Failed)
        .count();
    let running_tasks = dag.node_map.values()
        .filter(|(_, task)| task.status == crate::dag::TaskStatus::Running)
        .count();
    let pending_tasks = dag.node_map.values()
        .filter(|(_, task)| task.status == crate::dag::TaskStatus::Pending)
        .count();

    HttpResponse::Ok().json(SwarmStatusResponse {
        total_tasks,
        completed_tasks,
        failed_tasks,
        running_tasks,
        pending_tasks,
    })
}

pub async fn escalate_task(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let task_id_str = path.into_inner();
    let task_id = match Uuid::parse_str(&task_id_str) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().body("Invalid task ID"),
    };

    // In a real implementation, this would pause the EOR loop
    // For now, return success
    HttpResponse::Ok().json(serde_json::json!({
        "status": "escalated",
        "task_id": task_id_str
    }))
}

pub async fn configure_server(addr: &str, dag: Arc<tokio::sync::RwLock<SwarmDag>>) -> OxideResult<()> {
    let data = web::Data::new(AppState { dag });

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .route("/api/v1/swarm/start", web::post().to(start_swarm))
            .route("/api/v1/swarm/status", web::get().to(get_swarm_status))
            .route("/api/v1/agent/{id}/escalate", web::post().to(escalate_task))
    })
    .bind(addr)
    .map_err(|e| OxideError::IoError(e))?
    .run()
    .await
    .map_err(|e| OxideError::IoError(e))?;

    Ok(())
}