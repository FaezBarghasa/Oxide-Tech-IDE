use tokio::task::JoinSet;
use tokio::sync::watch;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;
use crate::dag::{SwarmDag, TaskStatus};
use crate::loop_engine::{EorMachine, TaskContext, Harness, Agent};

pub struct SwarmExecutor {
    pub dag: Arc<tokio::sync::RwLock<SwarmDag>>,
    pub harness: Arc<dyn Harness>,
    pub agent_factory: Arc<dyn Fn(AgentType) -> Arc<dyn Agent> + Send + Sync>,
}

impl SwarmExecutor {
    pub fn new(
        dag: Arc<tokio::sync::RwLock<SwarmDag>>,
        harness: Arc<dyn Harness>,
        agent_factory: Arc<dyn Fn(AgentType) -> Arc<dyn Agent> + Send + Sync>,
    ) -> Self {
        Self {
            dag,
            harness,
            agent_factory,
        }
    }

    pub async fn execute_swarm(&self) -> OxideResult<()> {
        let mut join_set: JoinSet<OxideResult<Uuid>> = JoinSet::new();
        let mut running_tasks: HashMap<Uuid, tokio::task::AbortHandle> = HashMap::new();

        loop {
            // Get ready tasks
            let ready_tasks = {
                let dag = self.dag.read().await;
                dag.get_ready_tasks()
            };

            // Spawn tasks that are ready and not already running
            for task_id in ready_tasks {
                if running_tasks.contains_key(&task_id) {
                    continue;
                }

                let dag = self.dag.clone();
                let harness = self.harness.clone();
                let agent_factory = self.agent_factory.clone();

                let abort_handle = join_set.spawn(async move {
                    Self::execute_task(task_id, dag, harness, agent_factory).await
                });

                running_tasks.insert(task_id, abort_handle);

                // Mark task as running
                {
                    let mut dag = self.dag.write().await;
                    if let Some(task) = dag.get_task_mut(&task_id) {
                        task.status = TaskStatus::Running;
                        task.started_at = Some(chrono::Utc::now());
                    }
                }
            }

            // Wait for any task to complete
            if let Some(result) = join_set.join_next().await {
                match result {
                    Ok(Ok(completed_task_id)) => {
                        running_tasks.remove(&completed_task_id);

                        // Mark task as completed
                        {
                            let mut dag = self.dag.write().await;
                            if let Some(task) = dag.get_task_mut(&completed_task_id) {
                                task.status = TaskStatus::Completed;
                                task.completed_at = Some(chrono::Utc::now());
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        tracing::error!("Task failed: {}", e);
                        // Find which task failed and mark it
                        // In a real implementation, you'd track this more carefully
                    }
                    Err(e) => {
                        tracing::error!("Task panicked: {}", e);
                    }
                }
            }

            // Check if all tasks are complete
            let is_complete = {
                let dag = self.dag.read().await;
                dag.is_complete()
            };

            if is_complete {
                break;
            }

            // If no tasks are running and no tasks are ready, we're stuck
            if running_tasks.is_empty() {
                let ready_tasks = {
                    let dag = self.dag.read().await;
                    dag.get_ready_tasks()
                };

                if ready_tasks.is_empty() {
                    tracing::error!("Deadlock detected: no tasks running and no tasks ready");
                    return Err(OxideError::DependencyNotMet {
                        task_id: Uuid::nil(),
                    });
                }
            }
        }

        // Check for failures
        let has_failures = {
            let dag = self.dag.read().await;
            dag.has_failures()
        };

        if has_failures {
            return Err(OxideError::ExecutionError {
                code: -1,
                stderr: "One or more tasks failed".to_string(),
            });
        }

        Ok(())
    }

    async fn execute_task(
        task_id: Uuid,
        dag: Arc<tokio::sync::RwLock<SwarmDag>>,
        harness: Arc<dyn Harness>,
        agent_factory: Arc<dyn Fn(AgentType) -> Arc<dyn Agent> + Send + Sync>,
    ) -> OxideResult<Uuid> {
        let (task_context, agent_type) = {
            let dag = dag.read().await;
            let task = dag.get_task(&task_id).ok_or_else(|| OxideError::DependencyNotMet { task_id })?;

            let task_context = TaskContext {
                task_id: task.id,
                description: task.description.clone(),
                worktree_path: std::path::PathBuf::from(format!(".oxide/worktrees/{}", task_id)),
                initial_prompt: task.description.clone(),
                ast_context: String::new(),  // Would be populated by context-compiler
                episodic_memory: Vec::new(),  // Would be populated by polypore
            };

            (task_context, task.agent_type)
        };

        let agent = agent_factory(agent_type);
        let mut eor_machine = EorMachine::new(task_context, 10);

        let final_phase = eor_machine.run_loop(harness.as_ref(), agent.as_ref()).await?;

        if final_phase == crate::loop_engine::EorPhase::Converged {
            Ok(task_id)
        } else {
            // Mark task as failed
            {
                let mut dag = dag.write().await;
                if let Some(task) = dag.get_task_mut(&task_id) {
                    task.status = TaskStatus::Failed;
                    task.completed_at = Some(chrono::Utc::now());
                }
            }

            Err(OxideError::LoopLimitExceeded { max_iterations: 10 })
        }
    }
}