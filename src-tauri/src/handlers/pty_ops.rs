use oxide_core::PtyTerminalSession;
use serde::Serialize;
use std::collections::HashMap;
use std::io::Read;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

fn pty_registry() -> &'static Mutex<HashMap<String, Arc<Mutex<PtyTerminalSession>>>> {
    static REGISTRY: OnceLock<Mutex<HashMap<String, Arc<Mutex<PtyTerminalSession>>>>> =
        OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Clone, Serialize)]
pub struct PtyOutputPayload {
    pub session_id: String,
    pub data: String,
}

#[derive(Clone, Serialize)]
pub struct PtyExitPayload {
    pub session_id: String,
}

#[tauri::command]
pub async fn pty_spawn(
    app: AppHandle,
    session_id: String,
    shell: Option<String>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let session = PtyTerminalSession::spawn(
        shell.as_deref(),
        cwd.as_deref(),
        if cols == 0 { 80 } else { cols },
        if rows == 0 { 24 } else { rows },
    )
    .map_err(|e| format!("Failed to spawn PTY session: {}", e))?;

    let mut reader = session
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    let session_arc = Arc::new(Mutex::new(session));

    {
        let mut registry = pty_registry()
            .lock()
            .map_err(|_| "PTY registry lock poisoned".to_string())?;
        registry.insert(session_id.clone(), session_arc);
    }

    let sid_for_thread = session_id.clone();
    std::thread::Builder::new()
        .name(format!("pty-reader-{}", session_id))
        .spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        // EOF - process exited
                        let _ = app.emit(
                            "pty:exit",
                            PtyExitPayload {
                                session_id: sid_for_thread.clone(),
                            },
                        );
                        break;
                    }
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: sid_for_thread.clone(),
                                data: text,
                            },
                        );
                    }
                    Err(_) => {
                        let _ = app.emit(
                            "pty:exit",
                            PtyExitPayload {
                                session_id: sid_for_thread.clone(),
                            },
                        );
                        break;
                    }
                }
            }

            // Cleanup session from registry on exit
            if let Ok(mut registry) = pty_registry().lock() {
                registry.remove(&sid_for_thread);
            }
        })
        .map_err(|e| format!("Failed to spawn PTY reader thread: {}", e))?;

    Ok(session_id)
}

#[tauri::command]
pub async fn pty_write(session_id: String, data: String) -> Result<(), String> {
    let session_arc = {
        let registry = pty_registry()
            .lock()
            .map_err(|_| "PTY registry lock poisoned".to_string())?;
        registry
            .get(&session_id)
            .cloned()
            .ok_or_else(|| format!("PTY session not found: {}", session_id))?
    };

    let session = session_arc
        .lock()
        .map_err(|_| "PTY session lock poisoned".to_string())?;
    session
        .write_bytes(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn pty_resize(session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let session_arc = {
        let registry = pty_registry()
            .lock()
            .map_err(|_| "PTY registry lock poisoned".to_string())?;
        registry
            .get(&session_id)
            .cloned()
            .ok_or_else(|| format!("PTY session not found: {}", session_id))?
    };

    let session = session_arc
        .lock()
        .map_err(|_| "PTY session lock poisoned".to_string())?;
    session
        .resize(
            if cols == 0 { 80 } else { cols },
            if rows == 0 { 24 } else { rows },
        )
        .map_err(|e| format!("Failed to resize PTY: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn pty_kill(session_id: String) -> Result<(), String> {
    let session_opt = {
        let mut registry = pty_registry()
            .lock()
            .map_err(|_| "PTY registry lock poisoned".to_string())?;
        registry.remove(&session_id)
    };

    if let Some(session_arc) = session_opt {
        let _ = session_arc.lock().map(|mut s| s.kill());
    }

    Ok(())
}
