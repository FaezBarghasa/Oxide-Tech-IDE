use crate::parser::CodeSymbol;
use petgraph::graph::{Graph, NodeIndex};
use petgraph::Direction;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyGraph {
    pub graph: Graph<CodeSymbol, ()>,
    pub node_map: HashMap<Uuid, NodeIndex>,
}

impl DependencyGraph {
    pub fn build_graph(symbols: Vec<CodeSymbol>) -> Self {
        let mut graph = Graph::<CodeSymbol, ()>::new();
        let mut node_map = HashMap::new();
        let mut name_to_node = HashMap::new();

        // First pass: add all symbols as nodes
        for symbol in &symbols {
            let node_index = graph.add_node(symbol.clone());
            node_map.insert(symbol.id, node_index);
            name_to_node.insert(symbol.name.clone(), node_index);
        }

        // Second pass: add edges for dependencies
        for symbol in &symbols {
            let source_node_index = node_map[&symbol.id];
            for dep_name in &symbol.dependencies {
                if let Some(target_node_index) = name_to_node.get(dep_name) {
                    graph.add_edge(source_node_index, *target_node_index, ());
                }
            }
        }

        Self { graph, node_map }
    }

    pub fn get_symbol(&self, id: Uuid) -> Option<&CodeSymbol> {
        self.node_map.get(&id).map(|&node_index| &self.graph[node_index])
    }

    pub fn get_dependencies(&self, id: Uuid) -> Vec<&CodeSymbol> {
        if let Some(&node_index) = self.node_map.get(&id) {
            self.graph
                .neighbors_directed(node_index, Direction::Outgoing)
                .map(|dep_index| &self.graph[dep_index])
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn get_dependents(&self, id: Uuid) -> Vec<&CodeSymbol> {
        if let Some(&node_index) = self.node_map.get(&id) {
            self.graph
                .neighbors_directed(node_index, Direction::Incoming)
                .map(|dep_index| &self.graph[dep_index])
                .collect()
        } else {
            Vec::new()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::{CodeSymbol, SymbolKind};
    use std::path::PathBuf;

    fn create_test_symbols() -> Vec<CodeSymbol> {
        let user_struct = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Struct,
            name: "User".to_string(),
            signature: "struct User { ... }".to_string(),
            file_path: PathBuf::from("test.rs"),
            start_line: 1,
            end_line: 3,
            dependencies: vec![],
        };

        let process_fn = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Function,
            name: "process".to_string(),
            signature: "fn process(user: User) -> String".to_string(),
            file_path: PathBuf::from("test.rs"),
            start_line: 5,
            end_line: 7,
            dependencies: vec!["User".to_string(), "String".to_string()],
        };

        let main_fn = CodeSymbol {
            id: Uuid::new_v4(),
            kind: SymbolKind::Function,
            name: "main".to_string(),
            signature: "fn main()".to_string(),
            file_path: PathBuf::from("main.rs"),
            start_line: 1,
            end_line: 5,
            dependencies: vec!["process".to_string(), "User".to_string()],
        };

        vec![user_struct, process_fn, main_fn]
    }

    #[test]
    fn test_build_graph() {
        let symbols = create_test_symbols();
        let graph = DependencyGraph::build_graph(symbols);

        assert_eq!(graph.graph.node_count(), 3);
        assert_eq!(graph.graph.edge_count(), 3); // process->User, main->process, main->User
    }

    #[test]
    fn test_get_symbol() {
        let symbols = create_test_symbols();
        let user_id = symbols[0].id;
        let graph = DependencyGraph::build_graph(symbols);

        let symbol = graph.get_symbol(user_id).unwrap();
        assert_eq!(symbol.name, "User");
    }

    #[test]
    fn test_get_dependencies() {
        let symbols = create_test_symbols();
        let process_fn_id = symbols[1].id;
        let graph = DependencyGraph::build_graph(symbols);

        let dependencies = graph.get_dependencies(process_fn_id);
        assert_eq!(dependencies.len(), 1); // Only User, as String is not in our symbol list
        assert_eq!(dependencies[0].name, "User");
    }

    #[test]
    fn test_get_dependents() {
        let symbols = create_test_symbols();
        let user_struct_id = symbols[0].id;
        let graph = DependencyGraph::build_graph(symbols);

        let dependents = graph.get_dependents(user_struct_id);
        assert_eq!(dependents.len(), 2);
        let dependent_names: Vec<_> = dependents.iter().map(|s| s.name.as_str()).collect();
        assert!(dependent_names.contains(&"process"));
        assert!(dependent_names.contains(&"main"));
    }
}
