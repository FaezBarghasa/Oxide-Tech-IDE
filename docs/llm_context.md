# Oxide Tech IDE — LLM Context & Agentic Protocol

## 1. Overview & System Persona
Oxide Tech IDE is a high-performance developer environment built with **Tauri v2 + React 19 + TypeScript + Rust (`oxide_core`)**. It is designed for:
- Bare-metal embedded Rust firmware development (`no_std`, Embassy, RTIC v2, probe-rs, defmt).
- Fast local compilation, PTY terminals, and AST-aware intelligence (`rust-analyzer`).
- Local-first AI agentic workflows (Model Context Protocol / MCP, Tree-sitter RAG, SurrealDB memory).
- Visual workstation tooling (Slint live preview, Iced inspector, embedded display simulation, Playwright E2E).

---

## 2. Codebase Structure & Conventions

### Rust Backend (`src-tauri/`)
- `src/lib.rs`: Tauri builder, state registration, and `tauri::generate_handler![]` registrations.
- `src/handlers/`:
  - `cargo_ops.rs`: Workspace metadata, macro expansion, dependency manipulation.
  - `file_ops.rs`: Workspace file I/O and tree management.
  - `fs_watcher.rs`: Recursive file watch daemon using `notify`.
  - `lsp_daemon.rs`: `rust-analyzer` JSON-RPC stdio daemon.
  - `mcu_debugger_ops.rs`: `probe-rs`, `QEMU`, `defmt` RTT, SVD bitfields.
  - `pty_ops.rs`: `portable-pty` full-duplex terminal management.
  - `search_ops.rs`: Ripgrep JSON streaming text/symbol search & replace.
  - `test_runner_ops.rs`: Test discovery, streaming execution, and `llvm-cov` coverage.
  - `vcs_ops.rs` / `git_async.rs`: Git status, diffs, commits, stash, and logs.
  - `visual_workstation_ops.rs`: Slint, Iced, Embedded display sims, Playwright regression.
- `crates/core/`:
  - `local_history.rs`: Append-only file revision snapshot store.
  - `claude_bridge.rs`: MCP protocol handler and tool discovery.
  - `cortex_engine.rs`: Tree-sitter AST & vector embeddings.
  - `privacy_guard.rs`: Secret and credential redaction.

### Frontend (`src/`)
- `components/`:
  - `editor/`: Monaco Editor (`CodeEditor.tsx`, `EditorTabs.tsx`, `EditorToolbar.tsx`).
  - `search/`: `SearchEverywhereOverlay.tsx` (Double-Shift), `FindInFilesModal.tsx` (`Ctrl+Shift+F`).
  - `git/`: `GitPanel.tsx`, `DiffViewer.tsx`.
  - `tools/`: `TestExplorerToolWindow.tsx`, `LocalHistoryToolWindow.tsx`, `CargoToolWindow.tsx`, `DebuggerToolWindow.tsx`.
  - `orchestration/`: `CognitiveWorkspacePanel.tsx`, `ClaudeParityBridge.tsx`, `ForgeToolSynthesizer.tsx`.
- `services/`:
  - `tauri.ts`: Typed IPC wrapper object `tauriCommands`.
  - `monaco.ts`: Monaco theme (`oxide-dark`), syntax providers, and inlay hints.
- `types/`:
  - `oxide.ts`: Master IDE types (VCS, Cargo, Local History, Tests, Search).
  - `api.ts` & `ast.ts`: File trees, AST nodes, and agent schemas.

---

## 3. Strict Engineering & Verification Standards

1. **Rust Backend**:
   - Rust 2024 Edition (`1.85+`), workspace resolver 2.
   - Zero compiler/clippy warnings (`cargo clippy --workspace -- -D warnings`).
   - Standard format compliance (`cargo fmt --check`).
   - Safe error handling via typed `Result<T, E>` and `oxide_core::errors::OxideError` (zero `.unwrap()` in production code).
2. **TypeScript Frontend**:
   - Strict mode with zero `any`.
   - All Tauri commands typed and centralized in `src/services/tauri.ts`.
   - Clean compilation (`pnpm exec tsc --noEmit`).
