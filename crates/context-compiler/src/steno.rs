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
        let mut compressed_code = raw_code.to_string();
        for (original, steno) in &self.compression_map {
            compressed_code = compressed_code.replace(original, steno);
        }

        // Strip import headers, formatting, spaces, and line comments.
        let mut result = String::new();
        for line in compressed_code.lines() {
            let trimmed_line = line.trim();
            if !trimmed_line.starts_with("use") && !trimmed_line.starts_with("import") && !trimmed_line.starts_with("//") {
                result.push_str(trimmed_line);
                result.push(' ');
            }
        }
        result
    }

    pub fn decompress(&self, compressed_code: &str) -> String {
        let mut decompressed_code = compressed_code.to_string();
        for (steno, original) in &self.decompression_map {
            decompressed_code = decompressed_code.replace(steno, original);
        }
        decompressed_code
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_decompress() {
        let mut codec = StenoCodec::new();
        let symbols = vec![
            ParsedSymbol {
                identifier: "my_function".to_string(),
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

        let raw_code = r#"
            use std::collections::HashMap;

            fn my_function(s: &MyStruct) {
                println!("Hello");
            }
        "#;

        let compressed = codec.compress(raw_code);
        let decompressed = codec.decompress(&compressed);

        // This is a simplified test. A real implementation would need to handle formatting.
        assert!(compressed.contains("st_0"));
        assert!(compressed.contains("st_1"));
        assert!(!decompressed.contains("st_0"));
        assert!(!decompressed.contains("st_1"));
        assert!(decompressed.contains("my_function"));
        assert!(decompressed.contains("MyStruct"));
    }

    #[test]
    fn test_compression_ratio() {
        let mut codec = StenoCodec::new();
        let symbols = vec![
            ParsedSymbol {
                identifier: "a_very_long_function_name_to_compress".to_string(),
                kind: "function".to_string(),
                start_line: 0,
                end_line: 0,
                parameters: vec![],
            },
        ];
        codec.learn_symbols_from_graph(&symbols);

        let raw_code = "fn a_very_long_function_name_to_compress() {}";
        let compressed = codec.compress(raw_code);

        let ratio = 1.0 - (compressed.len() as f32 / raw_code.len() as f32);
        assert!(ratio >= 0.5);
    }
}
