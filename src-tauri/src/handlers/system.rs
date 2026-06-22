use std::process::Command;

#[tauri::command]
pub fn get_system_stats() -> Result<serde_json::Value, String> {
    let cpu_cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    
    let mut vram = "Unknown".to_string();
    if let Ok(output) = Command::new("nvidia-smi")
        .arg("--query-gpu=memory.free")
        .arg("--format=csv,noheader,nounits")
        .output() 
    {
        if let Ok(s) = String::from_utf8(output.stdout) {
            if let Some(line) = s.lines().next() {
                vram = format!("{} MB", line.trim());
            }
        }
    }
    
    Ok(serde_json::json!({
        "cpu_cores": cpu_cores,
        "vram_free": vram
    }))
}

#[tauri::command]
pub fn get_git_status(workspace_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(&workspace_path)
        .output()
        .map_err(|e| e.to_string())?;
    
    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}
