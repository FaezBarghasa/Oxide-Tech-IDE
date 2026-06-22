use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct SymbolInfo {
    pub name: String,
    pub symbol_type: String,
    pub line_number: usize,
    pub file_path: String,
}

pub struct ASTIndexState {
    pub files: Mutex<HashMap<String, String>>, // File path -> File Content
    pub symbols: Mutex<Vec<SymbolInfo>>,
}

impl ASTIndexState {
    pub fn new() -> Self {
        Self {
            files: Mutex::new(HashMap::new()),
            symbols: Mutex::new(Vec::new()),
        }
    }
}

// Scans the workspace and parses basic AST syntax nodes / signatures
fn index_workspace_dir(dir: &Path, files: &mut HashMap<String, String>, symbols: &mut Vec<SymbolInfo>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();
                if name != "node_modules" && name != "target" && name != "dist" && !name.starts_with('.') {
                    index_workspace_dir(&path, files, symbols);
                }
            } else if path.is_file() {
                let ext = path.extension().map(|e| e.to_string_lossy()).unwrap_or_default();
                if ext == "rs" || ext == "ts" || ext == "tsx" || ext == "json" || ext == "toml" {
                    if let Ok(content) = fs::read_to_string(&path) {
                        let path_str = path.to_string_lossy().into_owned();
                        
                        // Parse basic signatures
                        for (idx, line) in content.lines().enumerate() {
                            let trimmed = line.trim();
                            if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") {
                                let name = extract_name(trimmed, "fn ");
                                symbols.push(SymbolInfo {
                                    name,
                                    symbol_type: "function".to_string(),
                                    line_number: idx + 1,
                                    file_path: path_str.clone(),
                                });
                            } else if trimmed.starts_with("struct ") || trimmed.starts_with("pub struct ") {
                                let name = extract_name(trimmed, "struct ");
                                symbols.push(SymbolInfo {
                                    name,
                                    symbol_type: "struct".to_string(),
                                    line_number: idx + 1,
                                    file_path: path_str.clone(),
                                });
                            } else if trimmed.starts_with("class ") || trimmed.starts_with("export class ") {
                                let name = extract_name(trimmed, "class ");
                                symbols.push(SymbolInfo {
                                    name,
                                    symbol_type: "class".to_string(),
                                    line_number: idx + 1,
                                    file_path: path_str.clone(),
                                });
                            } else if trimmed.starts_with("interface ") || trimmed.starts_with("export interface ") {
                                let name = extract_name(trimmed, "interface ");
                                symbols.push(SymbolInfo {
                                    name,
                                    symbol_type: "interface".to_string(),
                                    line_number: idx + 1,
                                    file_path: path_str.clone(),
                                });
                            }
                        }
                        
                        files.insert(path_str, content);
                    }
                }
            }
        }
    }
}

fn extract_name(line: &str, keyword: &str) -> String {
    if let Some(idx) = line.find(keyword) {
        let after = &line[idx + keyword.len()..];
        let end = after.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(after.len());
        after[..end].to_string()
    } else {
        "unknown".to_string()
    }
}

#[tauri::command]
pub async fn trigger_workspace_indexing(
    workspace_path: String,
    state: tauri::State<'_, ASTIndexState>,
) -> Result<String, String> {
    let path = PathBuf::from(&workspace_path);
    if !path.exists() {
        return Err("Workspace path does not exist".to_string());
    }

    let mut files = HashMap::new();
    let mut symbols = Vec::new();
    
    index_workspace_dir(&path, &mut files, &mut symbols);
    
    let files_len = files.link_len_count();
    let symbols_len = symbols.len();

    let mut state_files = state.files.lock().unwrap();
    let mut state_symbols = state.symbols.lock().unwrap();
    
    *state_files = files;
    *state_symbols = symbols;

    Ok(format!("Indexed {} files, extracted {} symbols", files_len, symbols_len))
}

trait LengthCount {
    fn link_len_count(&self) -> usize;
}

impl<K, V> LengthCount for HashMap<K, V> {
    fn link_len_count(&self) -> usize {
        self.len()
    }
}

#[derive(Serialize)]
pub struct ContextFile {
    pub path: String,
    pub content: String,
    pub score: usize,
}

#[tauri::command]
pub fn get_predictive_context(
    prompt: String,
    state: tauri::State<'_, ASTIndexState>,
) -> Result<Vec<ContextFile>, String> {
    let prompt_lower = prompt.to_lowercase();
    let words: Vec<&str> = prompt_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() > 3)
        .collect();

    let symbols = state.symbols.lock().unwrap();
    let files = state.files.lock().unwrap();
    
    let mut file_scores: HashMap<String, usize> = HashMap::new();

    // Check symbol overlap
    for symbol in symbols.iter() {
        let sym_name_lower = symbol.name.to_lowercase();
        for word in &words {
            if sym_name_lower.contains(word) {
                *file_scores.entry(symbol.file_path.clone()).or_insert(0) += 5;
            }
        }
    }

    // Check content overlap
    for (path, content) in files.iter() {
        let content_lower = content.to_lowercase();
        for word in &words {
            if content_lower.contains(word) {
                *file_scores.entry(path.clone()).or_insert(0) += 1;
            }
        }
    }

    let mut ranked: Vec<(String, usize)> = file_scores.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1));

    let mut results = Vec::new();
    for (path, score) in ranked.into_iter().take(4) {
        if let Some(content) = files.get(&path) {
            results.push(ContextFile {
                path,
                content: content.clone(),
                score,
            });
        }
    }

    Ok(results)
}
