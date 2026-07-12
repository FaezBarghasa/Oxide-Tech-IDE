use std::collections::HashMap;
use crate::parser::ParsedSymbol;

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

    pub fn learn_symbols_from_graph(&mut self, symbols: &[ParsedSymbol]) {
        for symbol in symbols {
            if !self.compression_map.contains_key(&symbol.identifier) {
                let steno_key = format!("st_{}", self.counter);
                self.compression_map.insert(symbol.identifier.clone(), steno_key.clone());
                self.decompression_map.insert(steno_key, symbol.identifier.clone());
                self.counter += 1;
            }
        }
    }

    pub fn compress(&self, raw_code: &str) -> String {
        let mut compressed = raw_code.to_string();
        for (original, steno) in &self.compression_map {
            compressed = compressed.replace(original, steno);
        }
        // Simple whitespace and comment removal
        compressed.lines()
            .map(|line| line.trim())
            .filter(|line| !line.starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn decompress(&self, compressed_code: &str) -> String {
        let mut decompressed = compressed_code.to_string();
        for (steno, original) in &self.decompression_map {
            decompressed = decompressed.replace(steno, original);
        }
        decompressed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_decompression() {
        let mut codec = StenoCodec::new();
        let symbols = vec![
            ParsedSymbol {
                identifier: "my_long_function_name".to_string(),
                kind: "function".to_string(),
                start_line: 0,
                end_line: 0,
                parameters: vec![],
            },
            ParsedSymbol {
                identifier: "MyStruct".to_string(),
                kind: "struct".to_string(),
                start_line: 0,
                end_line: 0,
                parameters: vec![],
            },
        ];
        codec.learn_symbols_from_graph(&symbols);

        let raw_code = "fn my_long_function_name(s: MyStruct) {\n    // a comment\n}";
        let compressed = codec.compress(raw_code);
        assert!(compressed.contains("st_0"));
        assert!(compressed.contains("st_1"));
        assert!(!compressed.contains("//"));

        let decompressed = codec.decompress(&compressed);
        assert!(decompressed.contains("my_long_function_name"));
        assert!(decompressed.contains("MyStruct"));
    }

    #[test]
    fn test_compression_ratio() {
        let mut codec = StenoCodec::new();
        let symbols = vec![ParsedSymbol {
            identifier: "a_very_long_and_descriptive_name".to_string(),
            kind: "function".to_string(),
            start_line: 0, end_line: 0, parameters: vec![],
        }];
        codec.learn_symbols_from_graph(&symbols);
        let raw = "let a_very_long_and_descriptive_name = 1;";
        let compressed = codec.compress(raw);
        let ratio = 1.0 - (compressed.len() as f32 / raw.len() as f32);
        assert!(ratio >= 0.5);
    }
}
