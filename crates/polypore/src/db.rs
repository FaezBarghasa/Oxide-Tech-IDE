use surrealdb::engine::local::Db;
use surrealdb::Surreal;
use crate::errors::{OxideError, OxideResult};

pub struct MemoryDb {
    pub session: Surreal<Db>,
}

impl MemoryDb {
    pub async fn init(path: &str) -> OxideResult<Self> {
        let session = Surreal::new::<surrealdb::engine::local::File>(path)
            .await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.use_ns("oxide").use_db("episodic").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        // Define schemas
        session.query("DEFINE TABLE user_message SCHEMAFULL;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE TABLE agent_step SCHEMAFULL;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE TABLE code_symbol SCHEMAFULL;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE TABLE symbol_dependency SCHEMAFULL;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.query("DEFINE EVENT user_message_created ON TABLE user_message WHEN $event = 'CREATE' THEN (
            CREATE agent_step SET message = $after.message, timestamp = time::now()
        );").await.map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.query("DEFINE FIELD message ON TABLE user_message TYPE string;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD timestamp ON TABLE user_message TYPE datetime;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.query("DEFINE FIELD message ON TABLE agent_step TYPE string;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD timestamp ON TABLE agent_step TYPE datetime;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.query("DEFINE FIELD name ON TABLE code_symbol TYPE string;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD kind ON TABLE code_symbol TYPE string;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD signature ON TABLE code_symbol TYPE string;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD range ON TABLE code_symbol TYPE array<int>;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        session.query("DEFINE FIELD dependencies ON TABLE code_symbol TYPE array<string>;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        session.query("DEFINE EDGE depends_on;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        Ok(Self { session })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use surrealdb::engine::local::Mem;
    use surrealdb::opt::auth::Root;

    #[tokio::test]
    async fn test_db_init_and_schema() -> OxideResult<()> {
        let db_instance = MemoryDb::init("mem://test.db").await?;

        // Test inserting a user message
        let _created: surrealdb::Response = db_instance.session.query("CREATE user_message SET message = 'Hello, agent!', timestamp = time::now();").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        // Test inserting a code symbol
        let _created_symbol: surrealdb::Response = db_instance.session.query("CREATE code_symbol SET name = 'my_function', kind = 'Function', signature = 'fn my_function()', range = [1, 10], dependencies = ['some_dep'];").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        // Test linking symbols
        let _linked: surrealdb::Response = db_instance.session.query("RELATE code_symbol:1->depends_on->code_symbol:2;").await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        Ok(())
    }
}
