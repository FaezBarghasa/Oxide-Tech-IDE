use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use crate::dag::{DAGNode, Workflow, NodeState};
use anyhow::Result;

#[derive(Deserialize)]
struct PlanRequest {
    ticket_description: String,
}

#[derive(Serialize)]
struct PlanResponse {
    workflow_id: String,
    tasks: Vec<DAGNode>,
}

async fn plan_handler(req: web::Json<PlanRequest>) -> impl Responder {
    // In a real implementation, we would query the code graph and call an LLM to generate the plan.
    // For now, we just return a dummy plan.
    let workflow_id = format!("linear-issue-{}", rand::random::<u16>());
    let tasks = vec![
        DAGNode {
            id: "task_database".to_string(),
            execution_cmd: "cargo run --bin db-migrate".to_string(),
            validation_script: "cargo test test_migrations".to_string(),
            dependencies: vec![],
            state: NodeState::Pending,
        },
        DAGNode {
            id: "task_backend".to_string(),
            execution_cmd: "cargo build --bin backend".to_string(),
            validation_script: "cargo test test_api".to_string(),
            dependencies: vec!["task_database".to_string()],
            state: NodeState::Pending,
        },
    ];

    HttpResponse::Ok().json(PlanResponse {
        workflow_id,
        tasks,
    })
}

pub fn configure_scheduler(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/swarm/plan")
            .route(web::post().to(plan_handler))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_plan_handler() {
        let app = test::init_service(App::new().configure(configure_scheduler)).await;

        let req = test::TestRequest::post()
            .uri("/swarm/plan")
            .set_json(&PlanRequest { ticket_description: "test ticket".to_string() })
            .to_request();

        let resp: PlanResponse = test::call_and_read_body_json(&app, req).await;

        assert!(!resp.workflow_id.is_empty());
        assert_eq!(resp.tasks.len(), 2);
    }
}
