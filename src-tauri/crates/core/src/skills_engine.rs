use crate::errors::{OxideError, OxideResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSkill {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub error_patterns: Vec<String>,
    pub prompt_template: String,
    pub verification_command: String,
    pub risk_level: String,
    pub success_count: u32,
    pub failure_count: u32,
}

#[derive(Debug, Clone)]
pub struct SkillsEngine {
    skills: HashMap<String, LocalSkill>,
}

impl Default for SkillsEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SkillsEngine {
    pub fn new() -> Self {
        let mut engine = Self {
            skills: HashMap::new(),
        };
        engine.load_builtin_skills();
        engine
    }

    fn load_builtin_skills(&mut self) {
        let default_skills = vec![
            LocalSkill {
                id: "rust_fix_missing_import".to_string(),
                name: "Fix Missing Rust Import".to_string(),
                version: 1,
                error_patterns: vec![
                    "cannot find".to_string(),
                    "unresolved import".to_string(),
                    "not found in this scope".to_string(),
                ],
                prompt_template: "Identify the missing symbol and add the canonical use statement.".to_string(),
                verification_command: "cargo check".to_string(),
                risk_level: "low".to_string(),
                success_count: 5,
                failure_count: 0,
            },
            LocalSkill {
                id: "rust_avoid_unwrap".to_string(),
                name: "Refactor unwrap to Result".to_string(),
                version: 1,
                error_patterns: vec!["unwrap()".to_string(), "expect()".to_string()],
                prompt_template: "Refactor unwrapped expressions into idiomatic ? error propagation or match arms.".to_string(),
                verification_command: "cargo clippy -- -D warnings".to_string(),
                risk_level: "low".to_string(),
                success_count: 8,
                failure_count: 0,
            },
        ];

        for skill in default_skills {
            self.skills.insert(skill.id.clone(), skill);
        }
    }

    pub fn match_skills_for_diagnostic(&self, diagnostic: &str) -> Vec<&LocalSkill> {
        let diag_lower = diagnostic.to_lowercase();
        self.skills
            .values()
            .filter(|skill| {
                skill
                    .error_patterns
                    .iter()
                    .any(|pat| diag_lower.contains(&pat.to_lowercase()))
            })
            .collect()
    }

    pub fn record_skill_outcome(&mut self, skill_id: &str, success: bool) -> OxideResult<()> {
        let skill = self
            .skills
            .get_mut(skill_id)
            .ok_or_else(|| OxideError::ExecutionError {
                code: 404,
                stderr: format!("Skill '{}' not found", skill_id),
            })?;

        if success {
            skill.success_count += 1;
        } else {
            skill.failure_count += 1;
        }
        Ok(())
    }

    pub fn propose_skill_candidate(
        &mut self,
        name: String,
        error_pattern: String,
        prompt_template: String,
        verification_command: String,
    ) -> LocalSkill {
        let id = format!("skill_{}", uuid::Uuid::new_v4().simple());
        let skill = LocalSkill {
            id: id.clone(),
            name,
            version: 1,
            error_patterns: vec![error_pattern],
            prompt_template,
            verification_command,
            risk_level: "low".to_string(),
            success_count: 1,
            failure_count: 0,
        };
        self.skills.insert(id, skill.clone());
        skill
    }

    pub fn list_skills(&self) -> Vec<LocalSkill> {
        self.skills.values().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_matching() {
        let engine = SkillsEngine::new();
        let matches = engine.match_skills_for_diagnostic(
            "error[E0433]: failed to resolve: unresolved import `std::fs`",
        );
        assert!(!matches.is_empty());
        assert_eq!(matches[0].id, "rust_fix_missing_import");
    }
}
