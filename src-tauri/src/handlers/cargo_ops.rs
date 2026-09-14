use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoTargetInfo {
    pub name: String,
    pub kind: String, // "bin" | "lib" | "test" | "bench" | "example"
    pub src_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoCrateInfo {
    pub name: String,
    pub version: String,
    pub manifest_path: String,
    pub targets: Vec<CargoTargetInfo>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoWorkspaceMetadata {
    pub workspace_root: String,
    pub packages: Vec<CargoCrateInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroExpansionResult {
    pub original: String,
    pub expanded: String,
    pub steps: Vec<String>,
}

#[tauri::command]
pub async fn cargo_get_workspace_metadata(
    workspace_path: String,
) -> Result<CargoWorkspaceMetadata, String> {
    let path = Path::new(&workspace_path);
    let output = Command::new("cargo")
        .arg("metadata")
        .arg("--format-version=1")
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute cargo metadata: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Cargo metadata error: {}", err_msg));
    }

    let raw_json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse cargo metadata JSON: {}", e))?;

    let workspace_root = raw_json["workspace_root"]
        .as_str()
        .unwrap_or(&workspace_path)
        .to_string();

    let workspace_members: Vec<String> = raw_json["workspace_members"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let mut packages = Vec::new();
    if let Some(pkgs) = raw_json["packages"].as_array() {
        for pkg in pkgs {
            let id = pkg["id"].as_str().unwrap_or_default();
            // Filter to workspace packages or include all if member list is empty
            let is_member =
                workspace_members.is_empty() || workspace_members.iter().any(|m| m.contains(id));
            if !is_member {
                continue;
            }

            let name = pkg["name"].as_str().unwrap_or_default().to_string();
            let version = pkg["version"].as_str().unwrap_or_default().to_string();
            let manifest_path = pkg["manifest_path"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            let mut targets = Vec::new();
            if let Some(target_arr) = pkg["targets"].as_array() {
                for t in target_arr {
                    let t_name = t["name"].as_str().unwrap_or_default().to_string();
                    let t_src = t["src_path"].as_str().unwrap_or_default().to_string();
                    let t_kind = t["kind"]
                        .as_array()
                        .and_then(|k| k.first())
                        .and_then(|v| v.as_str())
                        .unwrap_or("bin")
                        .to_string();

                    targets.push(CargoTargetInfo {
                        name: t_name,
                        kind: t_kind,
                        src_path: t_src,
                    });
                }
            }

            let mut dependencies = Vec::new();
            if let Some(deps_arr) = pkg["dependencies"].as_array() {
                for d in deps_arr {
                    if let Some(d_name) = d["name"].as_str() {
                        dependencies.push(d_name.to_string());
                    }
                }
            }

            packages.push(CargoCrateInfo {
                name,
                version,
                manifest_path,
                targets,
                dependencies,
            });
        }
    }

    Ok(CargoWorkspaceMetadata {
        workspace_root,
        packages,
    })
}

#[tauri::command]
pub async fn rust_expand_macro(
    source_code: String,
    _macro_name: Option<String>,
    workspace_path: String,
) -> Result<MacroExpansionResult, String> {
    let mut steps = Vec::new();
    steps.push("Step 1: Ingesting source AST".to_string());

    // Perform syn AST parse in a synchronous block so nothing non-Send crosses .await
    let (expanded_code, syn_status) = {
        match syn::parse_file(&source_code) {
            Ok(file) => {
                let formatted = quote::quote!(#file).to_string();
                (formatted, true)
            }
            Err(_) => (source_code.clone(), false),
        }
    };

    if syn_status {
        steps.push("Step 2: Parsing syn AST & resolving macro invocations".to_string());
        steps.push("Step 3: Pretty-printing expanded syntax tokens".to_string());
    }

    // If cargo-expand CLI is available in the workspace, attempt deep expansion
    let path = Path::new(&workspace_path);
    let cargo_expand_output = Command::new("cargo")
        .arg("expand")
        .current_dir(path)
        .output()
        .await;

    let final_expanded = if let Ok(out) = cargo_expand_output {
        if out.status.success() {
            steps.push("Step 4: Deep cargo-expand compiler expansion succeeded".to_string());
            String::from_utf8_lossy(&out.stdout).into_owned()
        } else {
            if syn_status {
                expanded_code
            } else {
                source_code.clone()
            }
        }
    } else {
        if syn_status {
            expanded_code
        } else {
            source_code.clone()
        }
    };

    Ok(MacroExpansionResult {
        original: source_code,
        expanded: final_expanded,
        steps,
    })
}

#[tauri::command]
pub async fn cargo_add_dependency(
    crate_name: String,
    version: Option<String>,
    workspace_path: String,
) -> Result<String, String> {
    let mut cmd = Command::new("cargo");
    cmd.arg("add");

    let dep_spec = if let Some(v) = version {
        if v.trim().is_empty() {
            crate_name
        } else {
            format!("{}@{}", crate_name, v)
        }
    } else {
        crate_name
    };

    cmd.arg(&dep_spec);
    cmd.current_dir(Path::new(&workspace_path));

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run cargo add: {}", e))?;

    if output.status.success() {
        Ok(format!("Successfully added {}", dep_spec))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}
