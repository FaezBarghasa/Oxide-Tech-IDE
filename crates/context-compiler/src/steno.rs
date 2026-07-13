use std::collections::HashMap;
use crate::parser::ParsedSymbol;

pub struct StenoCodec {
    compression_map: HashMap<String, String>,
    decompression_map: HashMap<String, String>,
    counter: usize,
}

impl Default for StenoCodec {
    fn default() -> Self {
        Self {
            compression_map: HashMap::new(),
            decompression_map: HashMap::new(),
            counter: 0,
        }
    }
}

impl StenoCodec {
    pub fn new() -> Self {
        Self::default()
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
        let mut compressed_code = raw_code.to_string();
        for (key, value) in &self.compression_map {
            compressed_code = compressed_code.replace(key, value);
        }
        // Basic whitespace and comment stripping
        compressed_code.lines()
            .map(|line| line.trim())
            .filter(|line| !line.starts_with("//"))
            .collect::<Vec<&str>>()
            .join(" ")
    }

    pub fn decompress(&self, compressed_code: &str) -> String {
        let mut decompressed_code = compressed_code.to_string();
        for (key, value) in &self.decompression_map {
            decompressed_code = decompressed_code.replace(key, value);
        }
        decompressed_code
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::ParsedSymbol;

    #[test]
    fn test_compression_decompress() {
        let mut codec = StenoCodec::new();
        let symbols = vec![
            ParsedSymbol {
                identifier: "my_long_function_name".to_string(),
                kind: "function".to_string(),
                start_line: 0,
                end_line: 0,
                parameters: vec![],
            },
        ];
        codec.learn_symbols_from_graph(&symbols);

        let raw_code = "fn my_long_function_name() { /* ... */ }";
        let compressed = codec.compress(raw_code);
        let decompressed = codec.decompress(&compressed);

        assert_ne!(raw_code, compressed);
        assert!(decompressed.contains("my_long_function_name"));
    }

    #[test]
    fn test_compression_ratio() {
        let mut codec = StenoCodec::new();
        let symbols = vec![
            ParsedSymbol {
                identifier: "a_very_long_and_descriptive_variable_name".to_string(),
                kind: "variable".to_string(),
                start_line: 0,
                end_line: 0,
                parameters: vec![],
            },
        ];
        codec.learn_symbols_from_graph(&symbols);
        let raw_code = "let a_very_long_and_descriptive_variable_name = 42;";
        let compressed = codec.compress(raw_code);
        let ratio = 1.0 - (compressed.len() as f32 / raw_code.len() as f32);
        assert!(ratio >= 0.5);
    }
}
