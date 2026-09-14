use std::fs;
use std::path::PathBuf;

fn get_oxide_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Failed to determine user home directory".to_string())?;

    let oxide_dir = PathBuf::from(home).join(".oxide");
    if !oxide_dir.exists() {
        fs::create_dir_all(&oxide_dir)
            .map_err(|e| format!("Failed to create .oxide directory: {}", e))?;
    }
    Ok(oxide_dir)
}

#[tauri::command]
pub fn save_ide_layout(layout_json: String) -> Result<(), String> {
    let dir = get_oxide_dir()?;
    let layout_file = dir.join("layout.json");
    fs::write(layout_file, layout_json)
        .map_err(|e| format!("Failed to save layout configuration: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn load_ide_layout() -> Result<String, String> {
    let dir = get_oxide_dir()?;
    let layout_file = dir.join("layout.json");
    if !layout_file.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(layout_file)
        .map_err(|e| format!("Failed to read layout configuration: {}", e))
}

#[tauri::command]
pub fn save_user_keymap(keymap_json: String) -> Result<(), String> {
    let dir = get_oxide_dir()?;
    let keymaps_dir = dir.join("keymaps");
    if !keymaps_dir.exists() {
        fs::create_dir_all(&keymaps_dir)
            .map_err(|e| format!("Failed to create keymaps directory: {}", e))?;
    }
    let keymap_file = keymaps_dir.join("user.json");
    fs::write(keymap_file, keymap_json)
        .map_err(|e| format!("Failed to save keymap configuration: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn load_user_keymap() -> Result<String, String> {
    let dir = get_oxide_dir()?;
    let keymap_file = dir.join("keymaps").join("user.json");
    if !keymap_file.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(keymap_file)
        .map_err(|e| format!("Failed to read keymap configuration: {}", e))
}
