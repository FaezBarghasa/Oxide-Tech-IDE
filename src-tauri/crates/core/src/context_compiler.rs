use serde::{Deserialize, Serialize};
use crate::errors::OxideResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolChunk {
    pub symbol_name: String,
    pub kind: String,
    pub start_line: usize,
    pub end_line: usize,
    pub content: String,
}

pub struct TokenixEngine;

impl TokenixEngine {
    pub fn parse_symbols(source: &str, _file_path: &str) -> OxideResult<Vec<SymbolChunk>> {
        let mut chunks = Vec::new();
        for (i, line) in source.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") {
                let name = trimmed.split('(').next().unwrap_or("fn").to_string();
                chunks.push(SymbolChunk {
                    symbol_name: name,
                    kind: "function".to_string(),
                    start_line: i + 1,
                    end_line: i + 1,
                    content: line.to_string(),
                });
            } else if trimmed.starts_with("struct ") || trimmed.starts_with("pub struct ") {
                let name = trimmed.split_whitespace().nth(1).unwrap_or("struct").to_string();
                chunks.push(SymbolChunk {
                    symbol_name: name,
                    kind: "struct".to_string(),
                    start_line: i + 1,
                    end_line: i + 1,
                    content: line.to_string(),
                });
            }
        }
        Ok(chunks)
    }
}
