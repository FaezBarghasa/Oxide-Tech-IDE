use std::collections::HashMap;
use crate::parser::CodeSymbol;

pub struct StenoCodec {
    compression_map: HashMap<String, String>,
    decompression_map: HashMap<String, String>,
    counter: usize,
}

impl StenoCodec {
    pub fn new() -> Self {
        Self {
            compression_map: HashMap::new(),
            decompression_map: HashMap::new(),
            counter: 0,
        }
    }

    pub fn learn_symbols_from_ast(&mut self, symbols: &[CodeSymbol]) {
        for symbol in symbols {
            if !self.compression_map.contains_key(&symbol.name) {
                let key = format!("st_{}", self.counter);
                self.compression_map.insert(symbol.name.clone(), key.clone());
                self.decompression_map.insert(key, symbol.name.clone());
                self.counter += 1;
            }
        }
    }

    pub fn compress(&self, raw_code: &str) -> String {
        let mut compressed_code = raw_code.to_string();
        for (symbol, key) in &self.compression_map {
            compressed_code = compressed_code.replace(symbol, key);
        }
        // Simple comment and whitespace removal
        compressed_code.lines()
            .map(|line| line.trim())
            .filter(|line| !line.starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn decompress(&self, compressed_code: &str) -> String {
        let mut decompressed_code = compressed_code.to_string();
        for (key, symbol) in &self.decompression_map {
            decompressed_code = decompressed_code.replace(key, symbol);
        }
        decompressed_code
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::{SymbolKind, RustAstParser};
    use std::path::PathBuf;
    use criterion::Criterion;

    #[test]
    fn test_steno_compression_decompress() {
        let source = r#"
            struct User { name: String }
            fn get_user_name(user: User) -> String {
                user.name.clone()
            }
        "#;
        let symbols = RustAstParser::parse_file(&PathBuf::from("test.rs"), source).unwrap();
        let mut codec = StenoCodec::new();
        codec.learn_symbols_from_ast(&symbols);

        let compressed = codec.compress(source);
        let decompressed = codec.decompress(&compressed);

        // This is a simplified test. A real implementation would need to handle whitespace and comments more robustly.
        assert!(compressed.contains("st_0"));
        assert!(compressed.contains("st_1"));
        assert!(decompressed.contains("User"));
        assert!(decompressed.contains("get_user_name"));
    }

    fn steno_benchmark(c: &mut Criterion) {
        let source = r#"
            pub fn process_data(data: Vec<String>) -> Vec<String> {
                data.into_iter().map(|s| s.to_uppercase()).collect()
            }
        "#;
        let symbols = RustAstParser::parse_file(&PathBuf::from("test.rs"), source).unwrap();
        let mut codec = StenoCodec::new();
        codec.learn_symbols_from_ast(&symbols);

        c.bench_function("compress", |b| b.iter(|| codec.compress(source)));
    }

    criterion::criterion_group!(benches, steno_benchmark);
}
