use deno_core::{JsRuntime, RuntimeOptions, op_sync, Extension, OpState};
use std::rc::Rc;
use std::cell::RefCell;
use std::time::Duration;
use tokio::time::timeout;
use crate::errors::{OxideError, OxideResult};

// Example of a Rust function exposed to JavaScript
fn op_log(_op_state: &mut OpState, msg: String, _bufs: &mut [deno_core::ZeroCopyBuf]) -> Result<Value, deno_core::anyhow::Error> {
    println!("JS Log: {}", msg);
    Ok(serde_json::json!(null))
}

pub struct SkillLoader {
    runtime: JsRuntime,
}

impl SkillLoader {
    pub fn new() -> Self {
        let extension = Extension::builder("oxide_skills")
            .ops(vec![
                op_sync("op_log", op_log),
            ])
            .build();

        let runtime = JsRuntime::new(RuntimeOptions {
            will_snapshot: false,
            extensions: vec![extension],
            ..Default::default()
        });
        Self { runtime }
    }

    pub async fn execute_skill(&mut self, script: &str, timeout_duration: Duration) -> OxideResult<String> {
        let script_with_ops = format!(
            r#"
            const { ops } = Deno.core.ops;
            globalThis.log = (msg) => ops.op_log(msg);
            {}
            "#,
            script
        );

        let future = self.runtime.execute_script("<skill>", &script_with_ops);

        match timeout(timeout_duration, future).await {
            Ok(Ok(value)) => {
                let scope = &mut self.runtime.handle_scope();
                let local = v8::Local::new(scope, value);
                Ok(local.to_rust_string_lossy(scope))
            },
            Ok(Err(e)) => Err(OxideError::SandboxError { message: format!("JavaScript execution error: {}", e) }),
            Err(_) => Err(OxideError::SandboxError { message: "JavaScript execution timed out".to_string() }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::Duration;

    #[tokio::test]
    async fn test_execute_skill_success() -> OxideResult<()> {
        let mut loader = SkillLoader::new();
        let script = r#"
            log("Hello from JS!");
            "Skill executed successfully";
        "#;
        let result = loader.execute_skill(script, Duration::from_secs(1)).await?;
        assert_eq!(result, "Skill executed successfully");
        Ok(())
    }

    #[tokio::test]
    async fn test_execute_skill_timeout() -> OxideResult<()> {
        let mut loader = SkillLoader::new();
        let script = r#"
            while(true) {}
        "#;
        let result = loader.execute_skill(script, Duration::from_millis(100)).await;
        assert!(matches!(result, Err(OxideError::SandboxError { message, .. }) if message.contains("timed out")));
        Ok(())
    }

    #[tokio::test]
    async fn test_execute_skill_error() -> OxideResult<()> {
        let mut loader = SkillLoader::new();
        let script = r#"
            throw new Error("Something went wrong");
        "#;
        let result = loader.execute_skill(script, Duration::from_secs(1)).await;
        assert!(matches!(result, Err(OxideError::SandboxError { message, .. }) if message.contains("Something went wrong")));
        Ok(())
    }
}
