use std::collections::HashMap;
use std::path::Path;
use tree_sitter::{Parser, Tree};
use anyhow::Result;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ParsedSymbol {
    pub identifier: String,
    pub kind: String, // "class", "struct", "function", "method"
    pub start_line: usize,
    pub end_line: usize,
    pub parameters: Vec<String>,
}

pub struct TokenixParser {
    parsers: HashMap<String, Parser>,
    tree_cache: HashMap<String, Tree>,
}

impl TokenixParser {
    pub fn new() -> Result<Self> {
        let mut parsers = HashMap::new();

        let mut rust_parser = Parser::new();
        rust_parser.set_language(&tree_sitter_rust::language())?;
        parsers.insert("rust".to_string(), rust_parser);

        let mut ts_parser = Parser::new();
        ts_parser.set_language(&tree_sitter_typescript::language_typescript())?;
        parsers.insert("typescript".to_string(), ts_parser);

        let mut py_parser = Parser::new();
        py_parser.set_language(&tree_sitter_python::language())?;
        parsers.insert("python".to_string(), py_parser);

        let mut go_parser = Parser::new();
        go_parser.set_language(&tree_sitter_go::language())?;
        parsers.insert("go".to_string(), go_parser);

        let mut c_parser = Parser::new();
        c_parser.set_language(&tree_sitter_c::language())?;
        parsers.insert("c".to_string(), c_parser);

        let mut cpp_parser = Parser::new();
        cpp_parser.set_language(&tree_sitter_cpp::language())?;
        parsers.insert("cpp".to_string(), cpp_parser);

        Ok(Self {
            parsers,
            tree_cache: HashMap::new(),
        })
    }

    pub fn parse_file(&mut self, file_path: &Path, source_code: &str) -> Result<Vec<ParsedSymbol>> {
        let file_extension = file_path.extension().and_then(|s| s.to_str()).unwrap_or("");
        let lang = match file_extension {
            "rs" => "rust",
            "ts" | "tsx" => "typescript",
            "py" => "python",
            "go" => "go",
            "c" | "h" => "c",
            "cpp" | "hpp" | "cc" | "hh" => "cpp",
            _ => return Ok(Vec::new()),
        };

        let parser = self.parsers.get_mut(lang).unwrap();

        let old_tree = self.tree_cache.get(file_path.to_str().unwrap());

        let tree = parser.parse(source_code, old_tree).unwrap();

        let mut symbols = Vec::new();
        let mut cursor = tree.walk();

        self.traverse(&mut cursor, &mut symbols, source_code);

        self.tree_cache.insert(file_path.to_str().unwrap().to_string(), tree);

        Ok(symbols)
    }

    fn traverse(&self, cursor: &mut tree_sitter::TreeCursor, symbols: &mut Vec<ParsedSymbol>, source_code: &str) {
        let node = cursor.node();

        let kind = node.kind();

        if let Some(symbol) = self.extract_symbol(node, kind, source_code) {
            symbols.push(symbol);
        }

        if cursor.goto_first_child() {
            self.traverse(cursor, symbols, source_code);
            while cursor.goto_next_sibling() {
                self.traverse(cursor, symbols, source_code);
            }
            cursor.goto_parent();
        }
    }

    fn extract_symbol(&self, node: tree_sitter::Node, kind: &str, source_code: &str) -> Option<ParsedSymbol> {
        match kind {
            "function_item" | "function_declaration" => {
                let identifier = node.child_by_field_name("name")?.utf8_text(source_code.as_bytes()).ok()?.to_string();
                let parameters_node = node.child_by_field_name("parameters")?;
                let parameters = self.extract_parameters(parameters_node, source_code);

                Some(ParsedSymbol {
                    identifier,
                    kind: "function".to_string(),
                    start_line: node.start_position().row,
                    end_line: node.end_position().row,
                    parameters,
                })
            }
            "struct_item" | "class_declaration" => {
                let identifier = node.child_by_field_name("name")?.utf8_text(source_code.as_bytes()).ok()?.to_string();
                Some(ParsedSymbol {
                    identifier,
                    kind: if kind == "struct_item" { "struct".to_string() } else { "class".to_string() },
                    start_line: node.start_position().row,
                    end_line: node.end_position().row,
                    parameters: Vec::new(),
                })
            }
            "method_declaration" => {
                let identifier = node.child_by_field_name("name")?.utf8_text(source_code.as_bytes()).ok()?.to_string();
                let parameters_node = node.child_by_field_name("parameters")?;
                let parameters = self.extract_parameters(parameters_node, source_code);
                Some(ParsedSymbol {
                    identifier,
                    kind: "method".to_string(),
                    start_line: node.start_position().row,
                    end_line: node.end_position().row,
                    parameters,
                })
            }
            _ => None,
        }
    }

    fn extract_parameters(&self, parameters_node: tree_sitter::Node, source_code: &str) -> Vec<String> {
        let mut parameters = Vec::new();
        let mut cursor = parameters_node.walk();
        for child in parameters_node.children(&mut cursor) {
            if child.kind() == "parameter" || child.kind() == "required_parameter" {
                if let Some(param_text) = child.utf8_text(source_code.as_bytes()).ok() {
                    parameters.push(param_text.to_string());
                }
            }
        }
        parameters
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_parse_rust_function() -> Result<()> {
        let source = r#"
            fn my_function(a: i32, b: &str) -> bool {
                true
            }
        "#;
        let mut parser = TokenixParser::new()?;
        let symbols = parser.parse_file(&PathBuf::from("test.rs"), source)?;

        assert_eq!(symbols.len(), 1);
        let symbol = &symbols[0];
        assert_eq!(symbol.identifier, "my_function");
        assert_eq!(symbol.kind, "function");
        assert_eq!(symbol.start_line, 1);
        assert_eq!(symbol.end_line, 3);
        assert_eq!(symbol.parameters, vec!["a: i32", "b: &str"]);

        Ok(())
    }

    #[test]
    fn test_parse_rust_struct() -> Result<()> {
        let source = r#"
            struct MyStruct {
                field1: i32,
                field2: String,
            }
        "#;
        let mut parser = TokenixParser::new()?;
        let symbols = parser.parse_file(&PathBuf::from("test.rs"), source)?;

        assert_eq!(symbols.len(), 1);
        let symbol = &symbols[0];
        assert_eq!(symbol.identifier, "MyStruct");
        assert_eq!(symbol.kind, "struct");
        assert_eq!(symbol.start_line, 1);
        assert_eq!(symbol.end_line, 4);

        Ok(())
    }
}
