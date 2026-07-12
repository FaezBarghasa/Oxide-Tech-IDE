use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AstNode {
    pub id: i32,
    pub file_path: String,
    pub node_type: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AstEdge {
    pub from_node_id: i32,
    pub to_node_id: i32,
    pub edge_type: String,
}
