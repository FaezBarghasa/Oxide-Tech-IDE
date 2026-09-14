use crate::errors::{OxideError, OxideResult};
use petgraph::algo::toposort;
use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::Direction;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use uuid::Uuid;

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

impl Default for SwarmDag {
    fn default() -> Self {
        Self::new()
    }
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
        let from_index = self
            .node_map
            .get(&from_task_id)
            .ok_or(OxideError::DependencyNotMet {
                task_id: from_task_id,
            })?
            .0;

        let to_index = self
            .node_map
            .get(&to_task_id)
            .ok_or(OxideError::DependencyNotMet {
                task_id: to_task_id,
            })?
            .0;

        self.graph.add_edge(from_index, to_index, ());

        if let Some((_, task)) = self.node_map.get_mut(&to_task_id) {
            task.dependencies.push(from_task_id);
        }

        Ok(())
    }

    pub fn validate_and_sort(&self) -> OxideResult<Vec<Uuid>> {
        let sorted = toposort(&self.graph, None).map_err(|cycle| {
            let cycle_node = cycle.node_id();
            let cycle_task_id = self
                .index_to_id
                .get(&cycle_node)
                .copied()
                .unwrap_or_default();
            OxideError::DagCycleError {
                cycle_description: format!("Cycle detected involving task {}", cycle_task_id),
            }
        })?;

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
        self.node_map
            .iter()
            .filter(|(_, (_, task))| {
                if task.status != TaskStatus::Pending {
                    return false;
                }
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
}

pub struct WaveScheduler {
    pub waves: Vec<Vec<Uuid>>,
}

impl WaveScheduler {
    pub fn new(dag: &SwarmDag) -> OxideResult<Self> {
        let sorted_ids = dag.validate_and_sort()?;
        let mut in_degree: HashMap<Uuid, usize> = HashMap::new();
        for task_id in &sorted_ids {
            in_degree.insert(*task_id, 0);
        }

        for task_id in &sorted_ids {
            let dependents = dag.get_dependents(task_id);
            for dep_id in dependents {
                *in_degree.entry(dep_id).or_insert(0) += 1;
            }
        }

        let mut waves: Vec<Vec<Uuid>> = Vec::new();
        let mut queue: VecDeque<Uuid> = VecDeque::new();

        for (task_id, &degree) in &in_degree {
            if degree == 0 {
                queue.push_back(*task_id);
            }
        }

        while !queue.is_empty() {
            let mut current_wave = Vec::new();
            let mut next_queue: VecDeque<Uuid> = VecDeque::new();

            while let Some(task_id) = queue.pop_front() {
                current_wave.push(task_id);
                for dep_id in dag.get_dependents(&task_id) {
                    if let Some(degree) = in_degree.get_mut(&dep_id) {
                        *degree -= 1;
                        if *degree == 0 {
                            next_queue.push_back(dep_id);
                        }
                    }
                }
            }

            waves.push(current_wave);
            queue = next_queue;
        }

        Ok(Self { waves })
    }

    pub fn get_total_waves(&self) -> usize {
        self.waves.len()
    }

    pub fn get_wave(&self, wave_index: usize) -> Option<&Vec<Uuid>> {
        self.waves.get(wave_index)
    }

    pub fn get_max_parallelism(&self) -> usize {
        self.waves.iter().map(|w| w.len()).max().unwrap_or(0)
    }
}
