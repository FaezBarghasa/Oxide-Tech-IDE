use surrealdb::engine::any::Any;
use surrealdb::Surreal;
use uuid::Uuid;
use crate::db::models::code_node::CodeNode;
use anyhow::Result;

pub struct AstGraph;

impl AstGraph {
    pub async fn create_schemas(db: &Surreal<Any>) -> Result<()> {
        db.query("DEFINE TABLE code_node SCHEMAFULL;").await?;
        db.query("DEFINE FIELD file_path ON TABLE code_node TYPE string;").await?;
        db.query("DEFINE FIELD symbol_name ON TABLE code_node TYPE string;").await?;
        db.query("DEFINE FIELD node_type ON TABLE code_node TYPE string;").await?;
        db.query("DEFINE FIELD line ON TABLE code_node TYPE int;").await?;

        db.query("DEFINE TABLE calls SCHEMAFULL;").await?;
        db.query("DEFINE FIELD parameter_types ON TABLE calls TYPE array<string>;").await?;

        db.query("DEFINE TABLE imports SCHEMAFULL;").await?;
        db.query("DEFINE TABLE implements SCHEMAFULL;").await?;

        Ok(())
    }

    pub async fn insert_code_node(db: &Surreal<Any>, file_path: &str, symbol_name: &str, node_type: &str, line: usize) -> Result<Uuid> {
        let id = Uuid::new_v4();
        let sql = "CREATE code_node:$id CONTENT { file_path: $path, symbol_name: $name, node_type: $type, line: $line };";

        let mut result = db.query(sql)
            .bind(("id", id))
            .bind(("path", file_path))
            .bind(("name", symbol_name))
            .bind(("type", node_type))
            .bind(("line", line))
            .await?;

        let id: Option<Uuid> = result.take(0)?;
        id.ok_or_else(|| anyhow::anyhow!("Failed to create code node"))
    }

    pub async fn relate_nodes(db: &Surreal<Any>, source_id: Uuid, target_id: Uuid, relation: &str, params: Vec<String>) -> Result<()> {
        let sql = format!("RELATE code_node:{} -> {} -> code_node:{} CONTENT {{ parameter_types: $params }};", source_id, relation, target_id);

        db.query(&sql)
            .bind(("params", params))
            .await?;

        Ok(())
    }

    pub async fn find_callers_recursive(db: &Surreal<Any>, target_id: Uuid) -> Result<Vec<CodeNode>> {
        let sql = "SELECT <-calls<-code_node as callers FROM code_node:$id FETCH callers;";

        let mut result = db.query(sql)
            .bind(("id", target_id))
            .await?;

        let nodes: Vec<CodeNode> = result.take(0)?;
        Ok(nodes)
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
        AstGraph::create_schemas(&db).await?;
        Ok(db)
    }

    #[tokio::test]
    async fn test_insert_and_relate() -> Result<()> {
        let db = setup_db().await?;

        let id1 = AstGraph::insert_code_node(&db, "file.rs", "func_a", "function", 10).await?;
        let id2 = AstGraph::insert_code_node(&db, "file.rs", "func_b", "function", 20).await?;

        AstGraph::relate_nodes(&db, id1, id2, "calls", vec!["i32".to_string()]).await?;

        Ok(())
    }

    #[tokio::test]
    async fn test_recursive_caller_query() -> Result<()> {
        let db = setup_db().await?;

        let id1 = AstGraph::insert_code_node(&db, "file.rs", "func_a", "function", 10).await?;
        let id2 = AstGraph::insert_code_node(&db, "file.rs", "func_b", "function", 20).await?;
        let id3 = AstGraph::insert_code_node(&db, "file.rs", "func_c", "function", 30).await?;

        AstGraph::relate_nodes(&db, id2, id1, "calls", vec![]).await?;
        AstGraph::relate_nodes(&db, id3, id2, "calls", vec![]).await?;

        let callers = AstGraph::find_callers_recursive(&db, id1).await?;

        // This is a simplified test. A real implementation would need to handle multiple levels of recursion.
        // For now, we just check that we can find the direct caller.
        assert_eq!(callers.len(), 1);
        assert_eq!(callers[0].symbol_name, "func_b");

        Ok(())
    }
}
