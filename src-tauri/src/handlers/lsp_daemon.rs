use serde_json::json;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{Mutex, oneshot};
use tokio::time::{Duration, timeout};

struct LspState {
    stdin: Arc<Mutex<ChildStdin>>,
    pending_requests: Arc<Mutex<HashMap<u64, oneshot::Sender<serde_json::Value>>>>,
    next_id: AtomicU64,
    _workspace_root: String,
    _child: Arc<Mutex<Child>>,
}

fn lsp_instance() -> &'static Mutex<Option<LspState>> {
    static INSTANCE: OnceLock<Mutex<Option<LspState>>> = OnceLock::new();
    INSTANCE.get_or_init(|| Mutex::new(None))
}

fn to_file_uri(path: &str) -> String {
    if path.starts_with("file://") {
        path.to_string()
    } else {
        let clean = path.replace('\\', "/");
        if clean.starts_with('/') {
            format!("file://{}", clean)
        } else {
            format!("file:///{}", clean)
        }
    }
}

async fn send_raw_message(
    stdin: &Arc<Mutex<ChildStdin>>,
    payload: &serde_json::Value,
) -> Result<(), String> {
    let body = serde_json::to_string(payload).map_err(|e| e.to_string())?;
    let header = format!("Content-Length: {}\r\n\r\n", body.len());
    let mut lock = stdin.lock().await;
    lock.write_all(header.as_bytes())
        .await
        .map_err(|e| format!("Failed to write LSP header: {}", e))?;
    lock.write_all(body.as_bytes())
        .await
        .map_err(|e| format!("Failed to write LSP body: {}", e))?;
    lock.flush()
        .await
        .map_err(|e| format!("Failed to flush LSP message: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn lsp_start(app: AppHandle, workspace_path: String) -> Result<bool, String> {
    let mut instance_lock = lsp_instance().lock().await;
    if instance_lock.is_some() {
        return Ok(true);
    }

    let mut cmd = Command::new("rust-analyzer");
    cmd.current_dir(&workspace_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null());

    let mut child = cmd.spawn().map_err(|e| {
        format!(
            "Failed to spawn rust-analyzer daemon: {}. Make sure it is installed in PATH.",
            e
        )
    })?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Failed to capture rust-analyzer stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture rust-analyzer stdout".to_string())?;

    let stdin_arc = Arc::new(Mutex::new(stdin));
    let pending_requests: Arc<Mutex<HashMap<u64, oneshot::Sender<serde_json::Value>>>> =
        Arc::new(Mutex::new(HashMap::new()));
    let pending_clone = pending_requests.clone();
    let app_clone = app.clone();

    // Spawn reader task
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();

        loop {
            line.clear();
            let mut content_length: Option<usize> = None;

            // Read HTTP-like headers
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => return, // EOF
                    Ok(_) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            break; // End of headers
                        }
                        if let Some(stripped) = trimmed.strip_prefix("Content-Length:") {
                            content_length = stripped.trim().parse::<usize>().ok();
                        }
                    }
                    Err(_) => return,
                }
            }

            if let Some(len) = content_length {
                let mut body_buf = vec![0u8; len];
                if reader.read_exact(&mut body_buf).await.is_err() {
                    return;
                }

                if let Ok(msg) = serde_json::from_slice::<serde_json::Value>(&body_buf) {
                    if let Some(id) = msg.get("id").and_then(|v| v.as_u64()) {
                        let mut map = pending_clone.lock().await;
                        if let Some(sender) = map.remove(&id) {
                            let _ = sender.send(msg);
                        }
                    } else if msg.get("method").and_then(|v| v.as_str())
                        == Some("textDocument/publishDiagnostics")
                        && let Some(params) = msg.get("params")
                    {
                        let _ = app_clone.emit("lsp:diagnostics", params);
                    }
                }
            }
        }
    });

    let state = LspState {
        stdin: stdin_arc.clone(),
        pending_requests: pending_requests.clone(),
        next_id: AtomicU64::new(1),
        _workspace_root: workspace_path.clone(),
        _child: Arc::new(Mutex::new(child)),
    };

    // Send LSP Initialize
    let init_id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let root_uri = to_file_uri(&workspace_path);
    let init_req = json!({
        "jsonrpc": "2.0",
        "id": init_id,
        "method": "initialize",
        "params": {
            "processId": std::process::id(),
            "rootUri": root_uri,
            "capabilities": {
                "textDocument": {
                    "completion": {
                        "completionItem": {
                            "snippetSupport": true,
                            "documentationFormat": ["markdown", "plaintext"],
                            "insertReplaceSupport": true
                        }
                    },
                    "hover": {
                        "contentFormat": ["markdown", "plaintext"]
                    },
                    "definition": {
                        "linkSupport": true
                    },
                    "inlayHint": {
                        "dynamicRegistration": true
                    },
                    "codeAction": {
                        "codeActionLiteralSupport": {
                            "codeActionKind": {
                                "valueSet": ["quickfix", "refactor", "refactor.extract", "refactor.inline", "refactor.rewrite", "source.organizeImports"]
                            }
                        }
                    }
                }
            }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(init_id, tx);
    }
    send_raw_message(&state.stdin, &init_req).await?;

    // Await init response (up to 15s)
    let _ = timeout(Duration::from_secs(15), rx).await;

    // Send initialized notification
    let initialized_notif = json!({
        "jsonrpc": "2.0",
        "method": "initialized",
        "params": {}
    });
    send_raw_message(&state.stdin, &initialized_notif).await?;

    *instance_lock = Some(state);
    Ok(true)
}

#[tauri::command]
pub async fn lsp_did_open(path: String, text: String, version: i64) -> Result<(), String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let uri = to_file_uri(&path);
    let notif = json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didOpen",
        "params": {
            "textDocument": {
                "uri": uri,
                "languageId": "rust",
                "version": version,
                "text": text
            }
        }
    });
    send_raw_message(&state.stdin, &notif).await
}

#[tauri::command]
pub async fn lsp_did_change(path: String, text: String, version: i64) -> Result<(), String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let uri = to_file_uri(&path);
    let notif = json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didChange",
        "params": {
            "textDocument": {
                "uri": uri,
                "version": version
            },
            "contentChanges": [
                { "text": text }
            ]
        }
    });
    send_raw_message(&state.stdin, &notif).await
}

#[tauri::command]
pub async fn lsp_did_save(path: String) -> Result<(), String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let uri = to_file_uri(&path);
    let notif = json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didSave",
        "params": {
            "textDocument": {
                "uri": uri
            }
        }
    });
    send_raw_message(&state.stdin, &notif).await
}

#[tauri::command]
pub async fn lsp_did_close(path: String) -> Result<(), String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let uri = to_file_uri(&path);
    let notif = json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didClose",
        "params": {
            "textDocument": {
                "uri": uri
            }
        }
    });
    send_raw_message(&state.stdin, &notif).await
}

#[tauri::command]
pub async fn lsp_completion(
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/completion",
        "params": {
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(5), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}

#[tauri::command]
pub async fn lsp_hover(
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/hover",
        "params": {
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(4), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!(null))),
        _ => Ok(json!(null)),
    }
}

#[tauri::command]
pub async fn lsp_definition(
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/definition",
        "params": {
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(5), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!(null))),
        _ => Ok(json!(null)),
    }
}

#[tauri::command]
pub async fn lsp_inlay_hints(
    path: String,
    start_line: u32,
    end_line: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/inlayHint",
        "params": {
            "textDocument": { "uri": uri },
            "range": {
                "start": { "line": start_line, "character": 0 },
                "end": { "line": end_line, "character": 0 }
            }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(4), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}

#[tauri::command]
pub async fn lsp_code_actions(
    path: String,
    start_line: u32,
    start_col: u32,
    end_line: u32,
    end_col: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/codeAction",
        "params": {
            "textDocument": { "uri": uri },
            "range": {
                "start": { "line": start_line, "character": start_col },
                "end": { "line": end_line, "character": end_col }
            },
            "context": {
                "diagnostics": []
            }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(4), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}

#[tauri::command]
pub async fn lsp_status() -> Result<bool, String> {
    let guard = lsp_instance().lock().await;
    Ok(guard.is_some())
}

#[tauri::command]
pub async fn lsp_references(
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/references",
        "params": {
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character },
            "context": { "includeDeclaration": true }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(8), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}

#[tauri::command]
pub async fn lsp_rename(
    path: String,
    line: u32,
    character: u32,
    new_name: String,
) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/rename",
        "params": {
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character },
            "newName": new_name
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(8), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!(null))),
        _ => Ok(json!(null)),
    }
}

#[tauri::command]
pub async fn lsp_workspace_symbols(query: String) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "workspace/symbol",
        "params": { "query": query }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(6), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}

#[tauri::command]
pub async fn lsp_format_document(path: String) -> Result<serde_json::Value, String> {
    let guard = lsp_instance().lock().await;
    let state = guard
        .as_ref()
        .ok_or_else(|| "LSP not started".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let uri = to_file_uri(&path);
    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "textDocument/formatting",
        "params": {
            "textDocument": { "uri": uri },
            "options": {
                "tabSize": 4,
                "insertSpaces": true
            }
        }
    });

    let (tx, rx) = oneshot::channel();
    {
        let mut map = state.pending_requests.lock().await;
        map.insert(id, tx);
    }
    send_raw_message(&state.stdin, &req).await?;

    match timeout(Duration::from_secs(10), rx).await {
        Ok(Ok(resp)) => Ok(resp.get("result").cloned().unwrap_or(json!([]))),
        _ => Ok(json!([])),
    }
}
