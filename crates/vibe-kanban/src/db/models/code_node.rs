use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CodeNode {
    pub id: Uuid,
    pub file_path: String,
    pub symbol_name: String,
    pub node_type: String,
    pub line: usize,
}
