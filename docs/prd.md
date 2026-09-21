# Oxide Tech IDE — Product Requirements Document (PRD)

## 1. Executive Summary

**Oxide Tech IDE** is an enterprise-grade, high-performance integrated development environment and **Central Nervous System / Visual Orchestration Layer** for advanced systems programming, embedded hardware development, local AI agentic workflows, and declarative visual engineering.

Built with **Tauri v2 + React 19 + TypeScript (strict mode, zero `any`) + Rust (`oxide_core`)**, Oxide Tech IDE combines **commercial-grade IDE UX parity** with deep, purpose-built integrations for:
1. **Embedded & Real-Time Hardware**: First-class support for `r_klipp` (3D printer firmware architecture), `embedded-hal`, `probe-rs`, `defmt` RTT, SVD peripheral register mapping, and QEMU Cortex-M/RISC-V emulation.
2. **Local AI & Agentic Orchestration ("Oxide Brain")**: Model Context Protocol (MCP) server management, AST-aware local RAG (Tree-sitter + Qdrant + SurrealDB), sandboxed Wasm/Wasmtime execution, and human-in-the-loop (HITL) approval gates.
3. **OS & Systems Programming**: Native Redox OS microkernel development workflow, Unix-like IPC/network daemon integration (`netstack`, `ipcd`), zero-copy binary inspection (`rkyv`, `postcard`), and PTY session multiplexing.
4. **Visual Engineering & CAD/EDA Convergence**: Live Slint/Iced previews, Playwright E2E visual regression, and programmatic CAD/EDA preview panes for `oxide-eda` and Forge engines (`parametric-forge`, `circuit-forge`).

---

## 2. Product Objectives & Target Ecosystem

### 2.1 Developer Ecosystem Profile
- **Systems & Embedded Engineers**: Rust developers creating bare-metal firmware (`no_std`), Cortex-M4F/M7 kinematics, and motor controllers (`r_klipp`, TMC drivers, SPI/I2C peripherals).
- **OS & Microkernel Developers**: Systems engineers developing drivers, servers, and microkernel components for Redox OS and embedded Linux.
- **Agentic AI & Meta-Tooling Architects**: Engineers building autonomous coding pipelines using MCP servers, `.agentic`, `.evolver`, `.vibe-loop.json`, and local vector databases.
- **Parametric Hardware & EDA Designers**: Developers generating schematics, PCBs, and 3D geometries programmatically via Rust crates.

### 2.2 Success Metrics & Key Results (OKRs)
- **Startup Latency**: Cold start to interactive editor in `< 400ms`.
- **Memory Footprint**: Base workspace footprint `< 250MB` RSS (vs. 1.5GB+ JVM for standard JetBrains suites).
- **LSP Latency**: Completion and hover response times `< 20ms` via persistent `rust-analyzer` JSON-RPC stdio daemon.
- **Zero Loss Local History**: Deterministic snapshot recovery with zero code loss and sub-second rollback.
- **Hardware Loop Latency**: One-click build-flash-log cycle in `< 2.5s` via direct probe-rs SWD link.

---

## 3. Detailed Feature Specifications

### 3.1 Modern Desktop IDE UX & Navigation Parity
- **Global Search Everywhere (`Shift+Shift`)**: Fast fuzzy searching across All, Classes/Structs, Files, Symbols, Actions, and Oxide AI.
- **Configurable Keymap & Spatial Docking**: Standard keybindings (`Shift+F10`, `Shift+F9`, `Ctrl+F9`, `Alt+Enter`, `Ctrl+Alt+S`) and `flexlayout-react` docking engine with persistent layout storage (`~/.oxide/layout.json`).
- **Context Actions (`Alt+Enter`)**: AI quick-fix, derive macro insertion, syn macro expansion, and cargo check trigger.
- **3-Way Visual Merge Window**: Ours, Base, and Theirs 3-pane merge tool with live interactive resolved buffer editor.

### 3.2 Embedded & `r_klipp` Hardware Workstation
- **Native `r_klipp` Workspace Detection**: Auto-detects 3D printer firmware and embedded crates (`embedded-hal`, `r_klipp_thermal`, `r_klipp_motion`).
- **One-Click Build, Flash & RTT Log**: Chains `cargo build --target thumbv7em-none-eabihf` → `probe-rs run` → real-time `defmt` RTT decoding without semihosting delays.
- **Context-Aware SVD Inspector**: Auto-scrolls and highlights peripheral registers (`GPIOA`, `RCC`, `TIM2`) in the SVD bitfield inspector when hovered or navigated in editor code.
- **Thermal & Kinematics Telemetry Dashboard**: Real-time graphs for heater curves, thermistor readings, stepper step-timing, and kinematics state.
- **QEMU System Emulator**: Cortex-M0/M3/M4/RISC-V machine emulator with GDB stub `:1234` and semihosting console integration.

### 3.3 First-Class Model Context Protocol (MCP) & AI Agentic Layer
- **Built-in MCP Server Hub**: Visual control panel to discover, toggle, and inspect local and remote MCP servers (`mcp-probe-rs`, `mcp-cargo-gatekeeper`, `mcp-qemu-redox`).
- **Human-in-the-Loop (HITL) Approvals**: Integrated review modal and editor gutter badges for reviewing and approving agent-proposed code mutations or hardware commands.
- **AST-Aware Local RAG (`Oxide Brain`)**: Queries local Tree-sitter AST syntax and vector embeddings (`qdrant` / `fastembed`) to supply LLMs with precise semantic context.
- **Self-Evolution & Meta-Tooling**: Syntax support and validation for `.vibe-loop.json`, `.evolver`, `.agentic`, and command palette action to trigger `self-evolver` routines safely.

### 3.4 OS & Redox Systems Development
- **Redox OS Development Mode**: Pre-configured environment for compiling and running Redox components (`netstack`, `ipcd`, `logd`, `randd`) with QEMU microkernel launch hooks.
- **Wasm/Wasmtime Isolated Sandbox**: Executes untrusted or agentic code snippets in an isolated WebAssembly sandbox with resource limits before applying diffs.
- **Zero-Copy Serialization Debugger**: Decodes and inspects `rkyv` and `postcard` binary hex dumps into readable Rust structs based on local crate ASTs.

### 3.5 Visual Engineering & CAD/EDA Convergence
- **Unified `.oxide-workspace` Protocol**: Workspace descriptor combining Rust crates, `oxide-eda` schematics/PCBs, `Oxide-3d` CAD models, and agent journals.
- **Live Forge Preview Panes**: Split-pane visualizers for `parametric-forge`, `visual-forge`, and `circuit-forge` rendering outputs side-by-side with code.
- **Slint & Iced Live Previews**: Real-time canvas rendering with bi-directional pointer events and sub-500ms hot reload.
- **Playwright E2E Visual Regression**: Pixel-by-pixel diff comparisons against golden image baselines.

---

## 4. Non-Functional Requirements (NFRs)

| Category | Specification |
| :--- | :--- |
| **Performance** | Input-to-render latency `< 8ms`, 60 FPS terminal & visual canvas rendering, `< 250MB` idle RSS. |
| **Security & Privacy** | Local-first architecture; `PrivacyGuard` secret redaction; sandboxed Wasm execution. |
| **Platform Support** | Linux (Pop!_OS Wayland/X11, Ubuntu), macOS, Windows; offline-first functionality without cloud reliance. |
| **Code Standard** | Strict TypeScript (`zero any`), no `unwrap()` in production Rust backend, 100% `cargo clippy -- -D warnings` and `cargo fmt` adherence. |
