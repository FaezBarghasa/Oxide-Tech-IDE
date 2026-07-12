use crate::dag::SwarmDag;
use uuid::Uuid;
use std::collections::{HashMap, VecDeque};

pub struct WaveScheduler {
    pub waves: Vec<Vec<Uuid>>,
}

impl WaveScheduler {
    pub fn new(dag: &SwarmDag) -> OxideResult<Self> {
        let sorted_ids = dag.validate_and_sort()?;

        // Calculate in-degree for each node
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

        // Build waves using BFS
        let mut waves: Vec<Vec<Uuid>> = Vec::new();
        let mut queue: VecDeque<Uuid> = VecDeque::new();

        // Start with nodes that have in-degree 0
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

                // Decrement in-degree of dependents
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

    pub fn estimate_total_tokens(&self, dag: &SwarmDag) -> u64 {
        self.waves
            .iter()
            .flatten()
            .filter_map(|id| dag.get_task(id))
            .map(|task| task.estimated_tokens)
            .sum()
    }
}