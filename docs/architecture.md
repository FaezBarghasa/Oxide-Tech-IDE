# Oxide Tech IDE — Architecture Blueprint & Technical Specifications

## 1. System Architecture Overview

Oxide Tech IDE uses a hybrid **Tauri v2 + Rust Core + React 19 Frontend** architecture designed for low latency, memory safety, and thread-isolated asynchronous operations.

```
+-------------------------------------------------------------------------------+
|                               FRONTEND (Webview)                              |
|  React 19 + TypeScript (Strict) + Tailwind CSS + Monaco Editor + Xterm.js     |
|  Zustand Stores: EditorStore, FileSystemStore, SettingsStore, DebugStore      |
|  Docking Engine: FlexLayout-React (JetBrains Spatial Layout)                 |
+---------------------------------------+---------------------------------------+
                                        | Tauri IPC (Strict #[tauri::command] + JSON-RPC)
+---------------------------------------v---------------------------------------+
|                             TAURI v2 BACKEND (Rust)                           |
|  Command Handlers: lsp_daemon, pty_ops, fs_watcher, test_runner_ops, etc.     |
+---------------------------------------+---------------------------------------+
                                        | Direct crate dependency
+---------------------------------------v---------------------------------------+
|                                OXIDE CORE CRATE                               |
|  - LocalHistoryEngine (Append-only SQLite / Memory / Disk snapshot store)     |
|  - PtySessionAdapter (portable-pty native UNIX pseudo-terminals)              |
|  - CortexEngine & LocalMemory (Predictive context & vector retrieval)         |
|  - PrivacyGuard & Approvals (Sandboxing & sensitive pattern redaction)        |
|  - ForgeEngine & HardwareDaemons (Serial / MQTT / SVD bitfield parser)        |
+---------------------------------------+---------------------------------------+
                                        | Subprocess & Device FFI
+---------------------------------------v---------------------------------------+
|                            EXTERNAL TOOLCHAINS & HARDWARE                     |
|  - rust-analyzer (Persistent JSON-RPC stdio daemon)                           |
|  - cargo / rustc / clippy / rustfmt                                           |
|  - probe-rs / OpenOCD / QEMU / defmt-rtt (SWD / JTAG / Target RAM)           |
+-------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Language Server Protocol (LSP) Daemon
- **Architecture**: Background child process running `rust-analyzer` with stdio pipe redirection.
- **Protocol**: JSON-RPC 2.0 with content-length framing.
- **State Management**:
  - `LspState` managed in `std::sync::OnceLock<Mutex<Option<LspProcessState>>>`.
  - Stdio write pipe wrapped in `BufWriter` with asynchronous reader thread emitting diagnostics to frontend.
- **Capabilities**:
  - `textDocument/didOpen`, `textDocument/didChange`, `textDocument/didSave`, `textDocument/didClose`.
  - `textDocument/completion` with snippet expansion.
  - `textDocument/hover` with markdown docstring formatting.
  - `textDocument/definition` jump locations.
  - `textDocument/inlayHint` for parameter names, types, and chaining hints.
  - `textDocument/codeAction` for quick fixes (`Alt+Enter`).

### 2.2 Full-Duplex Interactive PTY Terminal
- **Architecture**: `portable-pty` utilizing Linux `NativePtySystem`.
- **Session Lifecycle**:
  - Sessions identified by UUID string stored in thread-safe global registry.
  - Child reader loop spawns dedicated OS thread reading chunks and emitting `pty:output` Tauri events.
  - Resize events dynamically update `PtySize { cols, rows, pixel_width, pixel_height }`.

### 2.3 Filesystem Watcher & Local History
- **Filesystem Watcher**:
  - Powered by `notify::RecommendedWatcher` configured in recursive mode.
  - Path filters eliminate noisy directories (`target/`, `.git/objects/`, `node_modules/`, `*.tmp`).
  - Emits `fs:change` events consumed by `FileSystemStore` and `EditorStore`.
- **Local History Engine**:
  - Encapsulated in `oxide_core::LocalHistoryEngine`.
  - Records immutable snapshots (`LocalHistoryRevision`) keyed by canonical file path.
  - Memory-efficient deduplication based on content hash and byte-size tracking.

### 2.4 Cargo Test Runner
- **Discovery**: Executes `cargo test -- --list --format=terse` capturing standard output and parsing tests into hierarchical module paths.
- **Execution**: Runs individual tests with `cargo test <test_id> -- --exact --nocapture`.
- **Diagnostics**: Regex parser detects panic callstacks, assertion failures, and duration measurements.

### 2.5 Hardware & Embedded Systems Engine
- **`probe-rs` Bridge**: Direct SWD/JTAG debug probe communication with target microcontrollers (STM32, Cortex-M, nRF52, RP2040).
- **SVD Register Parser**: Parses CMSIS-SVD XML files into hierarchical memory-mapped peripheral register structures with real-time bitfield read/write mutations.
- **`defmt` RTT Decoder**: High-speed deferred formatting telemetry decoder reading target RAM RTT buffers.

---

## 3. Frontend Architecture

### 3.1 State Management (Zustand)
- **`editorStore`**: Active file buffers, open tabs, unsaved dirty states, and cursor positions.
- **`fileSystemStore`**: Workspace directory tree, expanded folders, and root path synchronization.
- **`settingsStore`**: Theme, keymap schemes (Default IntelliJ, VSCode, Emacs), font size, minimap, and AI provider configurations.
- **`debugStore`**: Active breakpoints, current stepping line, and target chip profiles.

### 3.2 UI Component Layer
- **Monaco Editor**: Tailored Monarch Rust syntax tokenizer, glyph margin breakpoints, inlay hints, and gutter diffs.
- **FlexLayout Docking**: JetBrains-style 3-border dock layout with persistent layout saving to `~/.oxide/layout.json`.
- **Search Everywhere Overlay**: Double-Shift modal powered by `fuse.js` indexing files, classes, structs, actions, and symbols.
