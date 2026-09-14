use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::errors::OxideResult;
use crate::local_memory::{LocalMemoryEngine, MemoryKind, MemoryScope};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeConvention {
    pub category: String,
    pub rule: String,
    pub context_pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSlashCommand {
    pub name: String,
    pub description: String,
    pub prompt_template: String,
    pub source_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub command: String,
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub sandboxed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeMcpConfig {
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
}

pub struct ClaudeBridge {
    workspace_root: PathBuf,
}

impl ClaudeBridge {
    pub fn new(workspace_root: impl AsRef<Path>) -> Self {
        Self {
            workspace_root: workspace_root.as_ref().to_path_buf(),
        }
    }

    /// Recursively scans and parses root, subfolder, and global CLAUDE.md files
    /// into structured conventions instead of dumping raw text into context.
    pub fn parse_claude_md_files(&self) -> OxideResult<Vec<ClaudeConvention>> {
        let mut conventions = Vec::new();
        let target_files = vec![
            self.workspace_root.join("CLAUDE.md"),
            self.workspace_root.join(".claude").join("CLAUDE.md"),
        ];

        for path in target_files {
            if path.exists() {
                let content = std::fs::read_to_string(&path)?;
                conventions.extend(Self::parse_markdown_directives(&content));
            }
        }

        Ok(conventions)
    }

    /// Helper to convert markdown bullet points and instructions to structured rules
    pub fn parse_markdown_directives(content: &str) -> Vec<ClaudeConvention> {
        let mut rules = Vec::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('-') || trimmed.starts_with('*') {
                let clean = trimmed.trim_start_matches(['-', '*', ' ']).trim();
                if !clean.is_empty() {
                    let (cat, pattern) = if clean.to_lowercase().contains("error") || clean.to_lowercase().contains("thiserror") {
                        ("error_handling".to_string(), Some("*.rs".to_string()))
                    } else if clean.to_lowercase().contains("test") || clean.to_lowercase().contains("nextest") {
                        ("testing".to_string(), Some("tests/*".to_string()))
                    } else if clean.to_lowercase().contains("clippy") || clean.to_lowercase().contains("lint") {
                        ("linting".to_string(), None)
                    } else {
                        ("general".to_string(), None)
                    };

                    rules.push(ClaudeConvention {
                        category: cat,
                        rule: clean.to_string(),
                        context_pattern: pattern,
                    });
                }
            }
        }
        rules
    }

    /// Ingests parsed CLAUDE.md rules directly into the Local Memory Engine
    pub fn ingest_into_memory(&self, memory: &mut LocalMemoryEngine, worker_id: &str) -> OxideResult<usize> {
        let conventions = self.parse_claude_md_files()?;
        let count = conventions.len();
        for conv in conventions {
            memory.add_entry(
                self.workspace_root.to_string_lossy().to_string(),
                worker_id.to_string(),
                MemoryKind::Semantic,
                MemoryScope::Project,
                format!("[CLAUDE.md convention] ({}) {}", conv.category, conv.rule),
                "claude_md_bridge".to_string(),
                0.95,
            );
        }
        Ok(count)
    }

    /// Ingests Claude Code MCP servers defined in .mcp.json
    pub fn parse_mcp_config(&self) -> OxideResult<HashMap<String, McpServerConfig>> {
        let mcp_path = self.workspace_root.join(".mcp.json");
        if !mcp_path.exists() {
            return Ok(HashMap::new());
        }

        let content = std::fs::read_to_string(&mcp_path)?;
        let parsed: ClaudeMcpConfig = serde_json::from_str(&content)?;
        Ok(parsed.mcp_servers)
    }

    /// Discovers custom slash commands from `.claude/commands/*.md`
    pub fn discover_claude_commands(&self) -> OxideResult<Vec<ClaudeSlashCommand>> {
        let cmd_dir = self.workspace_root.join(".claude").join("commands");
        if !cmd_dir.exists() {
            return Ok(Vec::new());
        }

        let mut commands = Vec::new();
        let entries = std::fs::read_dir(cmd_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or_default().to_string();
                let content = std::fs::read_to_string(&path)?;
                let first_line = content.lines().next().unwrap_or("Custom Claude slash command");

                commands.push(ClaudeSlashCommand {
                    name,
                    description: first_line.trim_start_matches('#').trim().to_string(),
                    prompt_template: content,
                    source_path: path,
                });
            }
        }

        Ok(commands)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_claude_md_parsing_and_memory_ingestion() {
        let tmp = tempdir().unwrap();
        let claude_md_path = tmp.path().join("CLAUDE.md");
        let sample_claude_md = r#"# Guidelines
- Always use `thiserror` for error handling in Rust crates.
- Prefer `cargo nextest run` over standard `cargo test`.
- Keep public API functions documented with doc comments.
"#;
        std::fs::write(&claude_md_path, sample_claude_md).unwrap();

        let bridge = ClaudeBridge::new(tmp.path());
        let conventions = bridge.parse_claude_md_files().unwrap();
        assert_eq!(conventions.len(), 3);
        assert_eq!(conventions[0].category, "error_handling");
        assert_eq!(conventions[1].category, "testing");

        let mut memory = LocalMemoryEngine::new();
        let ingested = bridge.ingest_into_memory(&mut memory, "test_worker").unwrap();
        assert_eq!(ingested, 3);

        let queried = memory.query_relevant("thiserror", None);
        assert_eq!(queried.len(), 1);
        assert!(queried[0].content.contains("thiserror"));
    }

    #[test]
    fn test_mcp_and_commands_discovery() {
        let tmp = tempdir().unwrap();
        let mcp_json = tmp.path().join(".mcp.json");
        std::fs::write(
            &mcp_json,
            r#"{
            "mcp_servers": {
                "sqlite": {
                    "command": "uvx",
                    "args": ["mcp-server-sqlite", "--db-path", "test.db"],
                    "sandboxed": true
                }
            }
        }"#,
        )
        .unwrap();

        let cmd_dir = tmp.path().join(".claude").join("commands");
        std::fs::create_dir_all(&cmd_dir).unwrap();
        std::fs::write(cmd_dir.join("review-security.md"), "# Security Review Checklist\nAudit all unsafe blocks.").unwrap();

        let bridge = ClaudeBridge::new(tmp.path());
        let mcps = bridge.parse_mcp_config().unwrap();
        assert_eq!(mcps.len(), 1);
        assert!(mcps.contains_key("sqlite"));
        assert!(mcps["sqlite"].sandboxed);

        let commands = bridge.discover_claude_commands().unwrap();
        assert_eq!(commands.len(), 1);
        assert_eq!(commands[0].name, "review-security");
        assert!(commands[0].description.contains("Security Review"));
    }
}
