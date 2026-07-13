use thiserror::Error;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum OxideError {
    // AST Parsing Errors
    #[error("Failed to parse Rust file {path}: {message}")]
    AstParseError { path: PathBuf, message: String },

    #[error("Symbol not found: {symbol_name} in file {path}")]
    SymbolNotFoundError { symbol_name: String, path: PathBuf },

    // Embedding & Vector DB Errors
    #[error("Failed to initialize embedding model: {message}")]
    EmbeddingModelError { message: String },

    #[error("Qdrant operation failed: {message}")]
    QdrantError { message: String },

    // Memory (SurrealDB) Errors
    #[error("SurrealDB operation failed: {message}")]
    SurrealDbError { message: String },

    #[error("Episode not found with hash: {hash}")]
    EpisodeNotFound { hash: String },

    // Sandbox (nix) Errors
    #[error("Failed to create namespace: {message}")]
    NamespaceError { message: String },

    #[error("Cgroup configuration failed: {message}")]
    CgroupError { message: String },

    #[error("Process execution failed with exit code {code}: {stderr}")]
    ExecutionError { code: i32, stderr: String },

    #[error("Out of memory: process killed by cgroup")]
    OutOfMemoryError,

    #[error("Network access denied for sandbox")]
    NetworkAccessDenied,

    // Orchestration Errors
    #[error("DAG contains cycle: {cycle_description}")]
    DagCycleError { cycle_description: String },

    #[error("Task dependency not met for task {task_id}")]
    DependencyNotMet { task_id: Uuid },

    #[error("EOR loop exceeded maximum iterations ({max_iterations})")]
    LoopLimitExceeded { max_iterations: u32 },

    #[error("Oscillation detected: agent is stuck in a loop")]
    OscillationDetected,

    // MCP Errors
    #[error("MCP tool not found: {tool_name}")]
    McpToolNotFound { tool_name: String },

    #[error("MCP tool execution failed: {message}")]
    McpToolError { tool_name: String, message: String },

    // HTTP/3 Telemetry Errors
    #[error("QUIC connection failed: {message}")]
    QuicConnectionError { message: String },

    #[error("TLS certificate error: {message}")]
    TlsCertificateError { message: String },

    // Generic Errors
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("UUID error: {0}")]
    UuidError(#[from] uuid::Error),
}

pub type OxideResult<T> = Result<T, OxideError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = OxideError::AstParseError {
            path: PathBuf::from("test.rs"),
            message: "syntax error".to_string(),
        };
        assert!(err.to_string().contains("test.rs"));
        assert!(err.to_string().contains("syntax error"));
    }

    #[test]
    fn test_error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let oxide_err: OxideError = io_err.into();
        assert!(matches!(oxide_err, OxideError::IoError(_)));
    }

    #[test]
    fn test_result_type() {
        let result: OxideResult<i32> = Ok(42);
        assert_eq!(result.unwrap(), 42);

        let result: OxideResult<i32> = Err(OxideError::OutOfMemoryError);
        assert!(result.is_err());
    }
}
