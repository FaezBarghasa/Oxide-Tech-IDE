use std::collections::HashMap;
use tree_sitter::{Parser, Tree, Node};
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
    trees: HashMap<String, Tree>,
}

impl TokenixParser {
    pub fn new() -> Self {
        Self {
            parsers: HashMap::new(),
            trees: HashMap::new(),
        }
    }

    fn get_parser(&mut self, language: &str) -> Result<&mut Parser> {
        if !self.parsers.contains_key(language) {
            let mut parser = Parser::new();
            let lang = match language {
                "rust" => tree_sitter_rust::language(),
                // Add other languages here
                _ => return Err(anyhow::anyhow!("Unsupported language")),
            };
            parser.set_language(&lang)?;
            self.parsers.insert(language.to_string(), parser);
        }
        Ok(self.parsers.get_mut(language).unwrap())
    }

    pub fn parse_file(&mut self, file_path: &str, source_code: &str, language: &str) -> Result<Vec<ParsedSymbol>> {
        let parser = self.get_parser(language)?;
        let tree = parser.parse(source_code, None).unwrap();
        self.trees.insert(file_path.to_string(), tree.clone());

        let mut symbols = Vec::new();
        let mut cursor = tree.walk();
        self.traverse(&mut cursor, &mut symbols, source_code);
        Ok(symbols)
    }

    fn traverse<'a>(&self, cursor: &mut tree_sitter::TreeCursor<'a>, symbols: &mut Vec<ParsedSymbol>, source_code: &'a str) {
        let node = cursor.node();

        if node.kind() == "function_item" {
            let identifier = node.child_by_field_name("name").unwrap();
            let parameters = node.child_by_field_name("parameters").unwrap();

            let symbol = ParsedSymbol {
                identifier: identifier.utf8_text(source_code.as_bytes()).unwrap().to_string(),
                kind: "function".to_string(),
                start_line: node.start_position().row,
                end_line: node.end_position().row,
                parameters: vec![], // Simplified for this example
            };
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_rust_function() {
        let source_code = r#"
            fn my_function(a: i32, b: &str) -> bool {
                true
            }
        "#;
        let mut parser = TokenixParser::new();
        let symbols = parser.parse_file("test.rs", source_code, "rust").unwrap();
        assert_eq!(symbols.len(), 1);
        let symbol = &symbols[0];
        assert_eq!(symbol.identifier, "my_function");
        assert_eq!(symbol.kind, "function");
        assert_eq!(symbol.start_line, 1);
        assert_eq!(symbol.end_line, 3);
    }
}
