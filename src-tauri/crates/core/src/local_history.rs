use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalHistoryRevision {
    pub id: String,
    pub file_path: String,
    pub timestamp: String,
    pub trigger_tag: String,
    pub byte_size: usize,
    pub preview: String,
    pub content: String,
}

pub struct LocalHistoryEngine {
    storage_dir: PathBuf,
    // In-memory index of file_path -> Vec<LocalHistoryRevision>
    revisions: Arc<Mutex<HashMap<String, Vec<LocalHistoryRevision>>>>,
}

fn local_history_singleton() -> &'static Mutex<Option<Arc<LocalHistoryEngine>>> {
    static ENGINE: OnceLock<Mutex<Option<Arc<LocalHistoryEngine>>>> = OnceLock::new();
    ENGINE.get_or_init(|| Mutex::new(None))
}

impl LocalHistoryEngine {
    pub fn new<P: AsRef<Path>>(storage_dir: P) -> Self {
        let path = storage_dir.as_ref().to_path_buf();
        let _ = std::fs::create_dir_all(&path);
        Self {
            storage_dir: path,
            revisions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_or_init_default() -> Arc<Self> {
        let mut guard = local_history_singleton().lock().unwrap();
        if let Some(ref engine) = *guard {
            return engine.clone();
        }
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let default_dir = PathBuf::from(home).join(".oxide").join("local_history");
        let engine = Arc::new(Self::new(default_dir));
        *guard = Some(engine.clone());
        engine
    }

    pub fn record_snapshot(
        &self,
        file_path: &str,
        content: &str,
        trigger_tag: &str,
    ) -> OxideResult<LocalHistoryRevision> {
        let mut rev_map = self
            .revisions
            .lock()
            .map_err(|_| OxideError::ExecutionError {
                code: -1,
                message: "Local history lock poisoned".to_string(),
            })?;

        let list = rev_map.entry(file_path.to_string()).or_default();

        // Avoid duplicate snapshot if content hasn't changed from the last revision
        if let Some(last) = list.last() {
            if last.content == content {
                return Ok(last.clone());
            }
        }

        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().to_rfc3339();
        let preview = content.lines().take(3).collect::<Vec<_>>().join(" ");

        let revision = LocalHistoryRevision {
            id: id.clone(),
            file_path: file_path.to_string(),
            timestamp,
            trigger_tag: trigger_tag.to_string(),
            byte_size: content.len(),
            preview,
            content: content.to_string(),
        };

        list.push(revision.clone());

        // Cap to 100 revisions per file to prevent unbounded memory growth
        if list.len() > 100 {
            list.remove(0);
        }

        // Persist to disk asynchronously / best-effort
        let file_hash = format!("{:x}", md5_hash(file_path));
        let disk_file = self.storage_dir.join(format!("{}.json", file_hash));
        if let Ok(serialized) = serde_json::to_string(list) {
            let _ = std::fs::write(disk_file, serialized);
        }

        Ok(revision)
    }

    pub fn get_revisions(&self, file_path: &str) -> Vec<LocalHistoryRevision> {
        let mut rev_map = match self.revisions.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };

        if let Some(revs) = rev_map.get(file_path) {
            return revs.clone();
        }

        // Try load from disk
        let file_hash = format!("{:x}", md5_hash(file_path));
        let disk_file = self.storage_dir.join(format!("{}.json", file_hash));
        if let Ok(data) = std::fs::read_to_string(&disk_file) {
            if let Ok(revs) = serde_json::from_str::<Vec<LocalHistoryRevision>>(&data) {
                rev_map.insert(file_path.to_string(), revs.clone());
                return revs;
            }
        }

        Vec::new()
    }

    pub fn get_revision_by_id(&self, file_path: &str, revision_id: &str) -> Option<LocalHistoryRevision> {
        let revs = self.get_revisions(file_path);
        revs.into_iter().find(|r| r.id == revision_id)
    }
}

fn md5_hash(input: &str) -> u128 {
    let mut hash: u128 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u128;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_local_history_record_and_query() {
        let temp_dir = tempfile::tempdir().unwrap();
        let engine = LocalHistoryEngine::new(temp_dir.path());

        let rev1 = engine
            .record_snapshot("/test/file.rs", "fn main() {}", "Save")
            .unwrap();
        assert_eq!(rev1.trigger_tag, "Save");

        let rev2 = engine
            .record_snapshot("/test/file.rs", "fn main() { println!(); }", "Build")
            .unwrap();
        assert_ne!(rev1.id, rev2.id);

        let list = engine.get_revisions("/test/file.rs");
        assert_eq!(list.len(), 2);
    }
}
