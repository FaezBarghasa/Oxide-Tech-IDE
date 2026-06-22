use std::path::Path;
use serde::Serialize;
use tokio::fs;
use async_recursion::async_recursion;

#[derive(Serialize)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub children: Option<Vec<FileTreeNode>>,
}

#[async_recursion]
async fn read_dir_recursive(path: &Path) -> Result<Vec<FileTreeNode>, String> {
    let mut nodes = Vec::new();
    
    if let Ok(mut entries) = fs::read_dir(path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let entry_path = entry.path();
            let name = entry_path.file_name()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_default();
            
            if name.starts_with('.') && name != ".git" {
                if name != ".env" {
                    continue;
                }
            }
            if name == "node_modules" || name == "target" || name == "dist" {
                continue;
            }

            let is_directory = entry.file_type().await.map(|ft| ft.is_dir()).unwrap_or(false);
            let children = if is_directory {
                Some(read_dir_recursive(&entry_path).await?)
            } else {
                None
            };

            nodes.push(FileTreeNode {
                name,
                path: entry_path.to_string_lossy().into_owned(),
                is_directory,
                children,
            });
        }
    }
    
    nodes.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            b.is_directory.cmp(&a.is_directory)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    
    Ok(nodes)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).await.map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, content).await.map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub async fn read_dir(path: String) -> Result<Vec<FileTreeNode>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    read_dir_recursive(p).await
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err(format!("File already exists: {}", path));
    }
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
        }
    }
    fs::write(p, "").await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err(format!("Directory already exists: {}", path));
    }
    fs::create_dir_all(p).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File/Directory does not exist: {}", path));
    }
    if p.is_dir() {
        fs::remove_dir_all(p).await.map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let old_p = Path::new(&old_path);
    let new_p = Path::new(&new_path);
    if !old_p.exists() {
        return Err(format!("Source path does not exist: {}", old_path));
    }
    if new_p.exists() {
        return Err(format!("Target path already exists: {}", new_path));
    }
    fs::rename(old_p, new_p).await.map_err(|e| e.to_string())
}
