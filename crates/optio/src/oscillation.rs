use ahash::AHasher;
use std::hash::{Hash, Hasher};

pub struct OscillationDetector {
    hashes: Vec<u64>,
    window_size: usize,
}

impl OscillationDetector {
    pub fn new(window_size: usize) -> Self {
        Self {
            hashes: Vec::new(),
            window_size,
        }
    }

    pub fn add_code(&mut self, code: &str) {
        let hash = Self::compute_hash(code);
        self.hashes.push(hash);

        // Keep only the last window_size hashes
        if self.hashes.len() > self.window_size {
            self.hashes.remove(0);
        }
    }

    pub fn detect_oscillation(&self) -> bool {
        if self.hashes.len() < 2 {
            return false;
        }

        let last_hash = self.hashes[self.hashes.len() - 1];

        // Check if the last hash appears earlier in the window
        // This indicates the agent returned to a previous state
        self.hashes[..self.hashes.len() - 1].contains(&last_hash)
    }

    pub fn detect_cycle(&self) -> Option<Vec<usize>> {
        // Detect if there's a repeating pattern (e.g., A, B, A, B, A, B)
        if self.hashes.len() < 4 {
            return None;
        }

        // Try different cycle lengths
        for cycle_len in 2..=(self.hashes.len() / 2) {
            let mut is_cycle = true;

            for i in cycle_len..self.hashes.len() {
                if self.hashes[i] != self.hashes[i - cycle_len] {
                    is_cycle = false;
                    break;
                }
            }

            if is_cycle {
                return Some((0..cycle_len).collect());
            }
        }

        None
    }

    pub fn reset(&mut self) {
        self.hashes.clear();
    }

    fn compute_hash(code: &str) -> u64 {
        // Normalize the code before hashing (remove whitespace, comments)
        let normalized = Self::normalize_code(code);

        let mut hasher = AHasher::default();
        normalized.hash(&mut hasher);
        hasher.finish()
    }

    fn normalize_code(code: &str) -> String {
        // Remove whitespace and comments for consistent hashing
        code.lines()
            .map(|line| {
                // Remove single-line comments
                let line = if let Some(idx) = line.find("//") {
                    &line[..idx]
                } else {
                    line
                };

                // Trim whitespace
                line.trim()
            })
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join(" ")
    }
}