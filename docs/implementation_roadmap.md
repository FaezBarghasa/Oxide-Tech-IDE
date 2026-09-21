# Oxide Tech IDE — Reality-Based Implementation Roadmap

## Overview & Reality-Based Core Differentiators
Oxide Tech IDE is engineered as a local-first, Rust 2024 / 1.85+ developer environment with hardware-level telemetry, Model Context Protocol (MCP) AI orchestration, append-only local history snapshots, and native AST vector graphs via SurrealDB 3 and Candle Qwen3 embeddings.

---

## Phase Matrix & Status

| Phase | Subsystem | Components | Status |
|---|---|---|---|
| **Phase 1: Stabilize & Polish** | UI / Memory / VCS | Breadcrumbs navigation, Memory Profile in Status Bar, Git Blame & Cherry-Pick, Keymaps | **COMPLETED** ✅ |
| **Phase 2: Embedded Hardware** | MCU / SWD / RTT | Hex Memory View (read/write), Cortex-M Disassembly, SVD Peripheral inspector, defmt RTT, QEMU | **COMPLETED** ✅ |
| **Phase 3: Search & Language** | LSP / Ripgrep / AST | Rust-Analyzer JSON-RPC daemon, Streaming Ripgrep, AST Symbol search, Global Replace | **COMPLETED** ✅ |
| **Phase 4: Test & Coverage** | Cargo Test / LLVM Cov | Test explorer, streaming test runner, LLVM source code coverage reporting | **COMPLETED** ✅ |
| **Phase 5: AI & Knowledge Graph** | Cortex / MCP / Forge | Candle Qwen3-0.6B HAL, SurrealDB 1024-dim MTREE vector graph, Lazar Forge JIT Wasm synthesis, Compiler Guard self-healing | **COMPLETED** ✅ |
| **Phase 6: Quality & Verification** | CI/CD / Formatting | Strict clippy gates (`-D warnings`), zero TS errors (`tsc --noEmit`), multi-platform CI | **COMPLETED** ✅ |

---

## Verification Summary
- `cargo clippy -- -D warnings`: **0 warnings**
- `cargo test`: **7/7 test suites passing**
- `pnpm exec tsc --noEmit`: **0 errors**
