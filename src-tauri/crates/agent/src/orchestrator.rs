use crate::engine::AgentEngine;
use crate::events::*;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentRuntime {
    InProcess,
    DockerContainer {
        image: String,
        mount_repo: bool,
    },
    SSHRemote {
        host: String,
        user: String,
        key_path: PathBuf,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParallelAgentInfo {
    pub id: String,
    pub prompt: String,
    pub mode: AgentMode,
    pub status: String,
    pub progress: f32,
    pub runtime: String,
    pub started_at: String,
    pub events_count: usize,
}

pub struct AgentHandle {
    pub id: String,
    pub task: AgentTask,
    pub runtime: AgentRuntime,
    pub status: Arc<RwLock<AgentStatus>>,
    pub events_history: Arc<RwLock<Vec<AgentEvent>>>,
    pub event_tx: broadcast::Sender<AgentEvent>,
    pub cancel_tx: tokio::sync::watch::Sender<bool>,
}

/// Graph-based file locking to prevent concurrent destructive write collisions
pub struct GraphLock {
    locks: Arc<RwLock<HashMap<PathBuf, String>>>, // Path -> AgentId
}

impl GraphLock {
    pub fn new() -> Self {
        Self {
            locks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn acquire(&self, agent_id: &str, path: &Path) -> Result<bool> {
        let mut map = self.locks.write().await;
        if let Some(owner) = map.get(path).filter(|o| *o != agent_id) {
            return Err(anyhow!("File {:?} is currently locked by agent {}", path, owner));
        }
        map.insert(path.to_path_buf(), agent_id.to_string());
        Ok(true)
    }

    pub async fn release(&self, agent_id: &str, path: &Path) {
        let mut map = self.locks.write().await;
        if let Some(owner) = map.get(path).filter(|o| *o == agent_id) {
            let _ = owner;
            map.remove(path);
        }
    }
}

impl Default for GraphLock {
    fn default() -> Self {
        Self::new()
    }
}

pub struct AgentOrchestrator {
    engine: Arc<AgentEngine>,
    agents: Arc<RwLock<HashMap<String, Arc<AgentHandle>>>>,
    max_parallel: usize,
    graph_lock: Arc<GraphLock>,
}

impl AgentOrchestrator {
    pub fn new(engine: Arc<AgentEngine>, max_parallel: usize) -> Self {
        Self {
            engine,
            agents: Arc::new(RwLock::new(HashMap::new())),
            max_parallel,
            graph_lock: Arc::new(GraphLock::new()),
        }
    }

    pub fn graph_lock(&self) -> &Arc<GraphLock> {
        &self.graph_lock
    }

    pub async fn spawn(&self, task: AgentTask, runtime: AgentRuntime) -> Result<String> {
        let active_count = {
            let map = self.agents.read().await;
            map.len()
        };

        if active_count >= self.max_parallel {
            return Err(anyhow!(
                "Max parallel agent capacity reached ({}/{}). Please wait or cancel an agent.",
                active_count,
                self.max_parallel
            ));
        }

        let agent_id = task.id.clone();
        let (event_tx, mut event_rx) = broadcast::channel(128);
        let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);

        let handle = Arc::new(AgentHandle {
            id: agent_id.clone(),
            task: task.clone(),
            runtime: runtime.clone(),
            status: Arc::new(RwLock::new(AgentStatus::Queued)),
            events_history: Arc::new(RwLock::new(Vec::new())),
            event_tx: event_tx.clone(),
            cancel_tx,
        });

        {
            let mut map = self.agents.write().await;
            map.insert(agent_id.clone(), handle.clone());
        }

        // Spawn background event recording listener
        let handle_clone = handle.clone();
        tokio::spawn(async move {
            while let Ok(event) = event_rx.recv().await {
                let mut hist = handle_clone.events_history.write().await;
                hist.push(event.clone());

                // Update status enum based on event
                let mut status = handle_clone.status.write().await;
                match &event {
                    AgentEvent::Thinking { .. } => {
                        *status = AgentStatus::Executing {
                            current_tool: None,
                            progress: 0.2,
                        };
                    }
                    AgentEvent::PlanGenerated { .. } => {
                        *status = AgentStatus::Planning;
                    }
                    AgentEvent::ToolCall { tool, .. } => {
                        *status = AgentStatus::Executing {
                            current_tool: Some(tool.clone()),
                            progress: 0.5,
                        };
                    }
                    AgentEvent::DiffProposed { .. } => {
                        *status = AgentStatus::AwaitingApproval { pending_diffs: 1 };
                    }
                    AgentEvent::Completed { .. } => {
                        *status = AgentStatus::Completed { success: true };
                    }
                    AgentEvent::Error { message, .. } => {
                        *status = AgentStatus::Failed {
                            error: message.clone(),
                        };
                    }
                    _ => {}
                }
            }
        });

        // Spawn agent worker execution task
        let engine = self.engine.clone();
        let task_clone = task.clone();
        let handle_worker = handle.clone();
        let event_tx_worker = event_tx.clone();

        tokio::spawn(async move {
            tokio::select! {
                _ = cancel_rx.changed() => {
                    let mut s = handle_worker.status.write().await;
                    *s = AgentStatus::Cancelled;
                    let _ = event_tx_worker.send(AgentEvent::Error {
                        kind: "cancelled".to_string(),
                        message: "Agent was cancelled by user".to_string(),
                    });
                }
                res = engine.run(task_clone, event_tx_worker.clone()) => {
                    let mut s = handle_worker.status.write().await;
                    match res {
                        Ok(AgentResult::Success { summary, .. }) => {
                            *s = AgentStatus::Completed { success: true };
                            let _ = event_tx_worker.send(AgentEvent::Completed {
                                summary,
                                tokens_used: 2400,
                            });
                        }
                        Ok(AgentResult::Failure { error, .. }) => {
                            *s = AgentStatus::Failed { error: error.clone() };
                            let _ = event_tx_worker.send(AgentEvent::Error {
                                kind: "failure".to_string(),
                                message: error,
                            });
                        }
                        Ok(AgentResult::Cancelled { reason }) => {
                            *s = AgentStatus::Cancelled;
                            let _ = event_tx_worker.send(AgentEvent::Error {
                                kind: "cancelled".to_string(),
                                message: reason,
                            });
                        }
                        Err(e) => {
                            *s = AgentStatus::Failed { error: e.to_string() };
                            let _ = event_tx_worker.send(AgentEvent::Error {
                                kind: "engine_error".to_string(),
                                message: e.to_string(),
                            });
                        }
                    }
                }
            }
        });

        Ok(agent_id)
    }

    pub async fn list_agents(&self) -> Vec<ParallelAgentInfo> {
        let map = self.agents.read().await;
        let mut list = Vec::new();

        for h in map.values() {
            let status_guard = h.status.read().await;
            let (status_str, progress) = match &*status_guard {
                AgentStatus::Queued => ("Queued".to_string(), 0.0),
                AgentStatus::Planning => ("Planning".to_string(), 0.2),
                AgentStatus::Executing { progress, .. } => ("Executing".to_string(), *progress),
                AgentStatus::AwaitingApproval { .. } => ("Awaiting Approval".to_string(), 0.7),
                AgentStatus::Completed { success } => {
                    if *success {
                        ("Completed".to_string(), 1.0)
                    } else {
                        ("Failed".to_string(), 1.0)
                    }
                }
                AgentStatus::Failed { .. } => ("Failed".to_string(), 1.0),
                AgentStatus::Cancelled => ("Cancelled".to_string(), 1.0),
            };

            let runtime_str = match &h.runtime {
                AgentRuntime::InProcess => "In-Process".to_string(),
                AgentRuntime::DockerContainer { image, .. } => format!("Docker ({})", image),
                AgentRuntime::SSHRemote { host, .. } => format!("SSH ({})", host),
            };

            let ev_count = h.events_history.read().await.len();

            list.push(ParallelAgentInfo {
                id: h.id.clone(),
                prompt: h.task.prompt.clone(),
                mode: h.task.mode,
                status: status_str,
                progress,
                runtime: runtime_str,
                started_at: chrono::Utc::now().to_rfc3339(),
                events_count: ev_count,
            });
        }

        list
    }

    pub async fn cancel_agent(&self, agent_id: &str) -> Result<bool> {
        let map = self.agents.read().await;
        if let Some(handle) = map.get(agent_id) {
            let _ = handle.cancel_tx.send(true);
            Ok(true)
        } else {
            Err(anyhow!("Agent {} not found", agent_id))
        }
    }

    pub async fn get_events(&self, agent_id: &str) -> Result<Vec<AgentEvent>> {
        let map = self.agents.read().await;
        if let Some(handle) = map.get(agent_id) {
            let events = handle.events_history.read().await.clone();
            Ok(events)
        } else {
            Err(anyhow!("Agent {} not found", agent_id))
        }
    }
}
