use syn::visit::Visit;
use quote::ToTokens;
use std::path::PathBuf;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use core::errors::{OxideError, OxideResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SymbolKind {
    Function,
    Struct,
    Enum,
    Trait,
    Impl,
    Module,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSymbol {
    pub id: Uuid,
    pub kind: SymbolKind,
    pub name: String,
    pub signature: String,
    pub file_path: PathBuf,
    pub start_line: usize,
    pub end_line: usize,
    pub dependencies: Vec<String>,
}

pub struct RustAstParser;

impl RustAstParser {
    pub fn parse_file(file_path: &PathBuf, source_code: &str) -> OxideResult<Vec<CodeSymbol>> {
        let syntax = syn::parse_file(source_code)
            .map_err(|e| OxideError::AstParseError {
                path: file_path.clone(),
                message: e.to_string(),
            })?;

        let mut visitor = SymbolVisitor {
            file_path: file_path.clone(),
            symbols: Vec::new(),
            current_dependencies: Vec::new(),
        };

        visitor.visit_file(&syntax);

        Ok(visitor.symbols)
    }
}

struct SymbolVisitor {
    file_path: PathBuf,
    symbols: Vec<CodeSymbol>,
    current_dependencies: Vec<String>,
}

impl<'ast> Visit<'ast> for SymbolVisitor {
    fn visit_item_fn(&mut self, node: &'ast syn::ItemFn) {
        let name = node.sig.ident.to_string();
        let signature = node.sig.to_token_stream().to_string();

        // Extract dependencies from function body
        self.current_dependencies.clear();
        self.visit_block(&node.block);

        let symbol = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Function,
            name,
            signature,
            file_path: self.file_path.clone(),
            start_line: node.sig.ident.span().start().line,
            end_line: node.block.brace_token.span.end().line,
            dependencies: self.current_dependencies.clone(),
        };

        self.symbols.push(symbol);
    }

    fn visit_item_struct(&mut self, node: &'ast syn::ItemStruct) {
        let name = node.ident.to_string();
        let signature = format!("struct {} {{ ... }}", name);

        let symbol = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Struct,
            name,
            signature,
            file_path: self.file_path.clone(),
            start_line: node.ident.span().start().line,
            end_line: node.brace_token.span.end().line,
            dependencies: Vec::new(),
        };

        self.symbols.push(symbol);
    }

    fn visit_item_enum(&mut self, node: &'ast syn::ItemEnum) {
        let name = node.ident.to_string();
        let signature = format!("enum {} {{ ... }}", name);

        let symbol = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Enum,
            name,
            signature,
            file_path: self.file_path.clone(),
            start_line: node.ident.span().start().line,
            end_line: node.brace_token.span.end().line,
            dependencies: Vec::new(),
        };

        self.symbols.push(symbol);
    }

    fn visit_item_trait(&mut self, node: &'ast syn::ItemTrait) {
        let name = node.ident.to_string();
        let signature = format!("trait {} {{ ... }}", name);

        let symbol = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Trait,
            name,
            signature,
            file_path: self.file_path.clone(),
            start_line: node.ident.span().start().line,
            end_line: node.brace_token.span.end().line,
            dependencies: Vec::new(),
        };

        self.symbols.push(symbol);
    }

    fn visit_path(&mut self, node: &'ast syn::Path) {
        let path_string = node.to_token_stream().to_string();

        // Filter out common paths
        if !path_string.starts_with("std::")
            && !path_string.starts_with("core::")
            && !path_string.starts_with("self::")
            && !self.current_dependencies.contains(&path_string)
        {
            self.current_dependencies.push(path_string);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_function() {
        let source = r#"
            pub fn add(a: i32, b: i32) -> i32 {
                a + b
            }
        "#;

        let symbols = RustAstParser::parse_file(&PathBuf::from("test.rs"), source).unwrap();
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].kind, SymbolKind::Function);
        assert_eq!(symbols[0].name, "add");
        assert!(symbols[0].signature.contains("fn add"));
    }

    #[test]
    fn test_parse_struct() {
        let source = r#"
            pub struct User {
                pub id: u64,
                pub name: String,
            }
        "#;

        let symbols = RustAstParser::parse_file(&PathBuf::from("test.rs"), source).unwrap();
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].kind, SymbolKind::Struct);
        assert_eq!(symbols[0].name, "User");
    }

    #[test]
    fn test_parse_dependencies() {
        let source = r#"
            struct User { name: String }
            pub fn process(user: User) -> String {
                format!("User: {}", user.name)
            }
        "#;

        let symbols = RustAstParser::parse_file(&PathBuf::from("test.rs"), source).unwrap();
        let function_symbol = symbols.iter().find(|s| s.kind == SymbolKind::Function).unwrap();
        assert!(function_symbol.dependencies.contains(&"User".to_string()));
    }

    #[test]
    fn test_parse_error() {
        let source = "invalid rust code {{{";
        let result = RustAstParser::parse_file(&PathBuf::from("test.rs"), source);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), OxideError::AstParseError { .. }));
    }
}
