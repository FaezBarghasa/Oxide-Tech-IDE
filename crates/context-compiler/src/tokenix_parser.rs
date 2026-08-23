
use tree_sitter::{Parser, Tree, Node, TreeCursor};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use crate::errors::{OxideError, OxideResult};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub enum SymbolKind {
    Function,
    Struct,
    Enum,
    Trait,
    Impl,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedSymbol<'a> {
    pub id: Uuid,
    pub kind: SymbolKind,
    #[serde(borrow)]
    pub name: &'a str,
    #[serde(borrow)]
    pub signature: &'a str,
    pub range: (usize, usize),
    pub dependencies: Vec<String>,
}

fn get_node_text<'a>(node: &Node<'a>, source: &'a str) -> &'a str {
    node.utf8_text(source.as_bytes()).unwrap_or_default()
}

fn extract_dependencies(node: &Node, source: &str) -> Vec<String> {
    let mut deps = Vec::new();
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "type_identifier" || child.kind() == "generic_type" {
            deps.push(get_node_text(&child, source).to_string());
        }
        deps.extend(extract_dependencies(&child, source));
    }
    deps
}


pub fn parse_and_chunk<'a>(source: &'a str, language_str: &str) -> OxideResult<Vec<ParsedSymbol<'a>>> {
    let mut parser = Parser::new();
    let language = match language_str {
        "rust" => tree_sitter_rust::language(),
        // "typescript" => tree_sitter_typescript::language_typescript(),
        _ => return Err(OxideError::AstParseError {
            path: PathBuf::new(), // Placeholder
            message: format!("Unsupported language: {}", language_str),
        }),
    };
    parser.set_language(&language).map_err(|e| OxideError::AstParseError {
        path: PathBuf::new(),
        message: format!("Failed to set language: {}", e),
    })?;

    let tree = parser.parse(source, None).ok_or(OxideError::AstParseError {
        path: PathBuf::new(),
        message: "Failed to parse source code".to_string(),
    })?;

    let mut symbols = Vec::new();
    let mut cursor = tree.walk();

    fn traverse<'a>(cursor: &mut TreeCursor<'a>, source: &'a str, symbols: &mut Vec<ParsedSymbol<'a>>) {
        for node in cursor.node().children(&mut cursor.clone()) {
            let kind = match node.kind() {
                "function_item" => SymbolKind::Function,
                "struct_item" => SymbolKind::Struct,
                "enum_item" => SymbolKind::Enum,
                "trait_item" => SymbolKind::Trait,
                "impl_item" => SymbolKind::Impl,
                _ => SymbolKind::Unknown,
            };

            if kind != SymbolKind::Unknown {
                let name_node = node.child_by_field_name("name").or_else(|| {
                    // For impl blocks, the "name" is the type being implemented.
                    node.child_by_field_name("type")
                });

                if let Some(name_node) = name_node {
                    let name = get_node_text(&name_node, source);
                    let signature = get_node_text(&node, source); // The whole block for now
                    let range = (node.start_byte(), node.end_byte());
                    let dependencies = extract_dependencies(&node, source);

                    symbols.push(ParsedSymbol {
                        id: Uuid::new_v4(),
                        kind,
                        name,
                        signature,
                        range,
                        dependencies,
                    });
                }
            }
            // Recurse
            if node.child_count() > 0 {
                traverse(&mut node.walk(), source, symbols);
            }
        }
    }

    traverse(&mut cursor, source, &mut symbols);

    Ok(symbols)
}


#[cfg(test)]
mod tests {
    use super::*;

    const RUST_SOURCE: &str = r#"
use std::collections::HashMap;

struct MyStruct {
    field: i32,
}

trait MyTrait {
    fn do_something(&self, other: &MyStruct) -> bool;
}

enum MyEnum {
    Variant(String),
}

impl MyTrait for MyStruct {
    fn do_something(&self, other: &MyStruct) -> bool {
        self.field > other.field
    }
}

fn my_function(arg1: &MyStruct) -> HashMap<String, i32> {
    println!("Hello");
    HashMap::new()
}
"#;

    #[test]
    fn test_parse_rust_source() {
        let symbols = parse_and_chunk(RUST_SOURCE, "rust").unwrap();

        assert_eq!(symbols.len(), 5);

        let struct_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Struct).unwrap();
        assert_eq!(struct_symbol.name, "MyStruct");
        assert!(struct_symbol.signature.contains("field: i32"));
        // Check zero-copy by comparing pointers
        let original_ptr = RUST_SOURCE.as_ptr() as usize;
        let name_ptr = struct_symbol.name.as_ptr() as usize;
        let sig_ptr = struct_symbol.signature.as_ptr() as usize;
        assert!(name_ptr >= original_ptr && name_ptr < original_ptr + RUST_SOURCE.len());
        assert!(sig_ptr >= original_ptr && sig_ptr < original_ptr + RUST_SOURCE.len());


        let trait_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Trait).unwrap();
        assert_eq!(trait_symbol.name, "MyTrait");
        assert!(trait_symbol.dependencies.contains(&"MyStruct".to_string()));

        let enum_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Enum).unwrap();
        assert_eq!(enum_symbol.name, "MyEnum");
        assert!(enum_symbol.dependencies.contains(&"String".to_string()));

        let impl_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Impl).unwrap();
        assert_eq!(impl_symbol.name, "MyStruct"); // Name of the impl is the struct it implements for
        assert!(impl_symbol.dependencies.contains(&"MyTrait".to_string()));
        assert!(impl_symbol.dependencies.contains(&"MyStruct".to_string()));

        let fn_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Function).unwrap();
        assert_eq!(fn_symbol.name, "my_function");
        assert!(fn_symbol.dependencies.contains(&"MyStruct".to_string()));
        assert!(fn_symbol.dependencies.contains(&"HashMap<String, i32>".to_string()));
    }
}
