use surrealdb::engine::local::{Db, Mem};
use surrealdb::Surreal;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
struct EpisodicMemory {
    compiler_error_log: String,
    resolution_diff: String,
    embedding: Vec<f32>,
}

pub struct Engrym {
    db: Arc<Surreal<Db>>,
}

impl Engrym {
    pub async fn new() -> Result<Self> {
        let db = Surreal::new::<Mem>(()).await?;
        db.use_ns("aeos").use_db("engrym").await?;
        db.query("DEFINE TABLE episodic_memory SCHEMAFULL;").await?;
        db.query("DEFINE FIELD compiler_error_log ON TABLE episodic_memory TYPE string;").await?;
        db.query("DEFINE FIELD resolution_diff ON TABLE episodic_memory TYPE string;").await?;
        db.query("DEFINE FIELD embedding ON TABLE episodic_memory TYPE array<float>;").await?;
        Ok(Self { db: Arc::new(db) })
    }

    pub async fn store_episode(&self, error: &str, diff: &str, embedding: &[f32]) -> Result<()> {
        self.db
            .create("episodic_memory")
            .content(EpisodicMemory {
                compiler_error_log: error.to_string(),
                resolution_diff: diff.to_string(),
                embedding: embedding.to_vec(),
            })
            .await?;
        Ok(())
    }

    pub async fn search_similar_episodes(&self, target_embedding: &[f32], limit: usize) -> Result<Vec<EpisodicMemory>> {
        let sql = "SELECT *, vector::similarity::cosine(embedding, $target) AS score FROM episodic_memory ORDER BY score DESC LIMIT $limit;";
        let mut result = self.db
            .query(sql)
            .bind(("target", target_embedding))
            .bind(("limit", limit))
            .await?;
        let episodes: Vec<EpisodicMemory> = result.take(0)?;
        Ok(episodes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_store_and_search_episode() {
        let engrym = Engrym::new().await.unwrap();
        let embedding1 = vec![1.0, 2.0, 3.0];
        let embedding2 = vec![1.1, 2.1, 3.1]; // similar
        let embedding3 = vec![9.0, 8.0, 7.0]; // different

        engrym.store_episode("error1", "diff1", &embedding1).await.unwrap();
        engrym.store_episode("error2", "diff2", &embedding2).await.unwrap();
        engrym.store_episode("error3", "diff3", &embedding3).await.unwrap();

        let similar_episodes = engrym.search_similar_episodes(&vec![1.0, 2.0, 3.0], 2).await.unwrap();
        assert_eq!(similar_episodes.len(), 2);
        assert_eq!(similar_episodes[0].compiler_error_log, "error1");
        assert_eq!(similar_episodes[1].compiler_error_log, "error2");
    }
}
