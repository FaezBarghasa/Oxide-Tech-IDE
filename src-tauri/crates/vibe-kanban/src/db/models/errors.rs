use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Database query failed: {0}")]
    QueryError(#[from] surrealdb::Error),
    #[error("Record not found")]
    RecordNotFound,
}
