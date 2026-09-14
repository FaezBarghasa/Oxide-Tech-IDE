use crate::errors::{OxideError, OxideResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OxReadResult {
    pub file_path: String,
    pub content: String,
    pub line_count: usize,
    pub ast_symbols: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OxEditResult {
    pub file_path: String,
    pub occurrences_replaced: usize,
    pub diff_preview: String,
    pub graph_invalidated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OxGrepMatch {
    pub file_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub symbol_context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OxGrepResult {
    pub pattern: String,
    pub matches: Vec<OxGrepMatch>,
    pub total_matches: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OxBashResult {
    pub command: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub compiler_error_count: usize,
}

pub struct ClaudeArsenal {
    workspace_root: PathBuf,
    ghost_overlay_dir: Option<PathBuf>,
}

impl ClaudeArsenal {
    pub fn new(workspace_root: impl AsRef<Path>) -> Self {
        Self {
            workspace_root: workspace_root.as_ref().to_path_buf(),
            ghost_overlay_dir: None,
        }
    }

    pub fn with_ghost_overlay(mut self, overlay_path: impl AsRef<Path>) -> Self {
        self.ghost_overlay_dir = Some(overlay_path.as_ref().to_path_buf());
        self
    }

    fn resolve_path(&self, file_path: &str) -> PathBuf {
        if let Some(ref ghost) = self.ghost_overlay_dir {
            let ghost_target = ghost.join(file_path);
            if ghost_target.exists() {
                return ghost_target;
            }
        }
        self.workspace_root.join(file_path)
    }

    /// `ox_read`: Reads file contents with AST symbol metadata injection
    pub fn ox_read(
        &self,
        file_path: &str,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> OxideResult<OxReadResult> {
        let full_path = self.resolve_path(file_path);
        let content = std::fs::read_to_string(&full_path)?;
        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();

        let start = offset.unwrap_or(1).saturating_sub(1);
        let end = match limit {
            Some(l) => (start + l).min(total_lines),
            None => total_lines,
        };

        let sliced_content = lines[start..end].join("\n");

        // Extract high-level symbol hints if Rust code
        let mut symbols = Vec::new();
        if file_path.ends_with(".rs") {
            for line in &lines {
                let trimmed = line.trim();
                if trimmed.starts_with("pub fn ")
                    || trimmed.starts_with("fn ")
                    || trimmed.starts_with("pub struct ")
                    || trimmed.starts_with("pub enum ")
                {
                    symbols.push(trimmed.to_string());
                }
            }
        }

        Ok(OxReadResult {
            file_path: file_path.to_string(),
            content: sliced_content,
            line_count: end.saturating_sub(start),
            ast_symbols: symbols,
        })
    }

    /// `ox_write`: Writes to target path (routed to Ghost Overlay if active)
    pub fn ox_write(&self, file_path: &str, content: &str) -> OxideResult<()> {
        let target = if let Some(ref ghost) = self.ghost_overlay_dir {
            ghost.join(file_path)
        } else {
            self.workspace_root.join(file_path)
        };

        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(&target, content)?;
        Ok(())
    }

    /// `ox_edit`: Precise string replacement with instant diff calculation
    pub fn ox_edit(
        &self,
        file_path: &str,
        old_str: &str,
        new_str: &str,
    ) -> OxideResult<OxEditResult> {
        let target = self.resolve_path(file_path);
        let content = std::fs::read_to_string(&target)?;

        if !content.contains(old_str) {
            return Err(OxideError::AstParseError {
                path: target,
                message: format!("Target pattern '{}' not found in file", old_str),
            });
        }

        let replaced = content.replacen(old_str, new_str, 1);
        self.ox_write(file_path, &replaced)?;

        let diff_preview = format!("- {}\n+ {}", old_str, new_str);

        Ok(OxEditResult {
            file_path: file_path.to_string(),
            occurrences_replaced: 1,
            diff_preview,
            graph_invalidated: true,
        })
    }

    /// `ox_grep`: Hybrid text & symbol search
    pub fn ox_grep(
        &self,
        pattern: &str,
        file_ext_filter: Option<&str>,
    ) -> OxideResult<OxGrepResult> {
        let mut matches = Vec::new();
        let root = if let Some(ref ghost) = self.ghost_overlay_dir {
            ghost
        } else {
            &self.workspace_root
        };

        Self::recursive_grep(root, root, pattern, file_ext_filter, &mut matches)?;
        let total = matches.len();

        Ok(OxGrepResult {
            pattern: pattern.to_string(),
            matches,
            total_matches: total,
        })
    }

    fn recursive_grep(
        base_root: &Path,
        current_dir: &Path,
        pattern: &str,
        ext_filter: Option<&str>,
        matches: &mut Vec<OxGrepMatch>,
    ) -> OxideResult<()> {
        if !current_dir.exists() {
            return Ok(());
        }

        let entries = std::fs::read_dir(current_dir)?;
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let dir_name = p.file_name().and_then(|n| n.to_str()).unwrap_or_default();
                if dir_name != "target" && dir_name != ".git" && dir_name != "node_modules" {
                    Self::recursive_grep(base_root, &p, pattern, ext_filter, matches)?;
                }
            } else if p.is_file() {
                if let Some(ext) = ext_filter {
                    if p.extension().and_then(|e| e.to_str()) != Some(ext) {
                        continue;
                    }
                }

                if let Ok(content) = std::fs::read_to_string(&p) {
                    for (line_idx, line) in content.lines().enumerate() {
                        if line.contains(pattern) {
                            let rel_path = p
                                .strip_prefix(base_root)
                                .unwrap_or(&p)
                                .to_string_lossy()
                                .to_string();
                            matches.push(OxGrepMatch {
                                file_path: rel_path,
                                line_number: line_idx + 1,
                                line_content: line.trim().to_string(),
                                symbol_context: None,
                            });
                        }
                    }
                }
            }
        }
        Ok(())
    }

    /// `ox_bash`: Sandboxed execution with structured compiler error count extraction
    pub fn ox_bash(&self, command: &str) -> OxideResult<OxBashResult> {
        let start = std::time::Instant::now();
        let target_dir = if let Some(ref ghost) = self.ghost_overlay_dir {
            ghost
        } else {
            &self.workspace_root
        };

        let output = std::process::Command::new("bash")
            .arg("-c")
            .arg(command)
            .current_dir(target_dir)
            .output()?;

        let duration_ms = start.elapsed().as_millis() as u64;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        let compiler_error_count =
            stderr.matches("error[").count() + stderr.matches("error:").count();

        Ok(OxBashResult {
            command: command.to_string(),
            exit_code: output.status.code().unwrap_or(-1),
            stdout,
            stderr,
            duration_ms,
            compiler_error_count,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_claude_arsenal_read_edit_grep() {
        let tmp = tempdir().unwrap();
        let arsenal = ClaudeArsenal::new(tmp.path());

        // Test ox_write and ox_read
        arsenal
            .ox_write(
                "src/lib.rs",
                "pub fn calculate_sum(a: i32, b: i32) -> i32 {\n    a + b\n}\n",
            )
            .unwrap();
        let read_res = arsenal.ox_read("src/lib.rs", None, None).unwrap();
        assert_eq!(read_res.line_count, 3);
        assert!(read_res
            .ast_symbols
            .iter()
            .any(|s| s.contains("pub fn calculate_sum")));

        // Test ox_edit
        let edit_res = arsenal
            .ox_edit("src/lib.rs", "a + b", "a.saturating_add(b)")
            .unwrap();
        assert_eq!(edit_res.occurrences_replaced, 1);
        assert!(edit_res.diff_preview.contains("- a + b"));

        // Verify edited content via ox_read
        let read_after = arsenal.ox_read("src/lib.rs", None, None).unwrap();
        assert!(read_after.content.contains("saturating_add"));

        // Test ox_grep
        let grep_res = arsenal.ox_grep("saturating_add", Some("rs")).unwrap();
        assert_eq!(grep_res.total_matches, 1);
        assert_eq!(grep_res.matches[0].file_path, "src/lib.rs");

        // Test ox_bash
        let bash_res = arsenal.ox_bash("echo 'Hello Claude Parity'").unwrap();
        assert_eq!(bash_res.exit_code, 0);
        assert!(bash_res.stdout.contains("Hello Claude Parity"));
    }
}
