use std::collections::HashMap;
use std::process::Command;
use tokio::task;

#[tauri::command]
pub async fn proxy_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: String,
) -> Result<String, String> {
    task::spawn_blocking(move || {
        let mut cmd = Command::new("curl");
        cmd.arg("-s")
           .arg("-X")
           .arg(&method)
           .arg(&url);

        for (k, v) in headers {
            cmd.arg("-H").arg(format!("{}: {}", k, v));
        }

        if !body.is_empty() {
            cmd.arg("-d").arg(&body);
        }

        let output = cmd.output().map_err(|e| e.to_string())?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).into_owned())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).into_owned())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
