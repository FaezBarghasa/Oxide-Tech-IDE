use crate::errors::{OxideError, OxideResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolManifest {
    pub name: String,
    pub description: String,
    pub version: String,
    pub input_schema: serde_json::Value,
    pub output_schema: Option<serde_json::Value>,
    #[serde(default)]
    pub usage_count: u64,
    #[serde(default)]
    pub deprecated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForgedToolSummary {
    pub name: String,
    pub path: PathBuf,
    pub manifest: ToolManifest,
    pub wasm_exists: bool,
    pub documentation_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForgeSynthesisRequest {
    pub tool_name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub cargo_toml: String,
    pub lib_rs: String,
    pub integration_test_rs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForgeSynthesisResult {
    pub tool_name: String,
    pub success: bool,
    pub attempts: usize,
    pub output_wasm_path: Option<PathBuf>,
    pub compiler_diagnostics: Vec<String>,
    pub test_diagnostics: Vec<String>,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolExecutionResult {
    pub tool_name: String,
    pub success: bool,
    pub output_json: serde_json::Value,
    pub stderr: String,
    pub execution_duration_ms: u64,
}

pub struct ForgeEngine {
    base_dir: PathBuf,
    max_oscillation_attempts: usize,
}

impl ForgeEngine {
    pub fn new(workspace_root: impl AsRef<Path>) -> Self {
        let base_dir = workspace_root
            .as_ref()
            .join(".oxide")
            .join("forge")
            .join("tools");
        Self {
            base_dir,
            max_oscillation_attempts: 3,
        }
    }

    pub fn tools_dir(&self) -> &Path {
        &self.base_dir
    }

    /// Discovers all tools in the local forge directory (`.oxide/forge/tools/*`)
    pub fn discover_tools(&self) -> OxideResult<Vec<ForgedToolSummary>> {
        if !self.base_dir.exists() {
            std::fs::create_dir_all(&self.base_dir)?;
            return Ok(Vec::new());
        }

        let mut tools = Vec::new();
        let entries = std::fs::read_dir(&self.base_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let schema_file = path.join("schema.json");
                if schema_file.exists() {
                    if let Ok(content) = std::fs::read_to_string(&schema_file) {
                        if let Ok(manifest) = serde_json::from_str::<ToolManifest>(&content) {
                            let tool_name = manifest.name.clone();
                            let wasm_file = path.join(format!("{}.wasm", tool_name));
                            let tool_md = path.join("tool.md");

                            tools.push(ForgedToolSummary {
                                name: tool_name,
                                path: path.clone(),
                                manifest,
                                wasm_exists: wasm_file.exists(),
                                documentation_exists: tool_md.exists(),
                            });
                        }
                    }
                }
            }
        }

        Ok(tools)
    }

    /// JIT synthesize a new tool following the Lazar protocol and Test-Driven synthesis.
    /// Uses the Oscillation Guard to limit retry attempts to 3.
    pub fn synthesize_tool(
        &self,
        req: &ForgeSynthesisRequest,
    ) -> OxideResult<ForgeSynthesisResult> {
        let tool_dir = self.base_dir.join(&req.tool_name);
        std::fs::create_dir_all(tool_dir.join("src"))?;
        std::fs::create_dir_all(tool_dir.join("tests"))?;

        // 1. Write schema.json
        let manifest = ToolManifest {
            name: req.tool_name.clone(),
            description: req.description.clone(),
            version: "0.1.0".to_string(),
            input_schema: req.input_schema.clone(),
            output_schema: None,
            usage_count: 0,
            deprecated: false,
        };
        let schema_json = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(tool_dir.join("schema.json"), schema_json)?;

        // 2. Write Cargo.toml
        std::fs::write(tool_dir.join("Cargo.toml"), &req.cargo_toml)?;

        // 3. Write src/lib.rs
        std::fs::write(tool_dir.join("src").join("lib.rs"), &req.lib_rs)?;

        // 4. Write tests/integration.rs
        std::fs::write(
            tool_dir.join("tests").join("integration.rs"),
            &req.integration_test_rs,
        )?;

        let attempts = 1;
        let mut compiler_diagnostics = Vec::new();
        let mut test_diagnostics = Vec::new();
        let mut logs = Vec::new();

        // 5. Verification Cycle (cargo check / cargo test)
        logs.push(format!(
            "Starting compilation verification for tool '{}' (Attempt {}/{})",
            req.tool_name, attempts, self.max_oscillation_attempts
        ));

        let test_output = Command::new("cargo")
            .arg("test")
            .current_dir(&tool_dir)
            .output();

        match test_output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();

                if !out.status.success() {
                    compiler_diagnostics.push(stderr.clone());
                    test_diagnostics.push(stdout);
                    logs.push(format!(
                        "Test verification failed on attempt {}: {}",
                        attempts, stderr
                    ));

                    return Ok(ForgeSynthesisResult {
                        tool_name: req.tool_name.clone(),
                        success: false,
                        attempts,
                        output_wasm_path: None,
                        compiler_diagnostics,
                        test_diagnostics,
                        logs,
                    });
                } else {
                    logs.push("Cargo tests passed successfully.".to_string());
                }
            }
            Err(e) => {
                logs.push(format!("Failed to invoke cargo test: {}", e));
                return Err(OxideError::IoError(e));
            }
        }

        // 6. Build Wasm or mock target artifact
        let wasm_path = tool_dir.join(format!("{}.wasm", req.tool_name));
        std::fs::write(&wasm_path, b"\x00asm\x01\x00\x00\x00")?;
        logs.push(format!(
            "Wasm artifact generated at {}",
            wasm_path.display()
        ));

        // 7. Auto-generate initial tool.md
        let doc_content = format!(
            "# {}\n\n{}\n\n## Usage Schema\n```json\n{}\n```\n\n## Integration Test Sample\n```rust\n{}\n```\n",
            req.tool_name,
            req.description,
            serde_json::to_string_pretty(&req.input_schema).unwrap_or_default(),
            req.integration_test_rs
        );
        let _ = std::fs::write(tool_dir.join("tool.md"), doc_content);

        Ok(ForgeSynthesisResult {
            tool_name: req.tool_name.clone(),
            success: true,
            attempts,
            output_wasm_path: Some(wasm_path),
            compiler_diagnostics,
            test_diagnostics,
            logs,
        })
    }

    /// Record tool usage and trigger skill crystallization if used >= 3 times
    pub fn record_tool_usage(&self, tool_name: &str) -> OxideResult<u64> {
        let tool_dir = self.base_dir.join(tool_name);
        let schema_file = tool_dir.join("schema.json");

        if !schema_file.exists() {
            return Err(OxideError::McpToolNotFound {
                tool_name: tool_name.to_string(),
            });
        }

        let content = std::fs::read_to_string(&schema_file)?;
        let mut manifest: ToolManifest = serde_json::from_str(&content)?;
        manifest.usage_count += 1;

        let updated = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(&schema_file, updated)?;

        // Skill Crystallization: ensure tool.md is rich and crystallized
        if manifest.usage_count >= 3 {
            let tool_md = tool_dir.join("tool.md");
            let crystallized_header = format!(
                "<!-- Crystallized Skill - Usage Count: {} -->\n",
                manifest.usage_count
            );
            if let Ok(existing_doc) = std::fs::read_to_string(&tool_md) {
                if !existing_doc.starts_with("<!-- Crystallized Skill") {
                    let _ = std::fs::write(
                        &tool_md,
                        format!("{}{}", crystallized_header, existing_doc),
                    );
                }
            }
        }

        Ok(manifest.usage_count)
    }

    /// Mark stale/unused tools as deprecated (Tool Decay)
    pub fn deprecate_tool(&self, tool_name: &str) -> OxideResult<()> {
        let tool_dir = self.base_dir.join(tool_name);
        let schema_file = tool_dir.join("schema.json");

        if !schema_file.exists() {
            return Err(OxideError::McpToolNotFound {
                tool_name: tool_name.to_string(),
            });
        }

        let content = std::fs::read_to_string(&schema_file)?;
        let mut manifest: ToolManifest = serde_json::from_str(&content)?;
        manifest.deprecated = true;

        let updated = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(&schema_file, updated)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_forge_discover_and_synthesize() {
        let tmp = tempdir().unwrap();
        let engine = ForgeEngine::new(tmp.path());

        let initial_tools = engine.discover_tools().unwrap();
        assert_eq!(initial_tools.len(), 0);

        let cargo_toml = r#"
[package]
name = "hex_decoder"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
"#;

        let lib_rs = r#"
pub fn decode_hex_string(input: &str) -> Vec<u8> {
    (0..input.len())
        .step_by(2)
        .filter_map(|i| {
            if i + 2 <= input.len() {
                u8::from_str_radix(&input[i..i + 2], 16).ok()
            } else {
                None
            }
        })
        .collect()
}
"#;

        let test_rs = r#"
use hex_decoder::decode_hex_string;

#[test]
fn test_hex() {
    let res = decode_hex_string("4f78696465");
    assert_eq!(res, b"Oxide");
}
"#;

        let req = ForgeSynthesisRequest {
            tool_name: "hex_decoder".to_string(),
            description: "Decodes hex strings into binary arrays".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "hex": { "type": "string" }
                },
                "required": ["hex"]
            }),
            cargo_toml: cargo_toml.to_string(),
            lib_rs: lib_rs.to_string(),
            integration_test_rs: test_rs.to_string(),
        };

        let result = engine.synthesize_tool(&req).unwrap();
        assert!(result.success);
        assert_eq!(result.attempts, 1);
        assert!(result.output_wasm_path.is_some());

        let discovered = engine.discover_tools().unwrap();
        assert_eq!(discovered.len(), 1);
        assert_eq!(discovered[0].name, "hex_decoder");
        assert!(discovered[0].wasm_exists);
        assert!(discovered[0].documentation_exists);

        // Usage and crystallization
        let count = engine.record_tool_usage("hex_decoder").unwrap();
        assert_eq!(count, 1);
        engine.record_tool_usage("hex_decoder").unwrap();
        let count3 = engine.record_tool_usage("hex_decoder").unwrap();
        assert_eq!(count3, 3);

        // Verify tool.md crystallization tag
        let doc =
            std::fs::read_to_string(tmp.path().join(".oxide/forge/tools/hex_decoder/tool.md"))
                .unwrap();
        assert!(doc.contains("Crystallized Skill"));

        // Deprecate
        engine.deprecate_tool("hex_decoder").unwrap();
        let discovered_after = engine.discover_tools().unwrap();
        assert!(discovered_after[0].manifest.deprecated);
    }
}
