use surrealdb::engine::any::Any;
use surrealdb::Surreal;
use crate::db::models::errors::DatabaseError;

pub struct EpisodicMemory {
    db: Surreal<Any>,
}

impl EpisodicMemory {
    pub async fn new(db: Surreal<Any>) -> Self {
        Self { db }
    }

    pub async fn define_schema(&self) -> Result<(), DatabaseError> {
        self.db.query("DEFINE TABLE episodic_memory SCHEMAFULL;").await?;
        self.db.query("DEFINE FIELD compiler_error_log ON TABLE episodic_memory TYPE string;").await?;
        self.db.query("DEFINE FIELD resolution_diff ON TABLE episodic_memory TYPE string;").await?;
        self.db.query("DEFINE FIELD embedding ON TABLE episodic_memory TYPE array<float>;").await?;
        Ok(())
    }

    pub async fn store_episode(&self, error: &str, diff: &str, embedding: &[f32]) -> Result<(), DatabaseError> {
        let query = "CREATE episodic_memory CONTENT { compiler_error_log: $error, resolution_diff: $diff, embedding: $embedding };";
        self.db.query(query)
            .bind(("error", error))
            .bind(("diff", diff))
            .bind(("embedding", embedding))
            .await?;
        Ok(())
    }

    pub async fn search_similar_episodes(&self, target_embedding: &[f32], limit: usize) -> Result<Vec<(String, String)>, DatabaseError> {
        let query = "SELECT compiler_error_log, resolution_diff FROM episodic_memory ORDER BY vector::similarity::cosine(embedding, $embedding) DESC LIMIT $limit;";
        let mut result = self.db.query(query)
            .bind(("embedding", target_embedding))
            .bind(("limit", limit))
            .await?;
        let episodes: Vec<(String, String)> = result.take(0)?;
        Ok(episodes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use surrealdb::engine::any::connect;
    use surrealdb::opt::auth::Root;

    async fn setup_db() -> Surreal<Any> {
        let db = connect("mem://").await.unwrap();
        db.signin(Root {
            username: "root",
            password: "root",
        }).await.unwrap();
        db.use_ns("test").use_db("test").await.unwrap();
        db
    }

    #[tokio::test]
    async fn test_episode_storage_and_search() {
        let db = setup_db().await;
        let memory = EpisodicMemory::new(db).await;
        memory.define_schema().await.unwrap();

        let embedding1 = vec![1.0, 0.0, 0.0];
        let embedding2 = vec![0.0, 1.0, 0.0];

        memory.store_episode("error1", "diff1", &embedding1).await.unwrap();
        memory.store_episode("error2", "diff2", &embedding2).await.unwrap();

        let search_embedding = vec![0.9, 0.1, 0.0];
        let similar_episodes = memory.search_similar_episodes(&search_embedding, 1).await.unwrap();

        assert_eq!(similar_episodes.len(), 1);
        assert_eq!(similar_episodes[0].0, "error1");
    }
}
