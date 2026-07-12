use surrealdb::engine::any::Any;
use surrealdb::Surreal;
use anyhow::Result;

pub struct Engrym;

impl Engrym {
    pub async fn create_schema(db: &Surreal<Any>) -> Result<()> {
        db.query("DEFINE TABLE episodic_memory SCHEMAFULL;").await?;
        db.query("DEFINE FIELD compiler_error_log ON TABLE episodic_memory TYPE string;").await?;
        db.query("DEFINE FIELD resolution_diff ON TABLE episodic_memory TYPE string;").await?;
        db.query("DEFINE FIELD embedding ON TABLE episodic_memory TYPE array<float>;").await?;
        db.query("DEFINE INDEX embedding_index ON TABLE episodic_memory FIELDS embedding;").await?;
        Ok(())
    }

    pub async fn store_episode(db: &Surreal<Any>, error: &str, diff: &str, embedding: &[f32]) -> Result<()> {
        let sql = "CREATE episodic_memory CONTENT { compiler_error_log: $error, resolution_diff: $diff, embedding: $embedding };";

        db.query(sql)
            .bind(("error", error))
            .bind(("diff", diff))
            .bind(("embedding", embedding))
            .await?;

        Ok(())
    }

    pub async fn search_similar_episodes(db: &Surreal<Any>, target_embedding: &[f32], limit: usize) -> Result<Vec<serde_json::Value>> {
        let sql = "SELECT *, vector::similarity::cosine(embedding, $target) AS score FROM episodic_memory ORDER BY score DESC LIMIT $limit;";

        let mut result = db.query(sql)
            .bind(("target", target_embedding))
            .bind(("limit", limit))
            .await?;

        let episodes: Vec<serde_json::Value> = result.take(0)?;
        Ok(episodes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use surrealdb::engine::any::connect;
    use surrealdb::opt::Mem;

    async fn setup_db() -> Result<Surreal<Any>> {
        let db = connect(Mem).await?;
        db.use_ns("test").use_db("test").await?;
        Engrym::create_schema(&db).await?;
        Ok(db)
    }

    #[tokio::test]
    async fn test_store_and_search_episode() -> Result<()> {
        let db = setup_db().await?;

        let embedding1 = vec![1.0, 0.0, 0.0];
        let embedding2 = vec![0.0, 1.0, 0.0];

        Engrym::store_episode(&db, "error1", "diff1", &embedding1).await?;
        Engrym::store_episode(&db, "error2", "diff2", &embedding2).await?;

        let similar_episodes = Engrym::search_similar_episodes(&db, &embedding1, 1).await?;

        assert_eq!(similar_episodes.len(), 1);
        assert_eq!(similar_episodes[0]["compiler_error_log"].as_str(), Some("error1"));

        Ok(())
    }
}
