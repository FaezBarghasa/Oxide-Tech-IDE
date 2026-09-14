use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealingActionType {
    AddImport(String),
    TypeCast(String),
    FixSyntax(String),
    DeriveMacro(String),
    Unrecognized,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HealingSuggestion {
    pub file_path: String,
    pub line_number: usize,
    pub action_type: HealingActionType,
    pub description: String,
    pub replacement_code: Option<String>,
}

pub struct CompilerGuard;

impl CompilerGuard {
    /// Analyzes a compiler error message and produces a deterministic healing suggestion
    pub fn diagnose_and_suggest(
        file_path: &str,
        line_number: usize,
        error_message: &str,
        current_line_content: &str,
    ) -> HealingSuggestion {
        let msg_lower = error_message.to_lowercase();

        // 1. Missing Standard Imports
        if msg_lower.contains("cannot find module")
            || msg_lower.contains("cannot find type")
            || msg_lower.contains("cannot find value")
            || msg_lower.contains("unresolved import")
            || msg_lower.contains("not found in this scope")
        {
            if msg_lower.contains("fs") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport("use std::fs;".to_string()),
                    description: "Add missing import 'use std::fs;'".to_string(),
                    replacement_code: Some("use std::fs;\n".to_string()),
                };
            } else if msg_lower.contains("path") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport("use std::path::Path;".to_string()),
                    description: "Add missing import 'use std::path::Path;'".to_string(),
                    replacement_code: Some("use std::path::Path;\n".to_string()),
                };
            } else if msg_lower.contains("hashmap") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport("use std::collections::HashMap;".to_string()),
                    description: "Add missing import 'use std::collections::HashMap;'".to_string(),
                    replacement_code: Some("use std::collections::HashMap;\n".to_string()),
                };
            }
        }

        // 2. Type Mismatch: &str to String
        if msg_lower.contains("mismatched types") || msg_lower.contains("expected struct") {
            if msg_lower.contains("string") && msg_lower.contains("&str") {
                let fixed = if current_line_content.contains('"') {
                    current_line_content.replace(
                        |c: char| c == '"',
                        "",
                    )
                } else {
                    current_line_content.to_string()
                };
                let _ = fixed;
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number,
                    action_type: HealingActionType::TypeCast(".to_string()".to_string()),
                    description: "Convert &str to String via .to_string()".to_string(),
                    replacement_code: Some(format!("{}.to_string()", current_line_content.trim_end_matches(';'))),
                };
            }
        }

        // 3. Missing Semicolon
        if (msg_lower.contains("expected") && msg_lower.contains(";"))
            || msg_lower.contains("expected `;`")
        {
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::FixSyntax(";".to_string()),
                description: "Append missing semicolon ';'".to_string(),
                replacement_code: Some(format!("{};", current_line_content.trim_end())),
            };
        }

        // 4. Trait Not Implemented: Debug or Clone
        if msg_lower.contains("doesn't implement `debug`") || msg_lower.contains("the trait `debug` is not implemented") {
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::DeriveMacro("#[derive(Debug)]".to_string()),
                description: "Add #[derive(Debug)] macro attribute".to_string(),
                replacement_code: Some("#[derive(Debug)]\n".to_string()),
            };
        }

        HealingSuggestion {
            file_path: file_path.to_string(),
            line_number,
            action_type: HealingActionType::Unrecognized,
            description: "No automated rule matches compiler error".to_string(),
            replacement_code: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_healer_missing_fs_import() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/main.rs",
            12,
            "cannot find module `fs` in `std` or unresolved import `std::fs`",
            "let data = fs::read_to_string(\"test.txt\")?;",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::AddImport("use std::fs;".to_string())
        );
        assert!(suggestion.description.contains("std::fs"));
    }

    #[test]
    fn test_healer_missing_path_import() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/lib.rs",
            5,
            "cannot find type `Path` in this scope",
            "fn check_path(p: &Path) {}",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::AddImport("use std::path::Path;".to_string())
        );
    }

    #[test]
    fn test_healer_missing_semicolon() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/main.rs",
            18,
            "expected `;`, found `let`",
            "let x = 42",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::FixSyntax(";".to_string())
        );
        assert_eq!(suggestion.replacement_code, Some("let x = 42;".to_string()));
    }

    #[test]
    fn test_healer_type_mismatch_string() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/main.rs",
            24,
            "mismatched types: expected struct `String`, found `&str`",
            "let name: String = \"Oxide\"",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::TypeCast(".to_string()".to_string())
        );
        assert!(suggestion.description.contains(".to_string()"));
    }

    #[test]
    fn test_healer_missing_debug_derive() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/models.rs",
            8,
            "`MyStruct` doesn't implement `Debug`",
            "struct MyStruct { a: i32 }",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::DeriveMacro("#[derive(Debug)]".to_string())
        );
    }
}
