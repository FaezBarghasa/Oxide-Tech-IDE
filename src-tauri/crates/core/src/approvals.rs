use crate::errors::{OxideError, OxideResult};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::RwLock;

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

#[derive(Debug, PartialEq, Eq)]
pub enum MergeDecision {
    Approved,
    Rejected,
}

pub struct SwarmCritic {
    workflows: Arc<RwLock<HashMap<String, Workflow>>>,
}

impl SwarmCritic {
    pub async fn new() -> Self {
        Self {
            workflows: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn store_workflow(&self, workflow: Workflow) {
        let mut map = self.workflows.write().await;
        map.insert(workflow.id.clone(), workflow);
    }

    pub async fn evaluate_swarm_outputs(
        &self,
        workflow_id: &str,
        _repo_path: &Path,
    ) -> OxideResult<MergeDecision> {
        let map = self.workflows.read().await;
        if let Some(wf) = map.get(workflow_id) {
            if wf.nodes.iter().all(|n| n.state == TaskState::Verified) {
                Ok(MergeDecision::Approved)
            } else {
                Ok(MergeDecision::Rejected)
            }
        } else {
            Err(OxideError::EpisodeNotFound {
                hash: workflow_id.to_string(),
            })
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
        critic.store_workflow(workflow).await;

        let dir = tempdir().unwrap();
        let decision = critic
            .evaluate_swarm_outputs("test_wf", dir.path())
            .await
            .unwrap();
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
        critic.store_workflow(workflow).await;

        let dir = tempdir().unwrap();
        let decision = critic
            .evaluate_swarm_outputs("test_wf_fail", dir.path())
            .await
            .unwrap();
        assert_eq!(decision, MergeDecision::Rejected);
    }
}
