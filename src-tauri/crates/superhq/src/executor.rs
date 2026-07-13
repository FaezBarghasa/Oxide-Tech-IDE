use nix::unistd::{fork, ForkResult, execvp, pipe, dup2, close};
use nix::sys::wait::{waitpid, WaitStatus};
use std::ffi::CString;
use std::os::unix::io::FromRawFd;
use tokio::io::{AsyncReadExt, BufReader};
use crate::errors::{OxideError, OxideResult};

pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub struct SandboxExecutor;

impl SandboxExecutor {
    pub async fn execute(
        command: &[&str],
        env_vars: &[(String, String)],
    ) -> OxideResult<ExecutionResult> {
        let (stdout_read, stdout_write) = pipe()?;
        let (stderr_read, stderr_write) = pipe()?;

        match unsafe { fork() } {
            Ok(ForkResult::Parent { child }) => {
                drop(unsafe { std::fs::File::from_raw_fd(stdout_write) });
                drop(unsafe { std::fs::File::from_raw_fd(stderr_write) });

                let mut stdout_reader = BufReader::new(tokio::fs::File::from(unsafe { std::fs::File::from_raw_fd(stdout_read) }));
                let mut stderr_reader = BufReader::new(tokio::fs::File::from(unsafe { std::fs::File::from_raw_fd(stderr_read) }));

                let mut stdout_buf = String::new();
                let mut stderr_buf = String::new();

                let stdout_handle = tokio::spawn(async move {
                    stdout_reader.read_to_string(&mut stdout_buf).await.map(|_| stdout_buf)
                });
                let stderr_handle = tokio::spawn(async move {
                    stderr_reader.read_to_string(&mut stderr_buf).await.map(|_| stderr_buf)
                });

                let stdout = stdout_handle.await??;
                let stderr = stderr_handle.await??;

                let status = waitpid(child, None).map_err(|e| OxideError::ExecutionError {
                    code: -1,
                    stderr: format!("Waitpid failed: {}", e),
                })?;

                let exit_code = match status {
                    WaitStatus::Exited(_, code) => code,
                    WaitStatus::Signaled(_, sig, _) => 128 + sig as i32,
                    _ => -1,
                };

                Ok(ExecutionResult {
                    exit_code,
                    stdout,
                    stderr,
                })
            },
            Ok(ForkResult::Child) => {
                // In child process, we exit on error, so unwrap is acceptable here.
                close(stdout_read).unwrap();
                close(stderr_read).unwrap();
                dup2(stdout_write, 1).unwrap();
                dup2(stderr_write, 2).unwrap();
                close(stdout_write).unwrap();
                close(stderr_write).unwrap();

                for (key, value) in env_vars {
                    std::env::set_var(key, value);
                }

                let args: Vec<CString> = command.iter().map(|s| CString::new(*s).unwrap()).collect();
                let _ = execvp(&args[0], &args);

                // If execvp returns, it's an error
                std::process::exit(127);
            }
            Err(e) => Err(OxideError::ExecutionError {
                code: -1,
                stderr: format!("Fork failed: {}", e),
            })
        }
    }
}