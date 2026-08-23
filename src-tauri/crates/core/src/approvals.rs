use surrealdb::engine::local::{Db, Mem};
use surrealdb::Surreal;
use std::sync::Arc;
use crate::errors::{OxideError, OxideResult};
use git2::{Repository, Signature};
use std::path::Path;

// Assuming DAG and Workflow structs are accessible here
// For simplicity, we'll define them again. In a real project, they would be in a shared crate.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum TaskState {
    Pending,
    Running,
    Verified,
    Failed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DAGTaskNode {
    pub id: String,
    pub execution_cmd: String,
    pub validation_script: String,
    pub dependencies: Vec<String>,
    pub state: TaskState,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Workflow {
    pub id: String,
    pub workspace_path: String,
    pub nodes: Vec<DAGTaskNode>,
}


#[derive(Debug, PartialEq)]
pub enum MergeDecision {
    Approved,
    Rejected,
}

pub struct SwarmCritic {
    db: Arc<Surreal<Db>>,
}

impl SwarmCritic {
    pub async fn new() -> Self {
        let db = Arc::new(Surreal::new::<Mem>(()).await.unwrap());
        db.use_ns("oxide").use_db("tech").await.unwrap();
        Self { db }
    }

    pub async fn evaluate_swarm_outputs(&self, workflow_id: &str, repo_path: &Path) -> OxideResult<MergeDecision> {
        let workflow: Option<Workflow> = self.db.select(("workflow", workflow_id)).await.map_err(|e| OxideError::SurrealDbError{message: e.to_string()})?;

        if let Some(wf) = workflow {
            if wf.nodes.iter().all(|n| n.state == TaskState::Verified) {
                // In a real implementation, you would merge branches here using git2
                // and run integration tests.
                let repo = Repository::open(repo_path).map_err(|e| OxideError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

                // This is a simplified merge process
                let signature = Signature::now("Swarm Critic", "critic@oxide.tech").map_err(|e| OxideError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
                let head = repo.head().unwrap().peel_to_commit().unwrap();
                let mut index = repo.index().unwrap();
                let tree_id = index.write_tree().unwrap();
                let tree = repo.find_tree(tree_id).unwrap();

                repo.commit(Some("HEAD"), &signature, &signature, "Swarm merge", &tree, &[&head]).map_err(|e| OxideError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

                Ok(MergeDecision::Approved)
            } else {
                Ok(MergeDecision::Rejected)
            }
        } else {
            Err(OxideError::EpisodeNotFound { hash: workflow_id.to_string() })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_swarm_critic_approval() {
        let critic = SwarmCritic::new().await;
        let workflow = Workflow {
            id: "test_wf".to_string(),
            workspace_path: "/tmp".to_string(),
            nodes: vec![DAGTaskNode {
                id: "task1".to_string(),
                execution_cmd: "".to_string(),
                validation_script: "".to_string(),
                dependencies: vec![],
                state: TaskState::Verified,
            }],
        };
        critic.db.create(("workflow", "test_wf")).content(&workflow).await.unwrap();

        let dir = tempdir().unwrap();
        Repository::init(dir.path()).unwrap();

        let decision = critic.evaluate_swarm_outputs("test_wf", dir.path()).await.unwrap();
        assert_eq!(decision, MergeDecision::Approved);
    }

    #[tokio::test]
    async fn test_swarm_critic_rejection() {
        let critic = SwarmCritic::new().await;
        let workflow = Workflow {
            id: "test_wf_fail".to_string(),
            workspace_path: "/tmp".to_string(),
            nodes: vec![DAGTaskNode {
                id: "task1".to_string(),
                execution_cmd: "".to_string(),
                validation_script: "".to_string(),
                dependencies: vec![],
                state: TaskState::Failed,
            }],
        };
        critic.db.create(("workflow", "test_wf_fail")).content(&workflow).await.unwrap();

        let dir = tempdir().unwrap();
        Repository::init(dir.path()).unwrap();

        let decision = critic.evaluate_swarm_outputs("test_wf_fail", dir.path()).await.unwrap();
        assert_eq!(decision, MergeDecision::Rejected);
    }
}
