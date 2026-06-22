pub fn format_error(context: &str, error: &impl std::fmt::Display) -> String {
    format!("{}: {}", context, error)
}
