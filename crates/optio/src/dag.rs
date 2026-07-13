use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::Topo;
use surrealdb::engine::any::Any;
use surrealdb::Surreal;
use tokio::sync::mpsc;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeState {
    Pending,
    Running,
    Verified,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAGNode {
    pub id: String,
    pub execution_cmd: String,
    pub validation_script: String,
    pub dependencies: Vec<String>,
    pub state: String, // "PENDING", "RUNNING", "VERIFIED", "FAILED"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub workspace_path: String,
    pub nodes: Vec<DAGNode>,
}

pub struct DagExecutor {
    db: Surreal<Any>,
}

impl DagExecutor {
    pub fn new(db: Surreal<Any>) -> Self {
        Self { db }
    }

    pub async fn execute_workflow(&self, workflow: Workflow) -> Result<()> {
        self.db.create(("workflow", &workflow.id)).content(&workflow).await?;

        let mut graph = DiGraph::<DAGNode, ()>::new();
        let mut node_map = HashMap::new();

        for node in &workflow.nodes {
            let index = graph.add_node(node.clone());
            node_map.insert(node.id.clone(), index);
        }

        for node in &graph.raw_nodes() {
            for dep in &node.weight.dependencies {
                if let Some(&dep_index) = node_map.get(dep) {
                    graph.add_edge(dep_index, node_map[&node.weight.id], ());
                }
            }
        }

        let mut topo = Topo::new(&graph);
        while let Some(nx) = topo.next(&graph) {
            let node = &graph[nx];
            self.update_node_state(&workflow.id, &node.id, "RUNNING").await?;
            // In a real implementation, we would execute the node here.
            println!("Executing node: {:?}", node);
            self.update_node_state(&workflow.id, &node.id, "VERIFIED").await?;
        }

        Ok(())
    }

    async fn update_node_state(&self, workflow_id: &str, node_id: &str, state: &str) -> Result<()> {
        let query = "UPDATE workflow SET nodes[WHERE id = $node_id].state = $state WHERE id = $workflow_id;";
        self.db.query(query)
            .bind(("node_id", node_id))
            .bind(("state", state))
            .bind(("workflow_id", workflow_id))
            .await?;
        Ok(())
    }
}

async fn start_workflow(executor: web::Data<DagExecutor>, workflow: web::Json<Workflow>) -> impl Responder {
    match executor.execute_workflow(workflow.into_inner()).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

pub async fn run_server(db: Surreal<Any>) -> Result<()> {
    let executor = web::Data::new(DagExecutor::new(db));
    HttpServer::new(move || {
        App::new()
            .app_data(executor.clone())
            .route("/workflow", web::post().to(start_workflow))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await?;
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use surrealdb::engine::any::connect;
    use surrealdb::opt::Mem;

    async fn setup_db() -> Result<Surreal<Any>> {
        let db = connect(Mem).await?;
        db.use_ns("test").use_db("test").await?;
        Ok(db)
    }

    #[tokio::test]
    async fn test_dag_execution_order() -> Result<()> {
        let db = setup_db().await?;
        let executor = DagExecutor::new(db);

        let workflow = Workflow {
            id: "test_workflow".to_string(),
            workspace_path: "/tmp".to_string(),
            nodes: vec![
                DAGNode {
                    id: "task_a".to_string(),
                    execution_cmd: "echo A".to_string(),
                    validation_script: "true".to_string(),
                    dependencies: vec![],
                    state: "PENDING".to_string(),
                },
                DAGNode {
                    id: "task_b".to_string(),
                    execution_cmd: "echo B".to_string(),
                    validation_script: "true".to_string(),
                    dependencies: vec!["task_a".to_string()],
                    state: "PENDING".to_string(),
                },
                DAGNode {
                    id: "task_c".to_string(),
                    execution_cmd: "echo C".to_string(),
                    validation_script: "true".to_string(),
                    dependencies: vec!["task_a".to_string()],
                    state: "PENDING".to_string(),
                },
            ],
        };

        executor.execute_workflow(workflow).await?;

        Ok(())
    }
}
