use keyring::Entry;
use crate::errors::{OxideError, OxideResult};

pub struct CredentialManager;

impl CredentialManager {
    pub fn store_key(service: &str, key: &str) -> OxideResult<()> {
        let entry = Entry::new(&format!("oxide-ide-agent:{}", service), "developer")
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        entry.set_password(key)
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        Ok(())
    }

    pub fn get_key(service: &str) -> OxideResult<String> {
        let entry = Entry::new(&format!("oxide-ide-agent:{}", service), "developer")
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        entry.get_password()
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        Ok(entry.get_password().unwrap_or_default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "Requires OS keyring access, may fail in CI"]
    fn test_store_and_get_key() -> OxideResult<()> {
        let service = "test_service";
        let key = "test_key_123";

        CredentialManager::store_key(service, key)?;
        let retrieved_key = CredentialManager::get_key(service)?;

        assert_eq!(retrieved_key, key);

        // Clean up
        let entry = Entry::new(&format!("oxide-ide-agent:{}", service), "developer")
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        entry.delete_password()
            .map_err(|e| OxideError::SandboxError { message: e.to_string() })?;
        Ok(())
    }

    #[test]
    fn test_get_non_existent_key() -> OxideResult<()> {
        let service = "non_existent_service";
        let result = CredentialManager::get_key(service);
        assert!(result.is_err());
        Ok(())
    }
}
