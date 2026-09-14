use oxide_core::{LocalHistoryEngine, LocalHistoryRevision};

#[tauri::command]
pub async fn local_history_record_snapshot(
    file_path: String,
    content: String,
    trigger_tag: String,
) -> Result<LocalHistoryRevision, String> {
    let engine = LocalHistoryEngine::get_or_init_default();
    engine
        .record_snapshot(&file_path, &content, &trigger_tag)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn local_history_get_revisions(file_path: String) -> Result<Vec<LocalHistoryRevision>, String> {
    let engine = LocalHistoryEngine::get_or_init_default();
    Ok(engine.get_revisions(&file_path))
}

#[tauri::command]
pub async fn local_history_get_revision_content(
    file_path: String,
    revision_id: String,
) -> Result<String, String> {
    let engine = LocalHistoryEngine::get_or_init_default();
    engine
        .get_revision_by_id(&file_path, &revision_id)
        .map(|r| r.content)
        .ok_or_else(|| format!("Revision {} not found for {}", revision_id, file_path))
}
