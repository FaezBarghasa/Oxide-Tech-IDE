
use crossbeam_deque::{Injector, Stealer, Worker};
use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::Direction;
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;
use crate::errors::{OxideError, OxideResult};
use dashmap::DashMap;

// Assuming sandbox module is in the same crate or accessible
use crate::sandbox::{execute_isolated, ExecutionResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskState {
    Pending,
    Running,
    Completed,
    Failed,
}

impl From<u8> for TaskState {
    fn from(val: u8) -> Self {
        match val {
            0 => TaskState::Pending,
            1 => TaskState::Running,
            2 => TaskState::Completed,
            3 => TaskState::Failed,
            _ => panic!("Invalid TaskState value"),
        }
    }
}

pub struct TaskNode {
    id: Uuid,
    name: String,
    // Command to execute
    command: Vec<String>,
}

pub struct SwarmExecutor {
    dag: Arc<StableGraph<TaskNode, ()>>,
    task_states: Arc<DashMap<NodeIndex, AtomicU8>>,
    injector: Arc<Injector<NodeIndex>>,
}

impl SwarmExecutor {
    pub fn new(dag: StableGraph<TaskNode, ()>) -> Self {
        let task_states = Arc::new(DashMap::new());
        for node_idx in dag.node_indices() {
            task_states.insert(node_idx, AtomicU8::new(TaskState::Pending as u8));
        }

        Self {
            dag: Arc::new(dag),
            task_states,
            injector: Arc::new(Injector::new()),
        }
    }

    pub async fn execute_all(&self) -> OxideResult<()> {
        // Initially populate the injector queue with root nodes
        for node_idx in self.dag.node_indices() {
            if self.dag.neighbors_directed(node_idx, Direction::Incoming).count() == 0 {
                self.injector.push(node_idx);
            }
        }

        let num_workers = num_cpus::get();
        let mut worker_handles = Vec::new();

        for i in 0..num_workers {
            let worker = Worker::new_fifo();
            let stealer = self.injector.stealer();
            let dag = Arc::clone(&self.dag);
            let task_states = Arc::clone(&self.task_states);
            let injector = Arc::clone(&self.injector);

            worker_handles.push(tokio::spawn(async move {
                loop {
                    let task = Self::find_task(&worker, &stealer);
                    match task {
                        Some(task_idx) => {
                            if Self::can_run(&dag, &task_states, task_idx) {
                                // Mark as running
                                task_states.get(&task_idx).unwrap().store(TaskState::Running as u8, Ordering::SeqCst);

                                // EOR Loop
                                let result = Self::run_eor_loop(task_idx, &dag).await;

                                let final_state = if result.is_ok() { TaskState::Completed } else { TaskState::Failed };
                                task_states.get(&task_idx).unwrap().store(final_state as u8, Ordering::SeqCst);

                                if final_state == TaskState::Completed {
                                    // Add dependents to the queue
                                    for dependent in dag.neighbors_directed(task_idx, Direction::Outgoing) {
                                        injector.push(dependent);
                                    }
                                }
                            } else {
                                // If it can't run yet, push it back to be re-evaluated later
                                injector.push(task_idx);
                                // Yield to prevent busy-waiting on a task that's not ready
                                tokio::task::yield_now().await;
                            }
                        }
                        None => {
                            // No tasks found, check if we are done
                            if task_states.iter().all(|entry| {
                                let state: TaskState = (*entry.value()).load(Ordering::SeqCst).into();
                                state == TaskState::Completed || state == TaskState::Failed
                            }) {
                                break; // All tasks are processed
                            }
                            // Wait a bit before trying to steal again
                            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                        }
                    }
                }
            }));
        }

        for handle in worker_handles {
            handle.await.unwrap();
        }

        // Check for any failed tasks
        if self.task_states.iter().any(|entry| (*entry.value()).load(Ordering::SeqCst) == TaskState::Failed as u8) {
            return Err(OxideError::DagCycleError { description: "One or more tasks failed".to_string() });
        }

        Ok(())
    }

    fn find_task(worker: &Worker<NodeIndex>, stealer: &Stealer<NodeIndex>) -> Option<NodeIndex> {
        worker.pop().or_else(|| {
            std::iter::repeat_with(|| stealer.steal_batch_and_pop(worker))
                .find(|s| !s.is_retry())
                .and_then(|s| s.success())
        })
    }

    fn can_run(dag: &Arc<StableGraph<TaskNode, ()>>, states: &Arc<DashMap<NodeIndex, AtomicU8>>, task_idx: NodeIndex) -> bool {
        dag.neighbors_directed(task_idx, Direction::Incoming)
            .all(|dep_idx| {
                states.get(&dep_idx).map_or(false, |state| {
                    let s: TaskState = state.load(Ordering::SeqCst).into();
                    s == TaskState::Completed
                })
            })
    }

    async fn run_eor_loop(task_idx: NodeIndex, dag: &Arc<StableGraph<TaskNode, ()>>) -> OxideResult<()> {
        const MAX_ITERATIONS: u8 = 3;
        let task_node = &dag[task_idx];
        let mut last_error: Option<String> = None;

        for i in 0..MAX_ITERATIONS {
            let cmd: Vec<&str> = task_node.command.iter().map(|s| s.as_str()).collect();
            let result = execute_isolated(&cmd, &[]).await;

            match result {
                Ok(exec_result) if exec_result.exit_code == 0 => {
                    return Ok(()); // Success
                }
                Ok(exec_result) => {
                    let stderr = String::from_utf8_lossy(&exec_result.stderr).to_string();
                    last_error = Some(format!("Attempt {} failed with exit code {}: {}", i + 1, exec_result.exit_code, stderr));
                    // In a real scenario, we would format a reflection prompt here.
                    // For now, we just retry.
                }
                Err(e) => {
                    last_error = Some(format!("Attempt {} failed to execute: {}", i + 1, e));
                }
            }
            // Small delay before retrying
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }

        Err(OxideError::SandboxError {
            message: last_error.unwrap_or_else(|| "EOR loop failed after max iterations".to_string()),
        })
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_diamond_dag_execution() {
        let mut dag = StableGraph::new();
        let a = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "A".into(), command: vec!["echo".into(), "A".into()] });
        let b = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "B".into(), command: vec!["echo".into(), "B".into()] });
        let c = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "C".into(), command: vec!["echo".into(), "C".into()] });
        let d = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "D".into(), command: vec!["echo".into(), "D".into()] });

        dag.add_edge(a, b, ());
        dag.add_edge(a, c, ());
        dag.add_edge(b, d, ());
        dag.add_edge(c, d, ());

        let executor = SwarmExecutor::new(dag);
        let result = executor.execute_all().await;

        assert!(result.is_ok());

        // Verify all tasks are completed
        for idx in executor.dag.node_indices() {
            let state: TaskState = executor.task_states.get(&idx).unwrap().load(Ordering::SeqCst).into();
            assert_eq!(state, TaskState::Completed);
        }
    }

    #[tokio::test]
    async fn test_failed_task_propagation() {
        let mut dag = StableGraph::new();
        let a = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "A".into(), command: vec!["sh".into(), "-c".into(), "exit 1".into()] });
        let b = dag.add_node(TaskNode { id: Uuid::new_v4(), name: "B".into(), command: vec!["echo".into(), "B".into()] });
        dag.add_edge(a, b, ());

        let executor = SwarmExecutor::new(dag);
        let result = executor.execute_all().await;

        assert!(result.is_err());

        let state_a: TaskState = executor.task_states.get(&a).unwrap().load(Ordering::SeqCst).into();
        assert_eq!(state_a, TaskState::Failed);

        // B should not have run because its dependency failed
        let state_b: TaskState = executor.task_states.get(&b).unwrap().load(Ordering::SeqCst).into();
        assert_eq!(state_b, TaskState::Pending);
    }
}
