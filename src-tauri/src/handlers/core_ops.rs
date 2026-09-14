use oxide_core::{
    discover_cuda, CudaDiscoveryResult, SlicedContext, SymbolChunk, TokenixEngine, WorktreeManager,
    SwarmDag, TaskNode, AgentType, WaveScheduler,
    SkillsEngine, LocalSkill, HarnessEngine, VerifierType, HarnessEvidence, PrivacyGuard, InferenceRequestMetadata,
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
pub fn slice_differential_context(source: String, target_symbol: String) -> Result<SlicedContext, String> {
    TokenixEngine::slice_context(&source, &target_symbol).map_err(|e| e.to_string())
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

#[tauri::command]
pub async fn run_local_harness_check(workspace_path: String, verifier: String) -> Result<HarnessEvidence, String> {
    let engine = HarnessEngine::new(PathBuf::from(workspace_path));
    let v = match verifier.to_lowercase().as_str() {
        "clippy" | "lint" => VerifierType::Lint,
        "format" | "fmt" => VerifierType::Format,
        "test" => VerifierType::Test,
        "nextest" => VerifierType::Nextest,
        _ => VerifierType::Check,
    };
    engine.run_verifier(v).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn match_diagnostic_skills(diagnostic: String) -> Vec<LocalSkill> {
    let engine = SkillsEngine::new();
    engine.match_skills_for_diagnostic(&diagnostic).into_iter().cloned().collect()
}

#[tauri::command]
pub fn sanitize_prompt_for_remote(prompt: String, worker_id: String, project_id: String) -> (String, InferenceRequestMetadata) {
    let sanitized = PrivacyGuard::sanitize_prompt_context(&prompt);
    let meta = PrivacyGuard::build_stateless_metadata(&worker_id, &project_id);
    (sanitized, meta)
}

#[tauri::command]
pub fn discover_forged_tools(workspace_path: String) -> Result<Vec<oxide_core::ForgedToolSummary>, String> {
    let engine = oxide_core::ForgeEngine::new(PathBuf::from(workspace_path));
    engine.discover_tools().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn synthesize_forged_tool(workspace_path: String, req: oxide_core::ForgeSynthesisRequest) -> Result<oxide_core::ForgeSynthesisResult, String> {
    let engine = oxide_core::ForgeEngine::new(PathBuf::from(workspace_path));
    engine.synthesize_tool(&req).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn record_forged_tool_usage(workspace_path: String, tool_name: String) -> Result<u64, String> {
    let engine = oxide_core::ForgeEngine::new(PathBuf::from(workspace_path));
    engine.record_tool_usage(&tool_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn deprecate_forged_tool(workspace_path: String, tool_name: String) -> Result<(), String> {
    let engine = oxide_core::ForgeEngine::new(PathBuf::from(workspace_path));
    engine.deprecate_tool(&tool_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn parse_claude_conventions(workspace_path: String) -> Result<Vec<oxide_core::ClaudeConvention>, String> {
    let bridge = oxide_core::ClaudeBridge::new(PathBuf::from(workspace_path));
    bridge.parse_claude_md_files().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn discover_claude_slash_commands(workspace_path: String) -> Result<Vec<oxide_core::ClaudeSlashCommand>, String> {
    let bridge = oxide_core::ClaudeBridge::new(PathBuf::from(workspace_path));
    bridge.discover_claude_commands().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_ox_read(workspace_path: String, file_path: String, offset: Option<usize>, limit: Option<usize>) -> Result<oxide_core::OxReadResult, String> {
    let arsenal = oxide_core::ClaudeArsenal::new(PathBuf::from(workspace_path));
    arsenal.ox_read(&file_path, offset, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_ox_edit(workspace_path: String, file_path: String, old_str: String, new_str: String) -> Result<oxide_core::OxEditResult, String> {
    let arsenal = oxide_core::ClaudeArsenal::new(PathBuf::from(workspace_path));
    arsenal.ox_edit(&file_path, &old_str, &new_str).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_ox_write(workspace_path: String, file_path: String, content: String) -> Result<(), String> {
    let arsenal = oxide_core::ClaudeArsenal::new(PathBuf::from(workspace_path));
    arsenal.ox_write(&file_path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_ox_grep(workspace_path: String, pattern: String, ext_filter: Option<String>) -> Result<oxide_core::OxGrepResult, String> {
    let arsenal = oxide_core::ClaudeArsenal::new(PathBuf::from(workspace_path));
    arsenal.ox_grep(&pattern, ext_filter.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_ox_bash(workspace_path: String, command: String) -> Result<oxide_core::OxBashResult, String> {
    let arsenal = oxide_core::ClaudeArsenal::new(PathBuf::from(workspace_path));
    arsenal.ox_bash(&command).map_err(|e| e.to_string())
}


