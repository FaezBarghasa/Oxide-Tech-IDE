use serde::{Deserialize, Serialize};

/// SurrealDB Schema definitions for the project semantic graph and memory
pub const SURREAL_PROJECT_SCHEMA: &str = r#"
-- Projects contain modules, modules contain items, items have relations
DEFINE TABLE project SCHEMAFULL;
DEFINE FIELD name         ON project TYPE string;
DEFINE FIELD root_path    ON project TYPE string;
DEFINE FIELD indexed_at   ON project TYPE datetime;
DEFINE FIELD git_remote   ON project TYPE option<string>;

DEFINE TABLE module SCHEMAFULL;
DEFINE FIELD name         ON module TYPE string;
DEFINE FIELD path         ON module TYPE string;
DEFINE FIELD language     ON module TYPE string;
DEFINE FIELD last_indexed ON module TYPE datetime;
DEFINE FIELD content_hash ON module TYPE string;

DEFINE TABLE item SCHEMAFULL;
DEFINE FIELD kind         ON item TYPE string;
DEFINE FIELD name         ON item TYPE string;
DEFINE FIELD signature    ON item TYPE string;
DEFINE FIELD body         ON item TYPE string;
DEFINE FIELD embedding_id ON item TYPE string;
DEFINE FIELD span         ON item TYPE object;
DEFINE FIELD module       ON item TYPE record<module>;

-- Relations
DEFINE TABLE calls        SCHEMAFULL TYPE RELATION FROM item TO item;
DEFINE TABLE imports      SCHEMAFULL TYPE RELATION FROM module TO module;
DEFINE TABLE depends      SCHEMAFULL TYPE RELATION FROM module TO module;
DEFINE TABLE implements   SCHEMAFULL TYPE RELATION FROM item TO item;
DEFINE TABLE references   SCHEMAFULL TYPE RELATION FROM item TO item;

-- Memory / agent history
DEFINE TABLE memory SCHEMAFULL;
DEFINE FIELD kind         ON memory TYPE string;
DEFINE FIELD content      ON memory TYPE string;
DEFINE FIELD embedding_id ON memory TYPE string;
DEFINE FIELD source       ON memory TYPE object;
DEFINE FIELD created_at   ON memory TYPE datetime;
DEFINE FIELD relevance    ON memory TYPE float DEFAULT 1.0;

DEFINE TABLE agent_run SCHEMAFULL;
DEFINE FIELD task         ON agent_run TYPE string;
DEFINE FIELD plan         ON agent_run TYPE array<object>;
DEFINE FIELD events       ON agent_run TYPE array<object>;
DEFINE FIELD status       ON agent_run TYPE string;
DEFINE FIELD started_at   ON agent_run TYPE datetime;
DEFINE FIELD ended_at     ON agent_run TYPE option<datetime>;
DEFINE FIELD duration_ms  ON agent_run TYPE option<int>;

-- Lock table for multi-agent graph concurrency
DEFINE TABLE lock SCHEMAFULL;
DEFINE FIELD agent        ON lock TYPE string;
DEFINE FIELD path         ON lock TYPE string;
DEFINE FIELD acquired_at  ON lock TYPE datetime;
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRecord {
    pub name: String,
    pub root_path: String,
    pub indexed_at: String,
    pub git_remote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleRecord {
    pub name: String,
    pub path: String,
    pub language: String,
    pub last_indexed: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemRecord {
    pub kind: String, // "fn" | "struct" | "enum" | "trait" | "impl" | "const"
    pub name: String,
    pub signature: String,
    pub body: String,
    pub embedding_id: String,
    pub span: ItemSpan,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemSpan {
    pub start_line: usize,
    pub start_col: usize,
    pub end_line: usize,
    pub end_col: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryRecord {
    pub id: Option<String>,
    pub kind: String, // "insight" | "decision" | "pattern" | "bug"
    pub content: String,
    pub embedding_id: Option<String>,
    pub source: Option<serde_json::Value>,
    pub created_at: String,
    pub relevance: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodePointPayload {
    pub kind: String,
    pub name: String,
    pub path: String,
    pub language: String,
    pub signature: String,
    pub span_start: usize,
    pub span_end: usize,
}
