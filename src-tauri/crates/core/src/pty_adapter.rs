use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::sync::{Arc, Mutex};
use anyhow::Result;

pub struct PtyTerminalSession {
    pub master: Box<dyn portable_pty::MasterPty + Send>,
    pub writer: Arc<Mutex<Box<dyn std::io::Write + Send>>>,
    pub child: Box<dyn portable_pty::Child + Send>,
}

impl PtyTerminalSession {
    pub fn spawn_bash(cols: u16, rows: u16) -> Result<Self> {
        Self::spawn(None, None, cols, rows)
    }

    pub fn spawn(shell: Option<&str>, cwd: Option<&str>, cols: u16, rows: u16) -> Result<Self> {
        let pty_system = NativePtySystem::default();
        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let default_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        let shell_to_use = shell.unwrap_or(&default_shell);
        let mut cmd = CommandBuilder::new(shell_to_use);
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        let child = pair.slave.spawn_command(cmd)?;
        let writer = pair.master.take_writer()?;

        Ok(Self {
            master: pair.master,
            writer: Arc::new(Mutex::new(writer)),
            child,
        })
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn try_clone_reader(&self) -> Result<Box<dyn std::io::Read + Send>> {
        self.master.try_clone_reader()
    }

    pub fn write_bytes(&self, bytes: &[u8]) -> Result<()> {
        let mut writer = self.writer.lock().map_err(|_| anyhow::anyhow!("Lock poisoned"))?;
        writer.write_all(bytes)?;
        writer.flush()?;
        Ok(())
    }

    pub fn kill(&mut self) -> Result<()> {
        self.child.kill()?;
        Ok(())
    }
}

