use serde::{Deserialize, Serialize};
use surrealdb::engine::local::{Db, Mem};
use surrealdb::Surreal;
use uuid::Uuid;
use crate::db::models::task::CodeSymbol;
use core::errors::{OxideError, OxideResult};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodeNode {
    pub id: String,
    pub file_path: String,
    pub symbol_name: String,
    pub node_type: String,
    pub line: usize,
}

pub struct Graphify {
    db: Arc<Surreal<Db>>,
}

impl Graphify {
    pub async fn new() -> Self {
        let db = Arc::new(Surreal::new::<Mem>(()).await.unwrap());
        db.use_ns("oxide").use_db("tech").await.unwrap();
        Self { db }
    }

    pub async fn insert_symbol(&self, symbol: &CodeSymbol) -> OxideResult<CodeNode> {
        let node: CodeNode = self.db
            .create(("code_node", symbol.id.to_string()))
            .content(CodeNode {
                id: symbol.id.to_string(),
                file_path: symbol.file_path.to_str().unwrap().to_string(),
                symbol_name: symbol.name.clone(),
                node_type: format!("{:?}", symbol.kind),
                line: symbol.start_line,
            })
            .await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        Ok(node)
    }

    pub async fn relate_symbols(&self, source_id: Uuid, target_id: Uuid, relation_type: &str, params: Vec<String>) -> OxideResult<()> {
        let sql = "RELATE code_node:$source -> $relation -> code_node:$target CONTENT { parameter_types: $params };";
        self.db
            .query(sql)
            .bind(("source", source_id.to_string()))
            .bind(("relation", relation_type))
            .bind(("target", target_id.to_string()))
            .bind(("params", params))
            .await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;
        Ok(())
    }

    pub async fn find_callers(&self, target_id: Uuid) -> OxideResult<Vec<CodeNode>> {
        let sql = "SELECT <-calls<-code_node as callers FROM code_node:$target;";
        let mut result = self.db
            .query(sql)
            .bind(("target", target_id.to_string()))
            .await
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        let callers: Vec<CodeNode> = result.take(0)
            .map_err(|e| OxideError::SurrealDbError { message: e.to_string() })?;

        Ok(callers)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use context_compiler::parser::{CodeSymbol, SymbolKind};
    use std::path::PathBuf;

    #[tokio::test]
    async fn test_graph_creation_and_query() {
        let graph = Graphify::new().await;

        let symbol1 = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Function,
            name: "function1".to_string(),
            signature: "fn function1()".to_string(),
            file_path: PathBuf::from("test.rs"),
            start_line: 1,
            end_line: 3,
            dependencies: vec![],
        };

        let symbol2 = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Function,
            name: "function2".to_string(),
            signature: "fn function2()".to_string(),
            file_path: PathBuf::from("test.rs"),
            start_line: 5,
            end_line: 7,
            dependencies: vec!["function1".to_string()],
        };

        graph.insert_symbol(&symbol1).await.unwrap();
        graph.insert_symbol(&symbol2).await.unwrap();

        graph.relate_symbols(symbol2.id, symbol1.id, "calls", vec![]).await.unwrap();

        let callers = graph.find_callers(symbol1.id).await.unwrap();
        assert_eq!(callers.len(), 1);
        assert_eq!(callers[0].symbol_name, "function2");
    }
}
