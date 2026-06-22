use tokio::process::Command;

#[tauri::command]
pub async fn spawn_cargo_check(workspace_path: String) -> Result<String, String> {
    let output = Command::new("cargo")
        .arg("check")
        .arg("--message-format=json")
        .current_dir(&workspace_path)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    
    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn spawn_cargo_clippy(workspace_path: String) -> Result<String, String> {
    let output = Command::new("cargo")
        .arg("clippy")
        .arg("--message-format=json")
        .current_dir(&workspace_path)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    
    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_terminal_command(shell_type: Option<String>, command: String, workspace_path: String) -> Result<String, String> {
    let (shell, arg) = match shell_type.as_deref() {
        Some("bash") => ("bash", "-c"),
        Some("powershell") | Some("pwsh") => ("powershell.exe", "-Command"),
        Some("cmd") => ("cmd.exe", "/c"),
        Some("sh") => ("sh", "-c"),
        _ => {
            #[cfg(target_os = "windows")]
            let default_shell = ("powershell.exe", "-Command");
            #[cfg(not(target_os = "windows"))]
            let default_shell = ("/bin/sh", "-c");
            default_shell
        }
    };

    let output = Command::new(shell)
        .arg(arg)
        .arg(&command)
        .current_dir(&workspace_path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute process ({}): {}", shell, e))?;

    let out_str = String::from_utf8_lossy(&output.stdout).into_owned();
    let err_str = String::from_utf8_lossy(&output.stderr).into_owned();

    if output.status.success() {
        Ok(out_str)
    } else {
        Err(format!("{}\n{}", err_str, out_str))
    }
}
