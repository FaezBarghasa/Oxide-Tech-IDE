use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

struct WatcherState {
    _watcher: RecommendedWatcher,
    watched_path: String,
}

fn watcher_instance() -> &'static Mutex<Option<WatcherState>> {
    static INSTANCE: OnceLock<Mutex<Option<WatcherState>>> = OnceLock::new();
    INSTANCE.get_or_init(|| Mutex::new(None))
}

#[derive(Clone, Serialize)]
pub struct FsChangeEvent {
    pub paths: Vec<String>,
    pub kind: String,
}

#[tauri::command]
pub async fn fs_watch_start(app: AppHandle, path: String) -> Result<bool, String> {
    let mut guard = watcher_instance()
        .lock()
        .map_err(|_| "Watcher lock poisoned".to_string())?;
    if let Some(ref state) = *guard
        && state.watched_path == path
    {
        return Ok(true);
    }

    let target_path = path.clone();
    let app_handle = app.clone();

    let watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let paths: Vec<String> = event
                    .paths
                    .iter()
                    .filter_map(|p| {
                        let s = p.to_string_lossy().to_string();
                        // Ignore noisy or temporary build artifact directories
                        if s.contains("/target/")
                            || s.contains("/.git/objects/")
                            || s.contains("/node_modules/")
                            || s.ends_with('~')
                            || s.ends_with(".tmp")
                        {
                            None
                        } else {
                            Some(s)
                        }
                    })
                    .collect();

                if !paths.is_empty() {
                    let kind_str = format!("{:?}", event.kind);
                    let _ = app_handle.emit(
                        "fs:change",
                        FsChangeEvent {
                            paths,
                            kind: kind_str,
                        },
                    );
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to initialize notify watcher: {}", e))?;

    let mut watcher = watcher;
    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path '{}': {}", path, e))?;

    *guard = Some(WatcherState {
        _watcher: watcher,
        watched_path: target_path,
    });

    Ok(true)
}

#[tauri::command]
pub async fn fs_watch_stop() -> Result<bool, String> {
    let mut guard = watcher_instance()
        .lock()
        .map_err(|_| "Watcher lock poisoned".to_string())?;
    *guard = None;
    Ok(true)
}
