pub struct ANSIStreamCleaner;

impl ANSIStreamCleaner {
    pub fn strip_ansi_codes(input: &str) -> String {
        let mut output = String::with_capacity(input.len());
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
                output.push(c);
            }
        }
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use criterion::Criterion;

    #[test]
    fn test_strip_ansi_codes() {
        let input = "\x1B[31mHello\x1B[0m, \x1B[32mWorld\x1B[0m!";
        let expected = "Hello, World!";
        assert_eq!(ANSIStreamCleaner::strip_ansi_codes(input), expected);
    }

    fn ansi_cleaner_benchmark(c: &mut Criterion) {
        let input = "\x1B[31mHello\x1B[0m, \x1B[32mWorld\x1B[0m!".repeat(1000);
        c.bench_function("strip_ansi", |b| b.iter(|| ANSIStreamCleaner::strip_ansi_codes(&input)));
    }

    criterion::criterion_group!(benches, ansi_cleaner_benchmark);
}
