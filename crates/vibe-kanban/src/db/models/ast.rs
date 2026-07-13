use surrealdb::engine::any::Any;
use surrealdb::Surreal;
use crate::db::models::errors::DatabaseError;
use uuid::Uuid;

pub struct CodeGraph {
    db: Surreal<Any>,
}

impl CodeGraph {
    pub async fn new(db: Surreal<Any>) -> Self {
        Self { db }
    }

    pub async fn define_schema(&self) -> Result<(), DatabaseError> {
        self.db.query("DEFINE TABLE code_node SCHEMAFULL;").await?;
        self.db.query("DEFINE FIELD file_path ON TABLE code_node TYPE string;").await?;
        self.db.query("DEFINE FIELD symbol_name ON TABLE code_node TYPE string;").await?;
        self.db.query("DEFINE FIELD node_type ON TABLE code_node TYPE string;").await?;
        self.db.query("DEFINE FIELD line ON TABLE code_node TYPE int;").await?;
        self.db.query("DEFINE EDGE calls ON TABLE code_node;").await?;
        self.db.query("DEFINE FIELD parameter_types ON EDGE calls TYPE array<string>;").await?;
        self.db.query("DEFINE EDGE imports ON TABLE code_node;").await?;
        self.db.query("DEFINE EDGE implements ON TABLE code_node;").await?;
        Ok(())
    }

    pub async fn insert_code_node(&self, file_path: &str, symbol_name: &str, node_type: &str, line: usize) -> Result<String, DatabaseError> {
        let id = Uuid::new_v4().to_string();
        let query = "CREATE code_node:$id CONTENT { file_path: $path, symbol_name: $name, node_type: $type, line: $line };";
        let mut result = self.db.query(query)
            .bind(("id", &id))
            .bind(("path", file_path))
            .bind(("name", symbol_name))
            .bind(("type", node_type))
            .bind(("line", line))
            .await?;

        let id: Option<String> = result.take(0)?;
        id.ok_or(DatabaseError::RecordNotFound)
    }

    pub async fn relate_nodes(&self, source_id: &str, target_id: &str, relationship: &str, params: Vec<String>) -> Result<(), DatabaseError> {
        let query = "RELATE code_node:$source_id -> $relationship -> code_node:$target_id CONTENT { parameter_types: $params };";
        self.db.query(query)
            .bind(("source_id", source_id))
            .bind(("relationship", relationship))
            .bind(("target_id", target_id))
            .bind(("params", params))
            .await?;
        Ok(())
    }

    pub async fn find_callers_recursively(&self, target_id: &str) -> Result<Vec<String>, DatabaseError> {
        let query = "SELECT <-calls<-code_node.symbol_name FROM code_node:$target_id;";
        let mut result = self.db.query(query).bind(("target_id", target_id)).await?;
        let callers: Vec<String> = result.take(0)?;
        Ok(callers)
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
    async fn test_graph_creation_and_query() {
        let db = setup_db().await;
        let graph = CodeGraph::new(db).await;
        graph.define_schema().await.unwrap();

        let node1_id = graph.insert_code_node("file1.rs", "function_a", "function", 10).await.unwrap();
        let node2_id = graph.insert_code_node("file1.rs", "function_b", "function", 20).await.unwrap();

        graph.relate_nodes(&node1_id, &node2_id, "calls", vec![]).await.unwrap();

        let callers = graph.find_callers_recursively(&node2_id).await.unwrap();
        assert_eq!(callers.len(), 1);
        assert_eq!(callers[0], "function_a");
    }
}
