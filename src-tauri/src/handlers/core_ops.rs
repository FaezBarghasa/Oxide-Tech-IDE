use oxide_core::{
    discover_cuda, CudaDiscoveryResult, SymbolChunk, TokenixEngine, WorktreeManager,
    SwarmDag, TaskNode, AgentType, WaveScheduler,
};
use std::path::PathBuf;

#[tauri::command]
pub fn discover_cuda_devices() -> CudaDiscoveryResult {
    discover_cuda()
}

#[tauri::command]
pub fn parse_source_symbols(source: String, file_path: String) -> Result<Vec<SymbolChunk>, String> {
    TokenixEngine::parse_symbols(&source, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_task_worktree(repo_path: String, task_id: String, branch_name: String) -> Result<String, String> {
    let manager = WorktreeManager::new(PathBuf::from(repo_path));
    let target = manager.create_task_worktree(&task_id, &branch_name).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn validate_swarm_dag_tasks(task_descriptions: Vec<(String, String)>) -> Result<Vec<String>, String> {
    let mut dag = SwarmDag::new();
    for (desc, agent_type_str) in task_descriptions {
        let agent_type = match agent_type_str.to_lowercase().as_str() {
            "frontend" => AgentType::Frontend,
            "embedded" => AgentType::Embedded,
            "devops" => AgentType::DevOps,
            "critic" => AgentType::Critic,
            _ => AgentType::Backend,
        };
        let task = TaskNode::new(desc, agent_type, vec![]);
        dag.add_task(task);
    }

    let sorted = dag.validate_and_sort().map_err(|e| e.to_string())?;
    let scheduler = WaveScheduler::new(&dag).map_err(|e| e.to_string())?;
    
    Ok(vec![
        format!("Total Waves: {}", scheduler.get_total_waves()),
        format!("Max Parallelism: {}", scheduler.get_max_parallelism()),
        format!("Sorted Task Count: {}", sorted.len()),
    ])
}
