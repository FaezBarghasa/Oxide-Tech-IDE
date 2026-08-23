use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::mpsc;
use std::collections::HashMap;
use std::sync::Arc;
use crate::errors::{OxideError, OxideResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub result: Option<Value>,
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

pub struct McpServer {
    // In a real implementation, this would hold references to filesystem tools, etc.
}

impl McpServer {
    pub fn new() -> Self {
        McpServer {}
    }

    pub async fn handle_message(&self, raw: &str) -> OxideResult<String> {
        let request: JsonRpcRequest = serde_json::from_str(raw)
            .map_err(|e| OxideError::McpError {
                tool_name: "MCP Server".to_string(),
                message: format!("Invalid JSON-RPC request: {}", e),
            })?;

        let response = match request.method.as_str() {
            "tools/list" => self.handle_tools_list(request.id).await?,
            "tools/call" => self.handle_tools_call(request.id, request.params).await?,
            _ => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: "Method not found".to_string(),
                    data: None,
                }),
            },
        };

        serde_json::to_string(&response)
            .map_err(|e| OxideError::McpError {
                tool_name: "MCP Server".to_string(),
                message: format!("Failed to serialize response: {}", e),
            })
    }

    async fn handle_tools_list(&self, id: Option<Value>) -> OxideResult<JsonRpcResponse> {
        let tools = serde_json::json!([
            {"name": "read_file", "description": "Reads content of a file"},
            {"name": "write_file", "description": "Writes content to a file"},
            {"name": "list_directory", "description": "Lists contents of a directory"},
            // Add other exposed tools here
        ]);
        Ok(JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(tools),
            error: None,
        })
    }

    async fn handle_tools_call(&self, id: Option<Value>, params: Option<Value>) -> OxideResult<JsonRpcResponse> {
        let params = params.ok_or_else(|| OxideError::McpError {
            tool_name: "MCP Server".to_string(),
            message: "Missing params for tools/call".to_string(),
        })?;

        let tool_name = params["name"].as_str().ok_or_else(|| OxideError::McpError {
            tool_name: "MCP Server".to_string(),
            message: "Tool name not specified".to_string(),
        })?;
        let tool_args = params["args"].clone();

        let result = match tool_name {
            "read_file" => self.read_file(tool_args).await?,
            "write_file" => self.write_file(tool_args).await?,
            "list_directory" => self.list_directory(tool_args).await?,
            _ => return Ok(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: format!("Tool '{}' not found", tool_name),
                    data: None,
                }),
            }),
        };

        Ok(JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        })
    }

    async fn read_file(&self, args: Value) -> OxideResult<Value> {
        let path = args["path"].as_str().ok_or_else(|| OxideError::McpError {
            tool_name: "read_file".to_string(),
            message: "Missing 'path' argument".to_string(),
        })?;
        let content = tokio::fs::read_to_string(path).await
            .map_err(|e| OxideError::IoError(e))?;
        Ok(serde_json::json!({ "content": content }))
    }

    async fn write_file(&self, args: Value) -> OxideResult<Value> {
        let path = args["path"].as_str().ok_or_else(|| OxideError::McpError {
            tool_name: "write_file".to_string(),
            message: "Missing 'path' argument".to_string(),
        })?;
        let content = args["content"].as_str().ok_or_else(|| OxideError::McpError {
            tool_name: "write_file".to_string(),
            message: "Missing 'content' argument".to_string(),
        })?;
        tokio::fs::write(path, content).await
            .map_err(|e| OxideError::IoError(e))?;
        Ok(serde_json::json!({ "status": "success" }))
    }

    async fn list_directory(&self, args: Value) -> OxideResult<Value> {
        let path = args["path"].as_str().ok_or_else(|| OxideError::McpError {
            tool_name: "list_directory".to_string(),
            message: "Missing 'path' argument".to_string(),
        })?;
        let mut entries = tokio::fs::read_dir(path).await
            .map_err(|e| OxideError::IoError(e))?;
        let mut files = Vec::new();
        while let Some(entry) = entries.next_entry().await.map_err(|e| OxideError::IoError(e))? {
            files.push(entry.file_name().to_string_lossy().to_string());
        }
        Ok(serde_json::json!({ "files": files }))
    }

    pub async fn run_stdio(self) -> OxideResult<()> {
        let stdin = tokio::io::stdin();
        let mut reader = BufReader::new(stdin);
        let mut line = String::new();

        let stdout = tokio::io::stdout();
        let mut writer = tokio::io::BufWriter::new(stdout);

        loop {
            line.clear();
            reader.read_line(&mut line).await.map_err(|e| OxideError::IoError(e))?;
            if line.is_empty() {
                break; // EOF
            }

            match self.handle_message(&line).await {
                Ok(response) => {
                    writer.write_all(response.as_bytes()).await.map_err(|e| OxideError::IoError(e))?;
                    writer.write_all(b"\n").await.map_err(|e| OxideError::IoError(e))?;
                    writer.flush().await.map_err(|e| OxideError::IoError(e))?;
                }
                Err(e) => {
                    let error_response = JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: None, // No ID if parsing failed
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32000,
                            message: e.to_string(),
                            data: None,
                        }),
                    };
                    let response_str = serde_json::to_string(&error_response)
                        .map_err(|e| OxideError::McpError {
                            tool_name: "MCP Server".to_string(),
                            message: format!("Failed to serialize error response: {}", e),
                        })?;
                    writer.write_all(response_str.as_bytes()).await.map_err(|e| OxideError::IoError(e))?;
                    writer.write_all(b"\n").await.map_err(|e| OxideError::IoError(e))?;
                    writer.flush().await.map_err(|e| OxideError::IoError(e))?;
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_tools_list() -> OxideResult<()> {
        let server = McpServer::new();
        let request = r#"{"jsonrpc": "2.0", "method": "tools/list", "id": 1}"#;
        let response_str = server.handle_message(request).await?;
        let response: JsonRpcResponse = serde_json::from_str(&response_str).unwrap();

        assert!(response.result.is_some());
        let tools = response.result.unwrap().as_array().unwrap();
        assert!(tools.iter().any(|t| t["name"] == "read_file"));
        Ok(())
    }

    #[tokio::test]
    async fn test_read_file() -> OxideResult<()> {
        let server = McpServer::new();
        let test_file_path = "test_read_file.txt";
        tokio::fs::write(test_file_path, "hello world").await.map_err(|e| OxideError::IoError(e))?;

        let request = format!(r#"{{"jsonrpc": "2.0", "method": "tools/call", "id": 2, "params": {{"name": "read_file", "args": {{"path": "{}"}}}}}}"#, test_file_path);
        let response_str = server.handle_message(&request).await?;
        let response: JsonRpcResponse = serde_json::from_str(&response_str).unwrap();

        assert!(response.result.is_some());
        assert_eq!(response.result.unwrap()["content"], "hello world");

        tokio::fs::remove_file(test_file_path).await.map_err(|e| OxideError::IoError(e))?;
        Ok(())
    }

    #[tokio::test]
    async fn test_method_not_found() -> OxideResult<()> {
        let server = McpServer::new();
        let request = r#"{"jsonrpc": "2.0", "method": "non_existent_method", "id": 3}"#;
        let response_str = server.handle_message(request).await?;
        let response: JsonRpcResponse = serde_json::from_str(&response_str).unwrap();

        assert!(response.error.is_some());
        assert_eq!(response.error.unwrap().code, -32601);
        Ok(())
    }
}
