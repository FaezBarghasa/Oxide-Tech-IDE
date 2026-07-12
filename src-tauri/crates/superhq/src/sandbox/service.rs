use anyhow::Result;
use super::manager::SandboxManager;

pub trait SandboxService {
    async fn provision_sandbox(&self) -> Result<()>;
}

pub struct SandboxServiceImpl {
    manager: SandboxManager,
}

impl SandboxServiceImpl {
    pub fn new() -> Self {
        Self {
            manager: SandboxManager::new(),
        }
    }
}

impl SandboxService for SandboxServiceImpl {
    async fn provision_sandbox(&self) -> Result<()> {
        self.manager.provision().await
    }
}
