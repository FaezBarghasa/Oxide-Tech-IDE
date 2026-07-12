use thiserror::Error;

#[derive(Error, Debug)]
pub enum OxideError {
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Execution error (code: {code}): {stderr}")]
    ExecutionError { code: i32, stderr: String },
}

pub type OxideResult<T> = Result<T, OxideError>;