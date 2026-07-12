use crate::sandbox::{
    manager::LocalFirecrackerSandbox,
    service::{AEOSSandbox, SandboxError},
};
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Deserialize)]
struct SessionRequest {
    session_id: String,
}

#[derive(Deserialize)]
struct MountRequest {
    session_id: String,
    path: String,
}

#[derive(Deserialize)]
struct ExecuteRequest {
    session_id: String,
    command: String,
    envs: HashMap<String, String>,
}

async fn start_sandbox(
    sandbox: web::Data<Arc<LocalFirecrackerSandbox>>,
    req: web::Json<SessionRequest>,
) -> impl Responder {
    match sandbox.start_session(&req.session_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "started"})),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn mount_in_sandbox(
    sandbox: web::Data<Arc<LocalFirecrackerSandbox>>,
    req: web::Json<MountRequest>,
) -> impl Responder {
    match sandbox.mount_worktree(&req.session_id, &std::path::PathBuf::from(&req.path)).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "mounted"})),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn execute_in_sandbox(
    sandbox: web::Data<Arc<LocalFirecrackerSandbox>>,
    req: web::Json<ExecuteRequest>,
) -> impl Responder {
    match sandbox.execute_pty_command(&req.session_id, &req.command, req.envs.clone()).await {
        Ok(status) => HttpResponse::Ok().json(serde_json::json!({
            "status": "executed",
            "exit_code": status.code()
        })),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn terminate_sandbox(
    sandbox: web::Data<Arc<LocalFirecrackerSandbox>>,
    req: web::Json<SessionRequest>,
) -> impl Responder {
    match sandbox.terminate_session(&req.session_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "terminated"})),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub async fn run_server() -> std::io::Result<()> {
    let sandbox = Arc::new(LocalFirecrackerSandbox::new().await.unwrap());
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(sandbox.clone()))
            .route("/sandbox/start", web::post().to(start_sandbox))
            .route("/sandbox/mount", web.post().to(mount_in_sandbox))
            .route("/sandbox/execute", web::post().to(execute_in_sandbox))
            .route("/sandbox/terminate", web::post().to(terminate_sandbox))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
