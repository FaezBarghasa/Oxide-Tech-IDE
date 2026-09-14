use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MemoryKind {
    Episodic,
    Semantic,
    Procedural,
    Expertise,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MemoryScope {
    GlobalWorker,
    Project,
    Module,
    File,
    Symbol,
    Session,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: Uuid,
    pub workspace_id: String,
    pub worker_id: String,
    pub kind: MemoryKind,
    pub scope: MemoryScope,
    pub content: String,
    pub source: String,
    pub confidence: f32,
    pub created_at: DateTime<Utc>,
    pub last_used_at: DateTime<Utc>,
    pub use_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeveloperExpertiseProfile {
    pub worker_id: String,
    pub primary_languages: Vec<String>,
    pub frequent_modules: Vec<String>,
    pub preferred_tools: Vec<String>,
    pub avoid_unwrap: bool,
    pub prefer_thiserror: bool,
    pub explanation_style: String,
    pub review_focus: Vec<String>,
}

impl Default for DeveloperExpertiseProfile {
    fn default() -> Self {
        Self {
            worker_id: "default_worker".to_string(),
            primary_languages: vec!["rust".to_string()],
            frequent_modules: vec![],
            preferred_tools: vec!["cargo clippy".to_string(), "cargo nextest".to_string()],
            avoid_unwrap: true,
            prefer_thiserror: true,
            explanation_style: "concise".to_string(),
            review_focus: vec!["security".to_string(), "performance".to_string()],
        }
    }
}

#[derive(Debug, Clone)]
pub struct LocalMemoryEngine {
    entries: HashMap<Uuid, MemoryEntry>,
    profile: DeveloperExpertiseProfile,
}

impl Default for LocalMemoryEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl LocalMemoryEngine {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
            profile: DeveloperExpertiseProfile::default(),
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn add_entry(
        &mut self,
        workspace_id: String,
        worker_id: String,
        kind: MemoryKind,
        scope: MemoryScope,
        content: String,
        source: String,
        confidence: f32,
    ) -> MemoryEntry {
        let entry = MemoryEntry {
            id: Uuid::new_v4(),
            workspace_id,
            worker_id,
            kind,
            scope,
            content,
            source,
            confidence: confidence.clamp(0.0, 1.0),
            created_at: Utc::now(),
            last_used_at: Utc::now(),
            use_count: 1,
        };
        self.entries.insert(entry.id, entry.clone());
        entry
    }

    pub fn query_relevant(&mut self, query: &str, scope: Option<MemoryScope>) -> Vec<MemoryEntry> {
        let query_lower = query.to_lowercase();
        let mut matches: Vec<MemoryEntry> = self
            .entries
            .values_mut()
            .filter(|e| {
                if let Some(s) = scope {
                    if e.scope != s {
                        return false;
                    }
                }
                e.content.to_lowercase().contains(&query_lower)
            })
            .map(|e| {
                e.use_count += 1;
                e.last_used_at = Utc::now();
                e.clone()
            })
            .collect();

        matches.sort_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        matches
    }

    pub fn get_profile(&self) -> &DeveloperExpertiseProfile {
        &self.profile
    }

    pub fn update_profile(&mut self, profile: DeveloperExpertiseProfile) {
        self.profile = profile;
    }

    pub fn build_prompt_policy_hint(&self) -> String {
        let mut hints = Vec::new();
        if self.profile.avoid_unwrap {
            hints.push("Strictly avoid unwrap() in non-test Rust code; use ? or proper Result/Option matching.");
        }
        if self.profile.prefer_thiserror {
            hints.push("Prefer thiserror for typed crate-level error enumerations.");
        }
        if self.profile.explanation_style == "concise" {
            hints.push("Keep explanations terse and code-first.");
        }
        hints.join(" ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_addition_and_query() {
        let mut engine = LocalMemoryEngine::new();
        engine.add_entry(
            "ws-1".to_string(),
            "alice".to_string(),
            MemoryKind::Semantic,
            MemoryScope::Project,
            "Prefer cargo nextest over cargo test".to_string(),
            "user_preference".to_string(),
            0.9,
        );

        let results = engine.query_relevant("nextest", None);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].use_count, 2);
    }

    #[test]
    fn test_profile_prompt_hints() {
        let engine = LocalMemoryEngine::new();
        let hint = engine.build_prompt_policy_hint();
        assert!(hint.contains("avoid unwrap()"));
        assert!(hint.contains("thiserror"));
    }
}
