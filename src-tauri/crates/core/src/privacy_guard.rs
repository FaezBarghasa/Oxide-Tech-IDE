use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceRequestMetadata {
    pub worker_id: String,
    pub project_id: String,
    pub namespace: String,
    pub retention: String,
    pub no_train: bool,
    pub no_global_memory: bool,
}

impl Default for InferenceRequestMetadata {
    fn default() -> Self {
        Self {
            worker_id: "local_worker".to_string(),
            project_id: "oxide_project".to_string(),
            namespace: "local/workspace".to_string(),
            retention: "ephemeral".to_string(),
            no_train: true,
            no_global_memory: true,
        }
    }
}

pub struct PrivacyGuard;

impl PrivacyGuard {
    /// Scans text and redacts API keys, bearer tokens, and private secrets
    pub fn sanitize_prompt_context(raw_text: &str) -> String {
        let mut sanitized = raw_text.to_string();

        let patterns = [
            ("sk-proj-[A-Za-z0-9_-]{20,}", "[REDACTED_API_KEY]"),
            ("ghp_[A-Za-z0-9]{20,}", "[REDACTED_GITHUB_TOKEN]"),
            ("eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*", "[REDACTED_JWT]"),
        ];

        for (pattern, replacement) in patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                sanitized = re.replace_all(&sanitized, replacement).to_string();
            }
        }

        sanitized
    }

    /// Constructs isolated stateless metadata header for inference request
    pub fn build_stateless_metadata(worker_id: &str, project_id: &str) -> InferenceRequestMetadata {
        InferenceRequestMetadata {
            worker_id: worker_id.to_string(),
            project_id: project_id.to_string(),
            namespace: format!("{}/{}", worker_id, project_id),
            retention: "ephemeral".to_string(),
            no_train: true,
            no_global_memory: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secret_redaction() {
        let prompt = "My key is sk-proj-1234567890abcdef1234567890 please help.";
        let clean = PrivacyGuard::sanitize_prompt_context(prompt);
        assert!(!clean.contains("sk-proj-1234567890abcdef1234567890"));
        assert!(clean.contains("[REDACTED_API_KEY]"));
    }

    #[test]
    fn test_metadata_isolation_flags() {
        let meta = PrivacyGuard::build_stateless_metadata("alice", "oxide_ide");
        assert!(meta.no_train);
        assert!(meta.no_global_memory);
        assert_eq!(meta.namespace, "alice/oxide_ide");
    }
}
