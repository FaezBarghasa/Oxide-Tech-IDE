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
        let text = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = text.lines().next() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                vram = format!("{} MB", trimmed);
            }
        }
    }

    // Read current process RSS from /proc/self/statm on Linux
    let mut process_rss_mb = 0;
    if let Ok(statm) = std::fs::read_to_string("/proc/self/statm") {
        let parts: Vec<&str> = statm.split_whitespace().collect();
        if parts.len() > 1 {
            if let Ok(rss_pages) = parts[1].parse::<u64>() {
                // Page size is typically 4096 bytes (4KB)
                process_rss_mb = (rss_pages * 4096) / (1024 * 1024);
            }
        }
    }

    Ok(serde_json::json!({
        "cpu_cores": cpu_cores,
        "vram_free": vram,
        "rss_mb": process_rss_mb
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
