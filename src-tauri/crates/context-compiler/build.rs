fn main() {
    let src_dir = std::path::Path::new("src");

    let mut parser = tree_sitter::Parser::new();
    parser.set_language(tree_sitter_rust::language()).expect("Error loading Rust grammar");

    let mut builder = cc::Build::new();
    builder.include(src_dir);
    builder.file(src_dir.join("parser.c"));
    builder.compile("tree-sitter-parser");
}
