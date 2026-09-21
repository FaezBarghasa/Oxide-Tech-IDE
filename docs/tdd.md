# Oxide Tech IDE — Test-Driven Development (TDD) & Quality Assurance Guide

## 1. Testing Philosophy & Standards

Oxide Tech IDE follows strict **Test-Driven Development (TDD)** and automated quality engineering across both the Rust native backend (`oxide_core` / `oxide-tech-ide`) and the React 19 TypeScript frontend.

### 1.1 Quality Gates
- **Rust Backend**:
  - `cargo test --workspace`: 100% test pass rate across all unit, integration, and chaos suites.
  - `cargo clippy --workspace -- -D warnings`: Zero lint warnings permitted.
  - `cargo fmt --check`: Strict standard formatting.
  - Production code rule: Zero `unwrap()` in non-test paths (use `Result`, `Option`, or proper error mapping).
- **TypeScript Frontend**:
  - `pnpm exec tsc --noEmit`: Strict mode with `zero any` types.
  - `pnpm run build`: Production bundle compilation validation.

---

## 2. Test Suite Organization

```
Oxide-Tech-IDE/
├── src-tauri/
│   ├── crates/core/
│   │   └── src/
│   │       ├── local_history.rs     -> unit tests for snapshot append & retrieval
│   │       ├── local_memory.rs      -> unit tests for vector context and profile hints
│   │       ├── claude_bridge.rs     -> unit tests for MCP tool discovery & parsing
│   │       ├── privacy_guard.rs     -> unit tests for secret redaction & isolation
│   │       └── cortex_engine.rs     -> unit tests for embedding normalization
│   ├── src/handlers/
│   │   ├── search_ops.rs            -> unit tests for ripgrep streaming & symbol extraction
│   │   └── test_runner_ops.rs       -> unit tests for cargo test json parser & llvm-cov reports
│   └── tests/
│       ├── integration_tests.rs     -> PTY session lifecycle & full swarm execution
│       ├── chaos_tests.rs           -> Crash recovery & sandbox process isolation
│       └── security_tests.rs        -> Shell escaping & path traversal prevention
└── src/
    └── (E2E / Component tests via Playwright & Vitest)
```

---

## 3. Key Test Execution Commands

```bash
# Run all workspace unit and integration tests
cargo test --workspace --manifest-path src-tauri/Cargo.toml

# Run single test with standard output visible
cargo test --manifest-path src-tauri/Cargo.toml test_pty_terminal_session -- --exact --nocapture

# Verify strict clippy
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# Verify formatting
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check

# Validate frontend type safety
pnpm exec tsc --noEmit

# Run production Vite build
pnpm run build
```

---

## 4. Example Unit Test Pattern (`oxide_core`)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_local_history_record_and_query() {
        let engine = LocalHistoryEngine::new_in_memory();
        let file = "/workspace/src/main.rs";
        
        let rev1 = engine.record_snapshot(file, "fn main() {}", "initial").expect("record snapshot 1");
        assert_eq!(rev1.trigger_tag, "initial");
        assert_eq!(rev1.byte_size, 12);

        let rev2 = engine.record_snapshot(file, "fn main() {\n    println!(\"hello\");\n}", "add-print").expect("record snapshot 2");
        assert_eq!(rev2.trigger_tag, "add-print");

        let revs = engine.get_revisions(file);
        assert_eq!(revs.len(), 2);
        assert_eq!(revs[0].id, rev2.id); // Latest revision first
    }
}
```
