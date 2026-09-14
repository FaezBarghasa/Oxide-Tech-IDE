# Oxide Tech IDE — Architecture & Interaction Diagrams

## 1. System Context & Component Architecture (C4 Model)

```mermaid
graph TD
    User["👨‍💻 Developer / Systems Engineer"]

    subgraph DesktopApp ["Oxide Tech IDE (Tauri v2 Desktop App)"]
        subgraph Webview ["React 19 Frontend (Webview)"]
            Monaco["Monaco Editor (Rust Tokenizer & Inlay Hints)"]
            Dock["FlexLayout Spatial Docking"]
            Xterm["Xterm.js Terminal (Multi-Session)"]
            State["Zustand Stores (Editor, FileSystem, Settings, Debug)"]
            UIWindows["Tool Windows (Cargo, Tests, History, MQTT, Slint, MCU)"]
        end

        subgraph TauriBackend ["Tauri v2 Native Rust Backend"]
            LspDaemonHandler["LSP Daemon Handler"]
            PtyOps["PTY Session Manager"]
            FsWatcher["Filesystem Watcher Daemon"]
            TestRunner["Cargo Test Runner Ops"]
            McuOps["MCU & Hardware Debug Bridge"]
        end

        subgraph CoreCrate ["oxide_core Crate"]
            LocalHistory["LocalHistoryEngine"]
            PtyAdapter["PtySessionAdapter"]
            CortexHAL["Cortex HAL & Vector Engine"]
            PrivacyFilter["PrivacyGuard & Secret Redactor"]
        end
    end

    subgraph HostSystem ["Host Operating System (Linux / Wayland / macOS)"]
        RustAnalyzer["rust-analyzer (stdio JSON-RPC daemon)"]
        CargoCLI["cargo / clippy / rustfmt"]
        Bash["/bin/bash (UNIX pseudo-terminal)"]
        ProbeRs["probe-rs (CMSIS-DAP / ST-Link)"]
        TargetMCU["Hardware Target (STM32 / Cortex-M)"]
    end

    User -->|Keyboard / Mouse| Monaco
    User -->|Gestures & Docking| Dock

    Monaco <--> State
    Dock --> UIWindows
    Xterm <--> PtyOps

    Monaco -->|JSON-RPC via Tauri IPC| LspDaemonHandler
    LspDaemonHandler <-->|stdio stream| RustAnalyzer

    PtyOps <-->|portable-pty stream| Bash
    FsWatcher -->|fs:change events| State

    TestRunner -->|cargo test -- --list| CargoCLI
    McuOps -->|SWD / JTAG| ProbeRs
    ProbeRs <-->|defmt RTT / SVD| TargetMCU

    TauriBackend --> CoreCrate
```

---

## 2. Language Server Protocol (LSP) Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Monaco as Monaco Editor
    participant Client as lspClient.ts
    participant Tauri as Tauri IPC (lsp_daemon.rs)
    participant RA as rust-analyzer (Child Process)

    Dev->>Monaco: Types code (e.g. `let mut buffer = `)
    Monaco->>Client: onDidChangeModelContent
    Client->>Tauri: lsp_did_change(path, text, version)
    Tauri->>RA: {"method": "textDocument/didChange", "params": {...}}
    
    Dev->>Monaco: Triggers Autocompletion (`Ctrl+Space`)
    Monaco->>Client: provideCompletionItems(pos)
    Client->>Tauri: lsp_completion(path, line, col)
    Tauri->>RA: {"method": "textDocument/completion", "params": {...}}
    RA-->>Tauri: JSON-RPC Completion List Result
    Tauri-->>Client: CompletionItem[]
    Client-->>Monaco: Render suggestion popup
    Monaco-->>Dev: Display suggestions with type signatures
```

---

## 3. PTY Full-Duplex Terminal Streaming Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Xterm as TerminalPanel (xterm.js)
    participant Tauri as pty_ops.rs
    participant Adapter as pty_adapter.rs
    participant OS as /bin/bash (OS PTY)

    Dev->>Xterm: Presses Keys (`cargo check\n`)
    Xterm->>Tauri: pty_write(sessionId, "cargo check\n")
    Tauri->>Adapter: write(&bytes)
    Adapter->>OS: stdin pipe write

    loop Background Async Output Stream
        OS->>Adapter: stdout chunk (ANSI sequences)
        Adapter->>Tauri: Background loop read
        Tauri->>Xterm: emit("pty:output:{sessionId}", text)
        Xterm->>Dev: Render colored terminal output
    end
```

---

## 4. Local History Snapshot & Rollback Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle: Active Editor File
    Idle --> UserEdit: Types in Editor
    UserEdit --> DebounceTimer: 1000ms idle
    DebounceTimer --> SnapshotRecord: Auto Snapshot
    
    Idle --> ManualSave: Ctrl+S Save
    ManualSave --> SnapshotRecord: 'manual-save' tag
    
    SnapshotRecord --> LocalHistoryEngine: Append to Revision List
    LocalHistoryEngine --> Idle: Persisted

    Idle --> OpenHistoryToolWindow: Open Local History
    OpenHistoryToolWindow --> SelectRevision: Select historical timestamp
    SelectRevision --> InspectDiff: Side-by-Side Preview
    InspectDiff --> RestoreRevision: Click 'Restore this Version'
    RestoreRevision --> UpdateEditor: Apply Content & Snapshot 'revert' tag
    UpdateEditor --> Idle
```
