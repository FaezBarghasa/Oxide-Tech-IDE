pub struct ANSIStreamCleaner;

impl ANSIStreamCleaner {
    pub fn strip_ansi_codes(input: &str) -> String {
        let mut result = String::with_capacity(input.len());
        let mut in_escape = false;
        let mut chars = input.chars();

        while let Some(c) = chars.next() {
            if in_escape {
                if c.is_alphabetic() {
                    in_escape = false;
                }
            } else if c == '\x1B' {
                if chars.next() == Some('[') {
                    in_escape = true;
                }
            } else {
                result.push(c);
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_ansi_codes() {
        let input = "\x1B[31mHello\x1B[0m, \x1B[32mWorld\x1B[0m!";
        let expected = "Hello, World!";
        assert_eq!(ANSIStreamCleaner::strip_ansi_codes(input), expected);
    }

    #[test]
    fn test_benchmark_strip_ansi_codes() {
        let mut input = String::new();
        for _ in 0..10000 {
            input.push_str("\x1B[31mHello\x1B[0m, \x1B[32mWorld\x1B[0m!");
        }

        let start = std::time::Instant::now();
        let _ = ANSIStreamCleaner::strip_ansi_codes(&input);
        let duration = start.elapsed();

        // This is a simple benchmark. A real implementation would use a library like `criterion`.
        // We are aiming for >100MB/sec. This input is small, so we just check that it's fast.
        let mb_per_sec = (input.len() as f64 / 1_000_000.0) / duration.as_secs_f64();
        println!("Stripped {} MB in {:?}, {} MB/s", input.len() as f64 / 1_000_000.0, duration, mb_per_sec);
        assert!(mb_per_sec > 100.0);
    }
}
