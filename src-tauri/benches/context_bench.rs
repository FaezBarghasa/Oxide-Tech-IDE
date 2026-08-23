use criterion::{criterion_group, criterion_main, Criterion};
use oxide_tech_ide::context_compiler::{RustAstParser, LocalEmbedder};

fn bench_ast_parsing(c: &mut Criterion) {
    let source_code = r#"
        pub struct User {
            pub id: u64,
            pub name: String,
        }

        impl User {
            pub fn new(id: u64, name: String) -> Self {
                Self { id, name }
            }
        }

        pub fn process_user(user: User) -> String {
            format!("User: {}", user.name)
        }
    "#;

    c.bench_function("ast_parsing", |b| {
        b.iter(|| {
            RustAstParser::parse_file(&PathBuf::from("test.rs"), source_code).unwrap()
        })
    });
}

fn bench_embedding(c: &mut Criterion) {
    let embedder = LocalEmbedder::new().unwrap();

    c.bench_function("embedding_single", |b| {
        b.iter(|| {
            embedder.embed_query("pub fn main() {}").unwrap()
        })
    });
}

criterion_group!(benches, bench_ast_parsing, bench_embedding);
criterion_main!(benches);