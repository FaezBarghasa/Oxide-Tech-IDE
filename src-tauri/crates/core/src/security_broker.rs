use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::errors::{OxideError, OxideResult};

pub struct SecretBroker {
    secrets: Arc<RwLock<HashMap<String, String>>>,
}

impl Default for SecretBroker {
    fn default() -> Self {
        Self::new()
    }
}

impl SecretBroker {
    pub fn new() -> Self {
        Self {
            secrets: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn store_secret(&self, key: &str, value: &str) {
        let mut map = self.secrets.write().await;
        map.insert(key.to_string(), value.to_string());
    }

    pub async fn get_secret(&self, key: &str) -> Option<String> {
        let map = self.secrets.read().await;
        map.get(key).cloned()
    }
}

pub struct AskpassBroker {
    broker: SecretBroker,
}

impl Default for AskpassBroker {
    fn default() -> Self {
        Self::new()
    }
}

impl AskpassBroker {
    pub fn new() -> Self {
        Self {
            broker: SecretBroker::new(),
        }
    }

    pub async fn handle_prompt(&self, prompt: &str) -> OxideResult<String> {
        if prompt.to_lowercase().contains("password") || prompt.to_lowercase().contains("token") {
            let secret = self.broker.get_secret("AUTH_TOKEN").await.unwrap_or_default();
            Ok(secret)
        } else {
            Err(OxideError::NetworkAccessDenied)
        }
    }
}
