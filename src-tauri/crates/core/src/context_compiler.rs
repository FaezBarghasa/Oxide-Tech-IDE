use serde::{Deserialize, Serialize};
use crate::errors::{OxideError, OxideResult};
use syn::visit::Visit;
use syn::Item;
use quote::ToTokens;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolChunk {
    pub symbol_name: String,
    pub kind: String,
    pub start_line: usize,
    pub end_line: usize,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlicedContext {
    pub target_symbol: String,
    pub sliced_code: String,
    pub original_tokens_estimate: usize,
    pub compressed_tokens_estimate: usize,
    pub compression_ratio_pct: f32,
}

pub struct TokenixEngine;

impl TokenixEngine {
    /// Parse high-level symbol declarations
    pub fn parse_symbols(source: &str, _file_path: &str) -> OxideResult<Vec<SymbolChunk>> {
        let mut chunks = Vec::new();
        for (i, line) in source.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") || trimmed.starts_with("pub async fn ") || trimmed.starts_with("async fn ") {
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
            } else if trimmed.starts_with("enum ") || trimmed.starts_with("pub enum ") {
                let name = trimmed.split_whitespace().nth(1).unwrap_or("enum").to_string();
                chunks.push(SymbolChunk {
                    symbol_name: name,
                    kind: "enum".to_string(),
                    start_line: i + 1,
                    end_line: i + 1,
                    content: line.to_string(),
                });
            }
        }
        Ok(chunks)
    }

    /// AST-Aware Differential Semantic Slicing:
    /// Extracts the full body of target_symbol and compresses all other items to signatures/headers.
    pub fn slice_context(source: &str, target_symbol: &str) -> OxideResult<SlicedContext> {
        let parsed_file = syn::parse_file(source).map_err(|e| OxideError::IoError(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())))?;
        
        let mut sliced_output = String::with_capacity(source.len() / 2);
        
        for item in parsed_file.items {
            match item {
                Item::Fn(mut item_fn) => {
                    let fn_name = item_fn.sig.ident.to_string();
                    if fn_name == target_symbol {
                        // Full body retention for target
                        sliced_output.push_str(&item_fn.to_token_stream().to_string());
                        sliced_output.push_str("\n\n");
                    } else {
                        // Compress function to its signature only (stub body)
                        item_fn.block = syn::parse_quote!({ /* ... compressed ... */ });
                        sliced_output.push_str(&item_fn.to_token_stream().to_string());
                        sliced_output.push_str("\n\n");
                    }
                }
                Item::Struct(item_struct) => {
                    sliced_output.push_str(&item_struct.to_token_stream().to_string());
                    sliced_output.push_str("\n\n");
                }
                Item::Enum(item_enum) => {
                    sliced_output.push_str(&item_enum.to_token_stream().to_string());
                    sliced_output.push_str("\n\n");
                }
                Item::Trait(item_trait) => {
                    sliced_output.push_str(&item_trait.to_token_stream().to_string());
                    sliced_output.push_str("\n\n");
                }
                Item::Use(item_use) => {
                    sliced_output.push_str(&item_use.to_token_stream().to_string());
                    sliced_output.push_str("\n");
                }
                _ => {}
            }
        }

        let orig_tokens = source.len().saturating_div(4).max(1);
        let comp_tokens = sliced_output.len().saturating_div(4).max(1);
        let ratio = if orig_tokens > 0 {
            (1.0 - (comp_tokens as f32 / orig_tokens as f32)) * 100.0
        } else {
            0.0
        };

        Ok(SlicedContext {
            target_symbol: target_symbol.to_string(),
            sliced_code: sliced_output,
            original_tokens_estimate: orig_tokens,
            compressed_tokens_estimate: comp_tokens,
            compression_ratio_pct: ratio.clamp(0.0, 99.0),
        })
    }
}

