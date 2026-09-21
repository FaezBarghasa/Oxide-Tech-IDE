# Oxide Tech IDE — Architecture & Interaction Diagrams

## 1. Complete System Context & Ecosystem Blueprint (C4 Model)

```mermaid
graph TD
    User["👨‍💻 Systems & Embedded Engineer"]

    subgraph OxideIDE ["Oxide Tech IDE (Tauri v2 Workstation)"]
        subgraph Frontend ["React 19 + TypeScript Frontend (Strict Zero-Any)"]
            Monaco["Monaco Editor (Rust Syntax, Inlay Hints, Gutter Diffs)"]
            Dock["FlexLayout Spatial Docking (JetBrains Layout)"]
            Xterm["Xterm.js Interactive PTY Terminal (Multi-Session)"]
            McpUI["MCP Server Hub & HITL Approvals Panel"]
            SvdUI["SVD Peripheral & Register Inspector"]
            KlippUI["r_klipp Thermal & Kinematics Dashboard"]
            ForgeUI["Forge CAD / EDA Preview Canvas"]
        end

        subgraph TauriLayer ["Tauri v2 Native Bridge"]
            LspHandler["lsp_daemon (rust-analyzer JSON-RPC)"]
            PtyHandler["pty_ops (portable-pty daemon)"]
            FsHandler["fs_watcher (notify recursive)"]
            SearchHandler["search_ops (ripgrep streaming & replace)"]
            McuHandler["mcu_debugger_ops (probe-rs / QEMU / defmt)"]
            TestHandler["test_runner_ops (cargo test runner)"]
            ForgeHandler["visual_workstation_ops (Slint / Iced / Forge)"]
        end

        subgraph OxideCore ["oxide_core Crate (Rust Engine)"]
            LocalHistory["LocalHistoryEngine (Append-Only Revisions)"]
            ClaudeBridge["ClaudeBridge & McpServerHub"]
            CortexEngine["CortexEngine (Tree-sitter AST & Local RAG)"]
            SwarmCritic["SwarmCritic & Approval Gatekeeper"]
            WasmSandbox["SandboxEngine (Wasmtime Runtime)"]
            PrivacyFilter["PrivacyGuard (Secret Redaction)"]
        end
    end

    subgraph HostEcosystem ["Host System & Hardware Toolchains (Pop!_OS 24.04)"]
        RA["rust-analyzer (Background Daemon)"]
        Cargo["Cargo / Rustc / Clippy / Rustfmt"]
        Bash["/bin/bash (UNIX PTY Shell)"]
        ProbeRs["probe-rs / OpenOCD (SWD/JTAG)"]
        TargetMCU["Hardware Target (STM32 / Cortex-M / r_klipp)"]
        QemuSys["QEMU (Cortex-M / RISC-V / Redox OS)"]
        LocalVectorDB["Qdrant Vector DB & SurrealDB Graph"]
    end

    User -->|Code Editing & Keymaps| Monaco
    User -->|Spatial Window Layout| Dock
    User -->|Terminal Operations| Xterm
    User -->|Inspect Telemetry| KlippUI
    User -->|Review Agent Actions| McpUI

    Monaco <-->|JSON-RPC via Tauri IPC| LspHandler
    LspHandler <-->|stdio pipes| RA

    Xterm <-->|full-duplex stream| PtyHandler
    PtyHandler <-->|pty master/slave| Bash

    McuHandler <-->|SWD / JTAG link| ProbeRs
    ProbeRs <-->|defmt RTT / SVD Registers| TargetMCU
    McuHandler <-->|GDB stub :1234| QemuSys

    McpUI <--> ClaudeBridge
    ClaudeBridge <--> LocalVectorDB
    CortexEngine <--> LocalVectorDB
    SwarmCritic --> WasmSandbox

    FsHandler -->|fs:change events| Frontend
    TestHandler <-->|cargo test -- --list| Cargo

    TauriLayer --> OxideCore
```

---

## 2. Embedded Build, Flash & `defmt` Telemetry Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant IDE as Oxide Tech IDE
    participant Cargo as Cargo Toolchain
    participant Probe as probe-rs / ST-Link
    participant MCU as STM32 / r_klipp Hardware
    participant RTT as defmt RTT Decoder

    Dev->>IDE: Clicks 'Flash & Run' (Shift+F10)
    IDE->>Cargo: cargo build --target thumbv7em-none-eabihf --release
    Cargo-->>IDE: Build Complete (ELF Binary generated)
    IDE->>Probe: probe_rs_flash(target_elf, probe_id)
    Probe->>MCU: SWD Erase & Write Flash Sectors
    MCU-->>Probe: Flash Verified (100%)
    Probe-->>IDE: Flash Success (Duration: 1.4s, Speed: 48 KB/s)
    
    IDE->>Probe: Attach defmt RTT session
    Probe->>MCU: Locate `_SEGGER_RTT` Control Block in RAM
    
    loop Real-time Telemetry Stream
        MCU->>Probe: defmt binary frames in RTT buffer
        Probe->>RTT: Raw byte packets
        RTT->>IDE: Decoded structured log [timestamp, level, module, message]
        IDE-->>Dev: Display in Debug Console & Thermal Dashboard
    end
```

---

## 3. AST-Aware Local RAG & Model Context Protocol (MCP) Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as Oxide AI Chat / Monaco
    participant Cortex as CortexEngine (Tree-sitter)
    participant Qdrant as Qdrant Vector Store
    participant MCP as MCP Server Hub
    participant Gatekeeper as SwarmCritic (HITL)
    participant LLM as Local / BYOK Model

    Dev->>UI: "Why is the stepper motor skipping steps in r_klipp_motion?"
    UI->>Cortex: Extract AST Context (active function, struct definitions)
    Cortex->>Qdrant: Hybrid Vector + Keyword Search (embeddings + AST tokens)
    Qdrant-->>Cortex: Top semantic chunks & documentation
    
    Cortex->>MCP: Query connected MCP tools (`mcp-probe-rs`, `mcp-cargo-gatekeeper`)
    MCP-->>Cortex: Tool schemas & current hardware state
    
    Cortex->>LLM: Send enriched prompt (Code AST + Context + Hardware Telemetry)
    LLM-->>UI: Proposed Code Fix + Command: `cargo test -p r_klipp_motion`
    
    UI->>Gatekeeper: Intercept execution request
    Gatekeeper-->>Dev: Display Human-in-the-Loop Approval Modal
    Dev->>Gatekeeper: Approve Change
    Gatekeeper->>UI: Apply diff & execute command in Wasm/PTY sandbox
```

---

## 4. 3-Way Merge & Local History Rollback State Diagram

```mermaid
stateDiagram-v2
    [*] --> CleanWorkspace: Active Project
    
    CleanWorkspace --> DocumentEdit: User / AI edits file
    DocumentEdit --> AutoSnapshot: 1000ms idle debounce
    CleanWorkspace --> ManualSave: Ctrl+S Save
    ManualSave --> AutoSnapshot: 'manual-save' tag
    AutoSnapshot --> CleanWorkspace: Stored in LocalHistoryEngine

    CleanWorkspace --> GitConflict: Git Pull / Rebase Conflict
    GitConflict --> OpenThreeWayMerge: Launch 3-Way Merge Window
    
    state OpenThreeWayMerge {
        [*] --> ComparePanes: Render Ours | Base | Theirs
        ComparePanes --> ResolveLines: Interactive Merge & Conflict Selection
        ResolveLines --> ApplyResolved: User clicks 'Apply Resolution & Save'
    }
    
    ApplyResolved --> AutoSnapshot: '3-way-merge-resolved' tag
    AutoSnapshot --> CleanWorkspace: Worktree Clean & Verified
```
