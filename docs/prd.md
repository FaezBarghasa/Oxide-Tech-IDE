# Oxide Tech IDE — Product Requirements Document (PRD)

## 1. Executive Summary

**Oxide Tech IDE** is an enterprise-grade, high-performance integrated development environment engineered to compete directly with **JetBrains RustRover, CLion, and IntelliJ IDEA**, while functioning as an ultra-fast **Full-Stack Visual Engineering Workstation** tailored for Systems Programming (Rust), Embedded Hardware Development (STM32, Cortex-M, RISC-V), and Declarative Visual Engineering (Slint, Iced, Embedded Graphics, Playwright E2E).

Built with **Tauri v2 + React 19 + TypeScript (strict mode, zero `any`) + Rust (`oxide_core`)**, Oxide Tech IDE delivers sub-millisecond local-first responsiveness, minimal memory footprint (<200MB RSS idle vs 1.5GB+ JVM), and tight integration with embedded debuggers and AI assistance.

---

## 2. Product Objectives & Target Audience

### 2.1 Core Target Audience
- **Systems & Embedded Engineers**: Rust developers working on Cortex-M4F/M7, STM32, Redox OS, and bare-metal targets requiring seamless probe-rs and defmt RTT support.
- **Desktop & Native UI Developers**: Engineers building modern cross-platform interfaces using Slint markup, Iced GUI, and Web frameworks.
- **Enterprise Rust Developers**: Teams requiring JetBrains-grade code navigation, intelligent refactoring, multi-branch conflict resolution, and cargo workspace management.

### 2.2 Success Metrics & Key Results (OKRs)
- **Startup Time**: Cold start to interactive editor in `< 400ms`.
- **Memory Footprint**: Base workspace footprint `< 250MB` RSS.
- **LSP Latency**: Completion and hover response times `< 20ms` via persistent `rust-analyzer` JSON-RPC stdio daemon.
- **Crash Recovery & Safety**: Zero code loss via granular append-only Local History snapshots.

---

## 3. Feature Specifications

### 3.1 JetBrains RustRover UX & Navigation Parity
- **Global Search Everywhere (`Shift+Shift`)**: Unified multi-category search across All, Classes/Structs, Files, Symbols, Actions, and AI suggestions with fuzzy ranking.
- **Top Menu Hierarchy & Keymaps**: 12 top-level cascading menus with default IntelliJ / RustRover keymap bindings (`Shift+F10`, `Shift+F9`, `Ctrl+F9`, `Alt+Enter`, `Ctrl+Alt+S`).
- **Context Actions & Quick Fixes (`Alt+Enter`)**: AI auto-fix, derive macro injection, Cargo check invocation, and syn macro expansion.
- **Flexible Spatial Docking (`flexlayout-react`)**: Left, right, and bottom tool stripes with tear-off, split, and maximize capabilities.

### 3.2 High-Performance Language Server Protocol (`rust-analyzer`)
- Persistent asynchronous stdio JSON-RPC 2.0 daemon.
- Document synchronization: `didOpen`, `didChange`, `didSave`, and `didClose`.
- Inlay hints (parameter names, chained return types, let bindings).
- Real-time compiler diagnostics and Monaco marker overlays.

### 3.3 Full-Duplex Interactive PTY Terminal
- Native UNIX pseudo-terminal via `portable-pty`.
- Asynchronous streaming with `tokio` background thread loops.
- `xterm.js` front-end with `xterm-addon-fit`, ANSI colors, and multi-session tabs.

### 3.4 Autonomous Filesystem Watcher & Local History
- Recursive file system event monitoring via `notify` with noise filtering (`target/`, `.git/objects/`).
- Granular append-only revision snapshots on file saves, edits, and merge actions.
- JetBrains-style Local History tool window with revision comparison and one-click rollback.

### 3.5 Cargo Test Runner & 3-Way Merge Resolution
- Dynamic test discovery via `cargo test -- --list --format=terse`.
- Single and suite test execution with live stdout/stderr capture and failure parsing.
- 3-Pane visual merge modal (Ours, Base, Theirs) with real-time resolved buffer editor.

### 3.6 Hardware & Embedded Systems Workstation
- Multi-engine debug support: `probe-rs`, `OpenOCD`, `QEMU` Cortex-M emulator, and `LLDB`.
- Live SVD peripheral register tree with bitfield read/write inspection.
- Microsecond-accurate `defmt` RTT logging directly from target RAM.
- MQTT 5.0 pub/sub telemetry terminal with wildcard topic filters.

### 3.7 Visual Engineering Workstations
- **Slint Declarative Preview**: Live software canvas rendering with bi-directional pointer events.
- **Embedded Graphics Display Simulator**: Hardware profiles (SSD1306, ST7789, ILI9341, e-Ink) with 600% zoom and D-pad input injection.
- **Iced GUI Inspector**: Widget hierarchy tree inspection and hot reload.
- **Playwright Visual E2E**: Test runner and visual regression pixel diffing.

---

## 4. Non-Functional Requirements (NFRs)

| Attribute | Requirement |
| :--- | :--- |
| **Performance** | Editor typing latency `< 8ms`, Terminal render FPS `>= 60fps`. |
| **Security** | Zero telemetry leakage; local-first secret isolation; sandboxed command execution. |
| **Portability** | Tier-1 support for Linux (Pop!_OS / Ubuntu / Wayland / X11), macOS, and Windows. |
| **Code Quality** | Strict TypeScript (`zero any`), zero `unwrap()` in production Rust paths, Clippy clean. |
| **Offline Resilience** | 100% functional without internet connectivity; local LSP and embedded toolchains. |
