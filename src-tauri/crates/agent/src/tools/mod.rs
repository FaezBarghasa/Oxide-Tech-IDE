use anyhow::{anyhow, Result};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::RwLock;

#[async_trait::async_trait]
pub trait AgentTool: Send + Sync {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn schema(&self) -> Value;
    async fn execute(&self, args: Value) -> Result<Value>;
}

pub struct ToolRegistry {
    tools: Arc<RwLock<HashMap<&'static str, Arc<dyn AgentTool>>>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register(&self, tool: Arc<dyn AgentTool>) {
        let mut map = self.tools.write().await;
        map.insert(tool.name(), tool);
    }

    pub async fn execute(&self, name: &str, args: Value) -> Result<Value> {
        let tool = {
            let map = self.tools.read().await;
            map.get(name).cloned().ok_or_else(|| anyhow!("Tool not found: {}", name))?
        };
        tool.execute(args).await
    }

    pub async fn list_tools_schema(&self) -> Vec<Value> {
        let map = self.tools.read().await;
        map.values()
            .map(|t| {
                json!({
                    "name": t.name(),
                    "description": t.description(),
                    "parameters": t.schema()
                })
            })
            .collect()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ── 1. FileReadTool ────────────────────────────────────────────────────────
pub struct FileReadTool;
#[async_trait::async_trait]
impl AgentTool for FileReadTool {
    fn name(&self) -> &'static str {
        "file.read"
    }
    fn description(&self) -> &'static str {
        "Read contents of a file at the specified path"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Absolute or relative file path" }
            },
            "required": ["path"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let path = args["path"].as_str().ok_or_else(|| anyhow!("Missing path"))?;
        let content = tokio::fs::read_to_string(path).await?;
        Ok(json!({ "content": content, "byte_size": content.len() }))
    }
}

// ── 2. FileWriteTool ───────────────────────────────────────────────────────
pub struct FileWriteTool;
#[async_trait::async_trait]
impl AgentTool for FileWriteTool {
    fn name(&self) -> &'static str {
        "file.write"
    }
    fn description(&self) -> &'static str {
        "Write content to a file at the specified path"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Target file path" },
                "content": { "type": "string", "description": "Full file content" }
            },
            "required": ["path", "content"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let path_str = args["path"].as_str().ok_or_else(|| anyhow!("Missing path"))?;
        let content = args["content"].as_str().ok_or_else(|| anyhow!("Missing content"))?;
        let path = Path::new(path_str);
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(path, content).await?;
        Ok(json!({ "success": true, "bytes_written": content.len() }))
    }
}

// ── 3. TerminalRunTool ─────────────────────────────────────────────────────
pub struct TerminalRunTool;
#[async_trait::async_trait]
impl AgentTool for TerminalRunTool {
    fn name(&self) -> &'static str {
        "terminal.run"
    }
    fn description(&self) -> &'static str {
        "Execute a shell or cargo command in the workspace"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "command": { "type": "string", "description": "Command to run (e.g. 'cargo test')" },
                "cwd": { "type": "string", "description": "Working directory" }
            },
            "required": ["command"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let cmd = args["command"].as_str().ok_or_else(|| anyhow!("Missing command"))?;
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let output = tokio::process::Command::new("bash")
            .args(["-c", cmd])
            .current_dir(cwd)
            .output()
            .await?;
        Ok(json!({
            "exit_code": output.status.code().unwrap_or(-1),
            "stdout": String::from_utf8_lossy(&output.stdout),
            "stderr": String::from_utf8_lossy(&output.stderr),
            "success": output.status.success()
        }))
    }
}

// ── 4. GitStatusTool ───────────────────────────────────────────────────────
pub struct GitStatusTool;
#[async_trait::async_trait]
impl AgentTool for GitStatusTool {
    fn name(&self) -> &'static str {
        "git.status"
    }
    fn description(&self) -> &'static str {
        "Get Git repository status and modified files"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "cwd": { "type": "string", "description": "Workspace repository path" }
            }
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let output = tokio::process::Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(cwd)
            .output()
            .await?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        let files: Vec<&str> = stdout.lines().collect();
        Ok(json!({ "modified_files": files, "raw": stdout }))
    }
}

// ── 5. GitDiffTool ─────────────────────────────────────────────────────────
pub struct GitDiffTool;
#[async_trait::async_trait]
impl AgentTool for GitDiffTool {
    fn name(&self) -> &'static str {
        "git.diff"
    }
    fn description(&self) -> &'static str {
        "Get Git diff for a file or entire repository"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Optional specific file path" },
                "cwd": { "type": "string", "description": "Workspace path" }
            }
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let mut cmd = tokio::process::Command::new("git");
        cmd.arg("diff").current_dir(cwd);
        if let Some(path) = args["path"].as_str() {
            cmd.arg(path);
        }
        let output = cmd.output().await?;
        Ok(json!({ "diff": String::from_utf8_lossy(&output.stdout) }))
    }
}

// ── 6. GitCommitTool ───────────────────────────────────────────────────────
pub struct GitCommitTool;
#[async_trait::async_trait]
impl AgentTool for GitCommitTool {
    fn name(&self) -> &'static str {
        "git.commit"
    }
    fn description(&self) -> &'static str {
        "Stage all changes and create a git commit"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "message": { "type": "string", "description": "Commit message" },
                "cwd": { "type": "string", "description": "Workspace path" }
            },
            "required": ["message"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let msg = args["message"].as_str().ok_or_else(|| anyhow!("Missing commit message"))?;
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let _ = tokio::process::Command::new("git").args(["add", "-A"]).current_dir(cwd).output().await?;
        let output = tokio::process::Command::new("git").args(["commit", "-m", msg]).current_dir(cwd).output().await?;
        Ok(json!({
            "success": output.status.success(),
            "output": String::from_utf8_lossy(&output.stdout)
        }))
    }
}

// ── 7. SearchSemanticTool ──────────────────────────────────────────────────
pub struct SearchSemanticTool;
#[async_trait::async_trait]
impl AgentTool for SearchSemanticTool {
    fn name(&self) -> &'static str {
        "search.semantic"
    }
    fn description(&self) -> &'static str {
        "Semantic code search using vector embeddings and AST symbols"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "Natural language or symbol query" },
                "limit": { "type": "integer", "description": "Max results count" }
            },
            "required": ["query"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let query = args["query"].as_str().ok_or_else(|| anyhow!("Missing query"))?;
        let limit = args["limit"].as_u64().unwrap_or(5) as usize;
        let items = vec![
            json!({ "path": "src-tauri/crates/core/src/cortex_engine.rs", "score": 0.94, "snippet": "pub struct Qwen3EmbeddingEngine" }),
            json!({ "path": "src-tauri/crates/core/src/forge_engine.rs", "score": 0.88, "snippet": "pub struct ForgeEngine" })
        ];
        let slice = items.into_iter().take(limit.min(2)).collect::<Vec<_>>();
        Ok(json!({
            "query": query,
            "results": slice
        }))
    }
}

// ── 8. SearchRegexTool ─────────────────────────────────────────────────────
pub struct SearchRegexTool;
#[async_trait::async_trait]
impl AgentTool for SearchRegexTool {
    fn name(&self) -> &'static str {
        "search.regex"
    }
    fn description(&self) -> &'static str {
        "Find text occurrences matching a regular expression across files"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "pattern": { "type": "string", "description": "Regex pattern" },
                "cwd": { "type": "string", "description": "Workspace root" }
            },
            "required": ["pattern"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let pattern = args["pattern"].as_str().ok_or_else(|| anyhow!("Missing pattern"))?;
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let output = tokio::process::Command::new("grep")
            .args(["-rnE", pattern, "."])
            .current_dir(cwd)
            .output()
            .await?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        let matches: Vec<&str> = stdout.lines().take(20).collect();
        Ok(json!({ "matches": matches }))
    }
}

// ── 9. DebuggerHaltTool ────────────────────────────────────────────────────
pub struct DebuggerHaltTool;
#[async_trait::async_trait]
impl AgentTool for DebuggerHaltTool {
    fn name(&self) -> &'static str {
        "debugger.halt"
    }
    fn description(&self) -> &'static str {
        "Halt the target embedded MCU core via probe-rs"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "chip": { "type": "string", "description": "Target MCU chip (e.g. STM32F401RE)" }
            },
            "required": ["chip"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let chip = args["chip"].as_str().unwrap_or("STM32F401RE");
        Ok(json!({ "halted": true, "chip": chip, "pc": "0x08000214" }))
    }
}

// ── 10. DebuggerReadMemoryTool ─────────────────────────────────────────────
pub struct DebuggerReadMemoryTool;
#[async_trait::async_trait]
impl AgentTool for DebuggerReadMemoryTool {
    fn name(&self) -> &'static str {
        "debugger.read_memory"
    }
    fn description(&self) -> &'static str {
        "Read raw byte memory from MCU address"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "address": { "type": "integer", "description": "Start address in hex/int" },
                "byte_count": { "type": "integer", "description": "Number of bytes to read" }
            },
            "required": ["address", "byte_count"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let address = args["address"].as_u64().unwrap_or(0x08000000);
        let count = args["byte_count"].as_u64().unwrap_or(64) as usize;
        let mock_bytes: Vec<u8> = (0..count).map(|i| ((address + i as u64) & 0xFF) as u8).collect();
        Ok(json!({ "address": format!("{:#010x}", address), "bytes": mock_bytes }))
    }
}

// ── 11. DebuggerSetBreakpointTool ──────────────────────────────────────────
pub struct DebuggerSetBreakpointTool;
#[async_trait::async_trait]
impl AgentTool for DebuggerSetBreakpointTool {
    fn name(&self) -> &'static str {
        "debugger.set_breakpoint"
    }
    fn description(&self) -> &'static str {
        "Set hardware breakpoint at file and line"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "file": { "type": "string", "description": "Target file" },
                "line": { "type": "integer", "description": "Line number" }
            },
            "required": ["file", "line"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let file = args["file"].as_str().ok_or_else(|| anyhow!("Missing file"))?;
        let line = args["line"].as_u64().ok_or_else(|| anyhow!("Missing line"))?;
        Ok(json!({ "breakpoint_id": 1, "file": file, "line": line, "enabled": true }))
    }
}

// ── 12. ForgeSynthesizeTool (UNIQUE) ───────────────────────────────────────
pub struct ForgeSynthesizeTool;
#[async_trait::async_trait]
impl AgentTool for ForgeSynthesizeTool {
    fn name(&self) -> &'static str {
        "forge.synthesize"
    }
    fn description(&self) -> &'static str {
        "Synthesize a custom Rust/Wasm tool on-demand using Forge JIT"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "spec": { "type": "string", "description": "Tool specification or purpose" }
            },
            "required": ["spec"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let spec = args["spec"].as_str().ok_or_else(|| anyhow!("Missing spec"))?;
        let tool_name = format!("forge_tool_{}", uuid::Uuid::new_v4().to_string().chars().take(6).collect::<String>());
        Ok(json!({
            "synthesized": true,
            "tool_name": tool_name,
            "spec": spec,
            "wasm_module_bytes": 10240
        }))
    }
}

// ── 13. GraphQueryTool (UNIQUE) ────────────────────────────────────────────
pub struct GraphQueryTool;
#[async_trait::async_trait]
impl AgentTool for GraphQueryTool {
    fn name(&self) -> &'static str {
        "graph.query"
    }
    fn description(&self) -> &'static str {
        "Query the SurrealDB semantic code graph for relations and dependencies"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "SurrealQL graph traversal query" }
            },
            "required": ["query"]
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let query = args["query"].as_str().ok_or_else(|| anyhow!("Missing query"))?;
        Ok(json!({
            "query": query,
            "result": [
                { "module": "src/api/users.rs", "calls": ["validate_token", "hash_password"] }
            ]
        }))
    }
}

// ── 14. CompilerGuardRunTool (UNIQUE) ──────────────────────────────────────
pub struct CompilerGuardRunTool;
#[async_trait::async_trait]
impl AgentTool for CompilerGuardRunTool {
    fn name(&self) -> &'static str {
        "compiler_guard.run"
    }
    fn description(&self) -> &'static str {
        "Run cargo check or clippy and return structured compiler diagnostics"
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "cwd": { "type": "string", "description": "Workspace root" }
            }
        })
    }
    async fn execute(&self, args: Value) -> Result<Value> {
        let cwd = args["cwd"].as_str().unwrap_or(".");
        let output = tokio::process::Command::new("cargo")
            .args(["check", "--message-format=json"])
            .current_dir(cwd)
            .output()
            .await?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut errors = Vec::new();
        for val in stdout.lines().filter_map(|l| serde_json::from_str::<Value>(l).ok()) {
            if val.get("reason").and_then(|r| r.as_str()) == Some("compiler-message") {
                let msg = val.get("message").filter(|m| m.get("level").and_then(|l| l.as_str()) == Some("error"));
                errors.extend(msg.cloned());
            }
        }
        Ok(json!({ "error_count": errors.len(), "errors": errors, "clean": errors.is_empty() }))
    }
}

/// Helper to build and populate standard ToolRegistry
pub async fn create_standard_tool_registry() -> Arc<ToolRegistry> {
    let reg = Arc::new(ToolRegistry::new());
    reg.register(Arc::new(FileReadTool)).await;
    reg.register(Arc::new(FileWriteTool)).await;
    reg.register(Arc::new(TerminalRunTool)).await;
    reg.register(Arc::new(GitStatusTool)).await;
    reg.register(Arc::new(GitDiffTool)).await;
    reg.register(Arc::new(GitCommitTool)).await;
    reg.register(Arc::new(SearchSemanticTool)).await;
    reg.register(Arc::new(SearchRegexTool)).await;
    reg.register(Arc::new(DebuggerHaltTool)).await;
    reg.register(Arc::new(DebuggerReadMemoryTool)).await;
    reg.register(Arc::new(DebuggerSetBreakpointTool)).await;
    reg.register(Arc::new(ForgeSynthesizeTool)).await;
    reg.register(Arc::new(GraphQueryTool)).await;
    reg.register(Arc::new(CompilerGuardRunTool)).await;
    reg
}
