# Oxide Tech IDE — Architecture Blueprint & Technical Specifications

## 1. System Architecture Overview

Oxide Tech IDE uses a multi-tier, local-first architecture engineered for high throughput, memory safety, and seamless FFI between desktop Webview, native Rust runtime, external toolchains, and embedded hardware.

```
+-------------------------------------------------------------------------------+
|                               FRONTEND (Webview)                              |
|  React 19 + TypeScript (Strict) + Tailwind CSS + Monaco Editor + Xterm.js     |
|  Zustand Stores: EditorStore, FileSystemStore, SettingsStore, DebugStore      |
|  Docking Engine: FlexLayout-React (JetBrains Spatial Layout)                 |
|  Specialized Workstations: MCP Hub, r_klipp Telemetry, SVD Tree, 3-Way Merge  |
+---------------------------------------+---------------------------------------+
                                        | Tauri IPC (Strict #[tauri::command] + JSON-RPC)
+---------------------------------------v---------------------------------------+
|                             TAURI v2 BACKEND (Rust)                           |
|  - lsp_daemon: Persistent rust-analyzer JSON-RPC 2.0 stdio daemon             |
|  - pty_ops: Full-duplex interactive terminal via portable-pty                 |
|  - fs_watcher: Debounced recursive file monitor via notify                    |
|  - mcu_debugger_ops: probe-rs / OpenOCD / QEMU / defmt RTT / SVD engine      |
|  - test_runner_ops: Cargo test discovery, execution, & failure parser        |
|  - visual_workstation_ops: Slint / Iced / Embedded Sim / Playwright diffs     |
+---------------------------------------+---------------------------------------+
                                        | Direct crate dependency
+---------------------------------------v---------------------------------------+
|                                OXIDE CORE CRATE                               |
|  - LocalHistoryEngine: Append-only file revision snapshot store               |
|  - ClaudeBridge & McpHub: Model Context Protocol (MCP) server integration     |
|  - CortexEngine & LocalMemory: Tree-sitter AST & local vector RAG             |
|  - Approvals & SecurityBroker: Human-in-the-loop (HITL) approval gates        |
|  - SandboxEngine: Wasmtime isolated execution for untrusted code               |
|  - ForgeEngine: Parametric CAD / Circuit / EDA live synthesis                 |
|  - PrivacyGuard: Sensitive token, key, and password redaction                 |
+---------------------------------------+---------------------------------------+
                                        | Subprocess, IPC, SWD/JTAG, Serial
+---------------------------------------v---------------------------------------+
|                       EXTERNAL TOOLCHAINS, OS & HARDWARE                      |
|  - rust-analyzer / cargo / rustc / clippy / rustfmt                           |
|  - probe-rs / ST-Link / J-Link / CMSIS-DAP -> STM32 / Cortex-M (r_klipp)     |
|  - QEMU Emulator (Cortex-M / RISC-V / Redox OS microkernel)                   |
|  - Local Vector Store (Qdrant) & SurrealDB Memory Graph                       |
|  - MQTT 5.0 Broker & Hardware Telemetry Feeds                                 |
+-------------------------------------------------------------------------------+
```

---

## 2. Subsystem Architecture Specifications

### 2.1 Language Server Protocol (`rust-analyzer`)
- **Transport**: JSON-RPC 2.0 over standard input/output (`stdio`) pipes.
- **Process Lifecycle**: Managed asynchronously in `lsp_daemon.rs` via `tokio::process::Command`.
- **Synchronization**: Full document lifecycle tracking (`didOpen`, `didChange`, `didSave`, `didClose`).
- **Features**: Live autocompletion with snippet expansion, hover documentation, type definitions, code actions (`Alt+Enter`), and parameter/chaining inlay hints.

### 2.2 Embedded Hardware & `r_klipp` Telemetry Engine
- **Hardware Debug Bridge (`mcu_debugger_ops.rs`)**:
  - `probe-rs` SWD/JTAG link for direct flash programming and hardware breakpoints.
  - `defmt` RTT decoder parsing deferred logging directly from target RAM ring-buffers.
  - CMSIS-SVD register tree parser exposing real-time bitfield manipulation.
- **`r_klipp` Workspace Intelligence**:
  - Auto-detection of Klipper-modularized Rust crates (`r_klipp_thermal`, `r_klipp_motion`, TMC stepper drivers).
  - Telemetry pipeline decoding real-time kinematics and temperature curves.
- **QEMU System Emulation**:
  - Direct launch hooks for ARM Cortex-M and RISC-V targets with GDB server on port `:1234`.

### 2.3 Model Context Protocol (MCP) & Local AI Agent ("Oxide Brain")
- **MCP Server Hub (`claude_bridge.rs`)**:
  - Manages connections to local and remote MCP servers (`mcp-probe-rs`, `mcp-cargo-gatekeeper`, `mcp-qemu-redox`).
  - Implements stdio and SSE transport protocols.
- **AST-Aware Local RAG (`cortex_engine.rs`)**:
  - Combines `tree-sitter` syntactic parsing with local vector embeddings (`fastembed`, `qdrant`) to supply LLMs with exact code context.
- **Human-in-the-Loop (HITL) Gatekeeper (`approvals.rs`)**:
  - Evaluates swarm workflows and gates destructive mutations (hardware flashing, code overwrites) behind explicit user approvals.
- **Wasmtime Sandbox (`sandbox.rs`)**:
  - Sandboxed WebAssembly runtime executing AI-generated snippets safely with CPU cycle and memory limits.

### 2.4 Redox OS & Systems Core
- **Redox OS Profile**:
  - Terminal pre-configurations for Redox microkernel compilation, `make qemu`, and filtering `netstack`/`ipcd` log output.
- **Zero-Copy Serialization Inspector**:
  - Parser for inspecting raw `rkyv` and `postcard` binary streams, mapping byte offsets directly to Rust struct definitions.

### 2.5 CAD, EDA & Visual Forge Convergence
- **Unified `.oxide-workspace` Schema**:
  - Single manifest specifying code paths, `oxide-eda` schematics/PCBs, `Oxide-3d` CAD models, and active agent journal states.
- **Live Forge Previews (`visual_workstation_ops.rs`)**:
  - Bidirectional canvas rendering for `parametric-forge`, `circuit-forge`, Slint markup, and Iced native widgets.

---

## 3. Data Flow & Security Guarantees

1. **Local-First & Offline Resilience**: Zero hard cloud dependencies; all LSP, RAG, MCU debugging, and compilation tools run entirely on the local host.
2. **PrivacyGuard Protection**: Outgoing prompts or telemetry streams are automatically sanitized against secret leakage (API keys, passwords, certificates).
3. **Deterministic Local History**: File changes are recorded in an append-only snapshot ledger with deduplication and rollback capabilities independent of Git.
