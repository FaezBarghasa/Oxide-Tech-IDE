use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SafetyTier {
    SafeAutoApply,      // Missing import, semicolon, clippy machine-applicable
    PreviewRequired,    // Type cast, macro derive, structural changes
    ManualIntervention, // Trait bounds, lifetime annotations, architecture refactors
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealingActionType {
    AddImport(String),
    TypeCast(String),
    FixSyntax(String),
    DeriveMacro(String),
    EmbeddedNoStdFix(String),
    ClippyMachineFix(String),
    Unrecognized,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HealingSuggestion {
    pub file_path: String,
    pub line_number: usize,
    pub action_type: HealingActionType,
    pub safety_tier: SafetyTier,
    pub description: String,
    pub replacement_code: Option<String>,
    pub diff_preview: Option<String>,
}

pub struct CompilerGuard;

impl CompilerGuard {
    /// Analyzes a compiler error message and produces a deterministic healing suggestion with safety classification
    pub fn diagnose_and_suggest(
        file_path: &str,
        line_number: usize,
        error_message: &str,
        current_line_content: &str,
    ) -> HealingSuggestion {
        let msg_lower = error_message.to_lowercase();

        // 1. Missing Standard / Embedded Imports
        if msg_lower.contains("cannot find module")
            || msg_lower.contains("cannot find type")
            || msg_lower.contains("cannot find value")
            || msg_lower.contains("unresolved import")
            || msg_lower.contains("not found in this scope")
        {
            if msg_lower.contains("defmt")
                || msg_lower.contains("format") && msg_lower.contains("trait")
            {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::EmbeddedNoStdFix(
                        "use defmt::Format;".to_string(),
                    ),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add embedded 'use defmt::Format;' trait import".to_string(),
                    replacement_code: Some("use defmt::Format;\n".to_string()),
                    diff_preview: Some("+ use defmt::Format;\n".to_string()),
                };
            } else if msg_lower.contains("embassy") || msg_lower.contains("timer") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::EmbeddedNoStdFix(
                        "use embassy_time::{Duration, Timer};".to_string(),
                    ),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add embedded 'use embassy_time::{Duration, Timer};'".to_string(),
                    replacement_code: Some("use embassy_time::{Duration, Timer};\n".to_string()),
                    diff_preview: Some("+ use embassy_time::{Duration, Timer};\n".to_string()),
                };
            } else if msg_lower.contains("heapless") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::EmbeddedNoStdFix(
                        "use heapless::Vec;".to_string(),
                    ),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add bounded embedded 'use heapless::Vec;'".to_string(),
                    replacement_code: Some("use heapless::Vec;\n".to_string()),
                    diff_preview: Some("+ use heapless::Vec;\n".to_string()),
                };
            } else if msg_lower.contains("fs") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport("use std::fs;".to_string()),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add missing import 'use std::fs;'".to_string(),
                    replacement_code: Some("use std::fs;\n".to_string()),
                    diff_preview: Some("+ use std::fs;\n".to_string()),
                };
            } else if msg_lower.contains("path") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport("use std::path::Path;".to_string()),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add missing import 'use std::path::Path;'".to_string(),
                    replacement_code: Some("use std::path::Path;\n".to_string()),
                    diff_preview: Some("+ use std::path::Path;\n".to_string()),
                };
            } else if msg_lower.contains("hashmap") {
                return HealingSuggestion {
                    file_path: file_path.to_string(),
                    line_number: 1,
                    action_type: HealingActionType::AddImport(
                        "use std::collections::HashMap;".to_string(),
                    ),
                    safety_tier: SafetyTier::SafeAutoApply,
                    description: "Add missing import 'use std::collections::HashMap;'".to_string(),
                    replacement_code: Some("use std::collections::HashMap;\n".to_string()),
                    diff_preview: Some("+ use std::collections::HashMap;\n".to_string()),
                };
            }
        }

        // 2. Type Mismatch: &str to String
        if (msg_lower.contains("mismatched types") || msg_lower.contains("expected struct"))
            && msg_lower.contains("string")
            && msg_lower.contains("&str")
        {
            let trimmed = current_line_content.trim_end_matches(';');
            let replacement = format!("{}.to_string();", trimmed);
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::TypeCast(".to_string()".to_string()),
                safety_tier: SafetyTier::PreviewRequired,
                description: "Convert &str to String via .to_string()".to_string(),
                replacement_code: Some(replacement.clone()),
                diff_preview: Some(format!("- {}\n+ {}", current_line_content, replacement)),
            };
        }

        // 3. Missing Semicolon
        if (msg_lower.contains("expected") && msg_lower.contains(";"))
            || msg_lower.contains("expected `;`")
        {
            let fixed = format!("{};", current_line_content.trim_end());
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::FixSyntax(";".to_string()),
                safety_tier: SafetyTier::SafeAutoApply,
                description: "Append missing semicolon ';'".to_string(),
                replacement_code: Some(fixed.clone()),
                diff_preview: Some(format!("- {}\n+ {}", current_line_content, fixed)),
            };
        }

        // 4. Trait Not Implemented: Debug / Clone / defmt::Format
        if msg_lower.contains("implement `debug`")
            || msg_lower.contains("the trait `debug` is not implemented")
        {
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::DeriveMacro("#[derive(Debug)]".to_string()),
                safety_tier: SafetyTier::PreviewRequired,
                description: "Add #[derive(Debug)] macro attribute".to_string(),
                replacement_code: Some("#[derive(Debug)]\n".to_string()),
                diff_preview: Some("+ #[derive(Debug)]\n".to_string()),
            };
        } else if msg_lower.contains("defmt::format")
            || msg_lower.contains("implement `format`")
            || msg_lower.contains("the trait `format` is not implemented")
        {
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::DeriveMacro("#[derive(defmt::Format)]".to_string()),
                safety_tier: SafetyTier::PreviewRequired,
                description: "Add #[derive(defmt::Format)] for zero-cost RTT telemetry".to_string(),
                replacement_code: Some("#[derive(defmt::Format)]\n".to_string()),
                diff_preview: Some("+ #[derive(defmt::Format)]\n".to_string()),
            };
        }

        // 5. Clippy Machine-Applicable Heuristics
        if msg_lower.contains("clippy::needless_return") || msg_lower.contains("unneeded `return`")
        {
            let fixed = current_line_content.replace("return ", "").replace(";", "");
            return HealingSuggestion {
                file_path: file_path.to_string(),
                line_number,
                action_type: HealingActionType::ClippyMachineFix(
                    "Remove needless return".to_string(),
                ),
                safety_tier: SafetyTier::SafeAutoApply,
                description: "Clippy: Remove redundant 'return' statement".to_string(),
                replacement_code: Some(fixed.trim().to_string()),
                diff_preview: Some(format!("- {}\n+ {}", current_line_content, fixed)),
            };
        }

        HealingSuggestion {
            file_path: file_path.to_string(),
            line_number,
            action_type: HealingActionType::Unrecognized,
            safety_tier: SafetyTier::ManualIntervention,
            description: "No automated rule matches compiler error".to_string(),
            replacement_code: None,
            diff_preview: None,
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
        assert_eq!(suggestion.safety_tier, SafetyTier::PreviewRequired);
    }

    #[test]
    fn test_healer_embedded_defmt() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/sensor.rs",
            4,
            "`TemperatureData` doesn't implement `defmt::Format` trait",
            "struct TemperatureData { val: f32 }",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::DeriveMacro("#[derive(defmt::Format)]".to_string())
        );
        assert_eq!(suggestion.safety_tier, SafetyTier::PreviewRequired);
    }

    #[test]
    fn test_healer_clippy_needless_return() {
        let suggestion = CompilerGuard::diagnose_and_suggest(
            "src/calc.rs",
            15,
            "warning: unneeded `return` statement in clippy::needless_return",
            "return a + b;",
        );

        assert_eq!(
            suggestion.action_type,
            HealingActionType::ClippyMachineFix("Remove needless return".to_string())
        );
        assert_eq!(suggestion.safety_tier, SafetyTier::SafeAutoApply);
        assert_eq!(suggestion.replacement_code, Some("a + b".to_string()));
    }
}
