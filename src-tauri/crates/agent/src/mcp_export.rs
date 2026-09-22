use crate::engine::AgentEngine;
use crate::events::*;
use crate::tools::ToolRegistry;
use anyhow::Result;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct AgentMcpBridge {
    engine: Arc<AgentEngine>,
    tools: Arc<ToolRegistry>,
}

impl AgentMcpBridge {
    pub fn new(engine: Arc<AgentEngine>, tools: Arc<ToolRegistry>) -> Self {
        Self { engine, tools }
    }

    pub async fn handle_tool_call(&self, tool_name: &str, args: Value) -> Result<Value> {
        match tool_name {
            "agent_execute" => {
                let task_prompt = args["task"].as_str().unwrap_or("").to_string();
                let mode_str = args.get("mode").and_then(|m| m.as_str()).unwrap_or("plan");
                let mode = match mode_str {
                    "yolo" => AgentMode::Yolo,
                    "ask" => AgentMode::Ask,
                    _ => AgentMode::Plan,
                };

                let task = AgentTask {
                    id: uuid::Uuid::new_v4().to_string(),
                    prompt: task_prompt,
                    mode,
                    context_hints: Vec::new(),
                    workspace_path: ".".to_string(),
                    token_budget: Some(30_000),
                };

                let (event_tx, _) = tokio::sync::broadcast::channel(64);
                let result = self.engine.run(task, event_tx).await?;
                Ok(serde_json::to_value(result)?)
            }
            "graph_query" => {
                let query = args["query"].as_str().unwrap_or("").to_string();
                self.tools.execute("graph.query", json!({ "query": query })).await
            }
            "semantic_search" => {
                let query = args["query"].as_str().unwrap_or("").to_string();
                let limit = args.get("limit").and_then(|l| l.as_u64()).unwrap_or(5);
                self.tools.execute("search.semantic", json!({ "query": query, "limit": limit })).await
            }
            "forge_synthesize" => {
                let spec = args["spec"].as_str().unwrap_or("").to_string();
                self.tools.execute("forge.synthesize", json!({ "spec": spec })).await
            }
            _ => self.tools.execute(tool_name, args).await,
        }
    }
}
