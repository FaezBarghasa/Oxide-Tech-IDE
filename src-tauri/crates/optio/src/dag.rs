use petgraph::stable_graph::{StableGraph, NodeIndex};
use petgraph::algo::toposort;
use petgraph::Direction;
use std::collections::HashMap;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentType {
    Frontend,
    Backend,
    Embedded,
    DevOps,
    Database,
    Testing,
    Critic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskNode {
    pub id: Uuid,
    pub description: String,
    pub agent_type: AgentType,
    pub status: TaskStatus,
    pub dependencies: Vec<Uuid>,
    pub estimated_tokens: u64,
    pub actual_tokens: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl TaskNode {
    pub fn new(description: String, agent_type: AgentType, dependencies: Vec<Uuid>) -> Self {
        Self {
            id: Uuid::new_v4(),
            description,
            agent_type,
            status: TaskStatus::Pending,
            dependencies,
            estimated_tokens: 0,
            actual_tokens: 0,
            created_at: chrono::Utc::now(),
            started_at: None,
            completed_at: None,
        }
    }
}

#[derive(Debug)]
pub struct SwarmDag {
    pub graph: StableGraph<Uuid, ()>,
    pub node_map: HashMap<Uuid, (NodeIndex, TaskNode)>,
    pub index_to_id: HashMap<NodeIndex, Uuid>,
}

impl SwarmDag {
    pub fn new() -> Self {
        Self {
            graph: StableGraph::new(),
            node_map: HashMap::new(),
            index_to_id: HashMap::new(),
        }
    }

    pub fn add_task(&mut self, task: TaskNode) -> NodeIndex {
        let task_id = task.id;
        let node_index = self.graph.add_node(task_id);
        self.node_map.insert(task_id, (node_index, task));
        self.index_to_id.insert(node_index, task_id);
        node_index
    }

    pub fn add_dependency(&mut self, from_task_id: Uuid, to_task_id: Uuid) -> OxideResult<()> {
        let from_index = self.node_map.get(&from_task_id)
            .ok_or_else(|| OxideError::DependencyNotMet { task_id: from_task_id })?
            .0;

        let to_index = self.node_map.get(&to_task_id)
            .ok_or_else(|| OxideError::DependencyNotMet { task_id: to_task_id })?
            .0;

        self.graph.add_edge(from_index, to_index, ());

        // Update the task's dependencies list
        if let Some((_, task)) = self.node_map.get_mut(&to_task_id) {
            task.dependencies.push(from_task_id);
        }

        Ok(())
    }

    pub fn validate_and_sort(&self) -> OxideResult<Vec<Uuid>> {
        // Check for cycles using topological sort
        let sorted = toposort(&self.graph, None).map_err(|cycle| {
            let cycle_node = cycle.node_id();
            let cycle_task_id = self.index_to_id.get(&cycle_node).unwrap();
            OxideError::DagCycleError {
                cycle_description: format!("Cycle detected involving task {}", cycle_task_id),
            }
        })?;

        // Convert NodeIndex back to Uuid
        let sorted_ids: Vec<Uuid> = sorted
            .iter()
            .map(|idx| *self.index_to_id.get(idx).unwrap())
            .collect();

        Ok(sorted_ids)
    }

    pub fn get_task(&self, task_id: &Uuid) -> Option<&TaskNode> {
        self.node_map.get(task_id).map(|(_, task)| task)
    }

    pub fn get_task_mut(&mut self, task_id: &Uuid) -> Option<&mut TaskNode> {
        self.node_map.get_mut(task_id).map(|(_, task)| task)
    }

    pub fn get_ready_tasks(&self) -> Vec<Uuid> {
        // Find all tasks with status == Pending and all dependencies completed
        self.node_map
            .iter()
            .filter(|(_, (_, task))| {
                if task.status != TaskStatus::Pending {
                    return false;
                }

                // Check if all dependencies are completed
                task.dependencies.iter().all(|dep_id| {
                    self.node_map
                        .get(dep_id)
                        .map(|(_, dep_task)| dep_task.status == TaskStatus::Completed)
                        .unwrap_or(false)
                })
            })
            .map(|(id, _)| *id)
            .collect()
    }

    pub fn get_dependents(&self, task_id: &Uuid) -> Vec<Uuid> {
        let node_index = match self.node_map.get(task_id) {
            Some((idx, _)) => *idx,
            None => return Vec::new(),
        };

        self.graph
            .neighbors_directed(node_index, Direction::Outgoing)
            .filter_map(|idx| self.index_to_id.get(&idx).copied())
            .collect()
    }

    pub fn is_complete(&self) -> bool {
        self.node_map.values().all(|(_, task)| {
            task.status == TaskStatus::Completed || task.status == TaskStatus::Failed
        })
    }

    pub fn has_failures(&self) -> bool {
        self.node_map.values().any(|(_, task)| task.status == TaskStatus::Failed)
    }
}