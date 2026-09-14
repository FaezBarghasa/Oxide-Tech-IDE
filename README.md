# Oxide Tech IDE 🦀⚡ — Full-Stack Visual Engineering Workstation

**Oxide Tech IDE** is a high-performance, developer-first integrated development environment built with **Tauri v2 + React 19 + Rust**, engineered to achieve **1:1 feature and UX parity with JetBrains RustRover (2026.2.2)** while functioning as a **Full-Stack Visual Engineering Workstation** with native **Playwright**, **Slint**, **Embedded Graphics**, and **Iced** tools.

---

## 📸 Screenshots & UI Showcase

### 1. Full-Stack Visual Workstation & Spatial Docking
![Live Visual Layout](docs/assets/rustrover_live_test.png)
![Visual Workstation Layout](docs/assets/rustrover_visual_workstation.png)

* **Top Navigation Bar & Exhaustive Menus**: JetBrains RustRover 2026.2 top menu hierarchy with deep cascading submenus and standard keybindings:
  - **File**: `New` (Project, Module, Package, File `Alt+Insert`, Directory, Scratch File `Ctrl+Alt+Shift+Insert`, From Existing Sources), `Open...` (`Ctrl+O`), `Open Recent`, `Close Project`, `Settings` (`Ctrl+Alt+S`), `Project Structure` (`Ctrl+Alt+Shift+S`), `Save All` (`Ctrl+S`), `Synchronize` (`Ctrl+Alt+Y`), `Reload All from Disk`, `Manage IDE Settings` (Import/Export/Restore), `Invalidate Caches...`, `Repair IDE`, `Power Save Mode`, `Print...`, `Exit` (`Ctrl+Q`).
  - **Edit**: `Undo` (`Ctrl+Z`), `Redo` (`Ctrl+Shift+Z`), `Cut` (`Ctrl+X`), `Copy` (`Ctrl+C`), `Copy Path/Reference` (Absolute, File Name, Content Root, Source Root, Repo Root, GitHub URL, Copy Reference `Ctrl+Alt+Shift+C`), `Paste` (`Ctrl+V`), `Paste from History...` (`Ctrl+Shift+V`), `Select All` (`Ctrl+A`), `Delete`, `Find` (Find `Ctrl+F`, Replace `Ctrl+R`, Find in Files `Ctrl+Shift+F`, Replace in Files `Ctrl+Shift+R`, Search Structurally), `Search Everywhere` (`Shift+Shift`), `Toggle Case` (`Ctrl+Shift+U`), `Join Lines` (`Ctrl+Shift+J`), `Split Line` (`Ctrl+Enter`), `Extend/Shrink Selection` (`Ctrl+W`/`Ctrl+Shift+W`), `Column Selection Mode` (`Alt+Shift+Insert`), `Bookmarks` (Toggle `F11`, With Mnemonic `Ctrl+F11`, Show `Shift+F11`), `Encoding` (UTF-8, Windows-1252, ISO-8859-1), `Line Separators` (LF, CRLF, CR).
  - **View**: `Appearance` (Navigation Bar, Status Bar, Tool Window Bars, Toolbar, Distraction Free / Zen Mode, Breadcrumbs, Indent Guides, Line Numbers, Inlay Hints), `Tool Windows` (Project `Alt+1`, Cargo `Cmd+F11`, Structure `Alt+7`, Favorites `Alt+2`, Run `Alt+4`, Debug `Alt+5`, Terminal `Alt+F12`, Version Control `Alt+9`, Problems `Alt+6`, AI Assistant, Notifications `Alt+0`, MQTT Terminal, Playwright, Slint, Embedded Sim, Iced Inspector), `Quick Documentation` (`Ctrl+Q`), `Parameter Info` (`Ctrl+P`), `Active Editor` (Go to Line/Col `Ctrl+G`, Select In `Alt+F1`).
  - **Navigate**: `Class / Struct...` (`Ctrl+N`), `File...` (`Ctrl+Shift+N`), `Symbol...` (`Ctrl+Alt+Shift+N`), `Recent Files` (`Ctrl+E`), `Recent Locations` (`Ctrl+Shift+E`), `Last Edit Location` (`Ctrl+Shift+Backspace`), `Back` (`Ctrl+Alt+Left`), `Forward` (`Ctrl+Alt+Right`), `Declaration` (`Ctrl+B`), `Implementation(s)` (`Ctrl+Alt+B`), `Type Declaration` (`Ctrl+Shift+B`), `Super Method` (`Ctrl+U`), `Test` (`Ctrl+Shift+T`), `Call/Method/Type Hierarchy` (`Ctrl+Alt+H` / `Ctrl+Shift+H` / `Ctrl+H`), `File Structure Popup` (`Ctrl+F12`).
  - **Code**: `Generate...` (`Alt+Insert`: Constructor, Getter/Setter, ToString, Equals/HashCode, Override/Implement/Delegate Methods, Test Method, Rust Derive Macro, Impl Block), `Override Methods...` (`Ctrl+O`), `Implement Methods...` (`Ctrl+I`), `Surround With...` (`Ctrl+Alt+T`: if/else, while, match, unsafe, loop), `Comment Line/Block` (`Ctrl+/` / `Ctrl+Shift+/`), `Reformat Code` (`Ctrl+Alt+L`), `Optimize Imports` (`Ctrl+Alt+O`), `Auto-Indent Lines` (`Ctrl+Alt+I`), `Inspect Code...` (Clippy), `Run Inspection by Name...`.
  - **Refactor**: `Refactor This...` (`Ctrl+Alt+Shift+T`), `Rename...` (`Shift+F6`), `Change Signature...` (`Ctrl+F6`), `Type Migration...`, `Move...` (`F6`), `Copy...` (`F5`), `Safe Delete...` (`Alt+Delete`), `Extract` (Variable `Ctrl+Alt+V`, Field `Ctrl+Alt+F`, Constant `Ctrl+Alt+C`, Parameter `Ctrl+Alt+P`, Method `Ctrl+Alt+M`), `Inline...` (`Ctrl+Alt+N`), `Invert Boolean`, `Split/Merge If`.
  - **Build**: `Build Project` (`Ctrl+F9`), `Rebuild Project`, `Cargo Check` (`Shift+F10`), `Cargo Clippy`, `Compile`, `Clean Project`, `Build Artifacts`.
  - **Run**: `Run` (`Shift+F10`), `Debug` (`Shift+F9`), `Run/Debug Context Configuration` (`Ctrl+Shift+F10` / `Ctrl+Shift+F9`), `Stop` (`Ctrl+F2`), `Resume` (`F9`), `Pause`, `Step Over` (`F8`), `Step Into` (`F7`), `Step Out` (`Shift+F8`), `View Breakpoints...` (`Ctrl+Shift+F8`), `Mute Breakpoints`, `Run with Coverage`, `Profile...`.
  - **Tools**: `Cargo` (Build, Run, Test, Check, Clippy, Fmt, Doc, Clean, Add Dependency, Reload Project), `Rust` (Expand Macro Recursively, Show MIR/HIR, Rustfmt File/Project, Rust REPL, Share in Playground), `Hardware & Debuggers` (probe-rs STM32F4 Flash & Run, OpenOCD GDB Server, QEMU Cortex-M Emulator), `MQTT 5.0 Terminal`, `Docker` (Connect, Build, Run Container).
  - **VCS**: `Update Project...` (`Ctrl+T`), `Commit...` (`Ctrl+K`), `Push...` (`Ctrl+Shift+K`), `Pull...`, `Branches...` (New Branch, Checkout, Merge, Rebase), `Stash / Unstash Changes...`, `Show Git History` (`Alt+9`), `Compare with Branch / Clipboard`, `Rollback Changes...`.
  - **Window**: `Split Vertically / Horizontally`, `Unsplit / Unsplit All`, `Restore Default Layout`, `Store Current Layout as Default`, `Minimize / Zoom Current Window`.
  - **Help**: `Help Contents` (`F1`), `Tip of the Day`, `What's New in RustRover 2026.2`, `Keymap Reference`, `Check for Updates...`, `About Oxide-Tech-IDE`.
* **Left Tool Stripe**: `Project` file tree and `Cargo` workspace manager.
* **Right Tool Stripe**: `AI Assistant`, `Structure`, `Slint Preview`, `Embedded Sim`, and `Iced Inspector`.
* **Bottom Tool Stripe**: `Debugger` (Step-by-step MCU/LLDB), `MQTT Terminal`, `Terminal`, `Problems` (diagnostics), `Macro Viewer` (live syn expansion), `Playwright E2E`, and `Git` VCS panels.
* **Status Bar**: Real-time Git branch selector (`main`), linter status indicator (`Clean`), indentation style, UTF-8 encoding, LF line endings, and live memory profiling gauge.

---

### 2. Global Search Everywhere (`Double Shift` / `Shift+Shift`)
![Search Everywhere Overlay](docs/assets/rustrover_search_everywhere.png)

* **Multi-Category Tabs**: `All` | `Classes / Structs` | `Files` | `Symbols` | `Actions` | `Oxide AI` with fast `Tab` / `Shift+Tab` keyboard cycling.
* **Fuzzy Search Engine**: Powered by `fuse.js` indexing workspace files, crates, struct symbols, and IDE action palettes with instant arrow key navigation and execution.

---

### 3. Comprehensive Settings & Preferences (`Ctrl+Alt+S`)
![RustRover Settings Modal](docs/assets/rustrover_settings.png)

* **Multi-Category Settings Tree**: `Appearance & Behavior`, `Keymap` (Default IntelliJ, VS Code, Emacs, Sublime), `Editor` (font size, minimap, IdeaVim mode), `Rust & Cargo` (toolchains, inlay hints, on-save clippy/rustfmt), `Oxide AI Assistant` (BYOK multi-provider configurations), `Terminal`, and `Version Control (Git)`.

---

### 4. JetBrains Step-by-Step MCU & Hardware Debugger (`Shift+F9`)
![RustRover MCU Debugger](docs/assets/rustrover_mcu_debugger.png)

* **Multi-Engine Debugging Core**: Instant switching between **`probe-rs`** (CMSIS-DAP / ST-Link / J-Link SWD/JTAG), **`OpenOCD`** GDB Remote, **`QEMU`** System Emulator, **`defmt RTT`** live telemetry, and **`LLDB`** desktop native targets.
* **Debug Controls Strip**: Resume / Pause (`F9`), Stop (`Ctrl+F2`), Step Over Asm/Line (`F8`), Step Into (`F7`), Step Out (`Shift+F8`), Flash Firmware (`probe-rs run`), and Core Reset (`Ctrl+F5`).
* **SVD Peripheral Registers Inspector**: Real-time bitfield tree explorer with live read/write access to MCU registers (e.g. `GPIOA->MODER`, `GPIOA->ODR`, `RCC->CR`, `USART1`).
* **defmt RTT Real-Time Telemetry**: Microsecond-accurate deferred formatting log stream decoded directly from target RAM buffer without semihosting delays.
* **QEMU System Emulator**: Cortex-M0/M3/M4/RISC-V machine emulator with GDB stub `:1234` and semihosting console integration.
* **Hardware Probes & Target Chip Selector**: Auto-discovery of attached USB probes (voltage, speed, serial) and target chips (`STM32F4`, `STM32H7`, `nRF52840`, `RP2040`, `ESP32-C3`).
* **Active Execution Line Highlight**: Monaco editor yellow glyph arrow and blue paused line indicator.

---

### 5. MQTT 5.0 Interactive Terminal & Telemetry Hub
![RustRover MQTT Terminal](docs/assets/rustrover_mqtt_terminal.png)

* **Interactive Protocol Client**: Real-time MQTT 5.0 pub/sub terminal with support for configurable brokers, client IDs, KeepAlive, and auto-reconnect.
* **Multi-Topic Subscriptions**: Wildcard subscriptions (`sensors/#`, `device/+/telemetry`) with per-topic QoS 0, 1, 2 level selection.
* **Live Message Stream & Filter**: Color-coded payload stream with autoscroll, timestamp logging, and fuzzy filter search across topic names and JSON bodies.
* **Publisher & JSON Templates**: Built-in editor with QoS and Retain flags, plus quick telemetry templates (`Cortex Telemetry`, `Relay Command`, `Ping Request`).

---

## 🌟 Visual Workstation Subsystems

### 🎭 1. Playwright Web & E2E Testing
* **Test Explorer**: Discovers and runs tests across `.spec.ts` and `.test.ts` files with instant status indicators.
* **Gutter Test Runners**: Green play icons next to test blocks for one-click background execution.
* **Visual Regression Engine**: Pixel-by-pixel diff comparisons against gold standard baselines with automated mismatch highlighting.

### 🎨 2. Slint Declarative Live Preview
* **Interactive `<canvas>`**: High-DPI software rendering pipeline parsing `.slint` markup and drawing live components.
* **Bi-Directional Pointer Bridge**: Click and drag events are forwarded directly to the Slint interpreter state.
* **Property Inspector**: Live controls to inspect and tweak Slint component properties in real-time.

### 📟 3. Embedded Graphics Display Simulator
* **Hardware Display Profiles**: `SSD1306 (128x64 Mono OLED)`, `ST7789 (240x240 RGB565 IPS)`, `ILI9341 (320x240 RGB565 TFT)`, and `Waveshare 2.9" Tri-Color e-Ink`.
* **Pixel Grid Zoom**: Infinite magnification (up to 600%) to inspect pixel placement and font kerning.
* **Hardware Controls & Metrics**: D-Pad hardware button injection, live FPS counters, frame time (ms), and VRAM consumption tracking.

### 🧊 4. Iced Native GUI Inspector & Hot Reload
* **Widget Hierarchy Tree**: Live inspection of `Application` -> `Column` -> `Row` -> `Container` -> `Button` -> `Text`.
* **Computed Layout Box Model**: Visualizes bounding boxes, padding, and spacing constraints.
* **Sub-500ms Hot Reload**: Recompiles and re-renders application state without window flicker.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Desktop Shell** | Tauri v2 (Rust native backend) |
| **Frontend Framework** | React 19 + TypeScript (Strict Mode) |
| **Styling & Icons** | Tailwind CSS v4 + Lucide Icons |
| **Docking Engine** | `flexlayout-react` |
| **Virtualization** | `@tanstack/react-virtual` |
| **Search Engine** | `fuse.js` |
| **Code Editor** | Monaco Editor with custom Monarch Rust tokenizer |
| **State Management** | Zustand (Persisted Storage) |
| **Data Fetching** | TanStack React Query |

---

## ⚡ Getting Started

### Prerequisites
* **Node.js**: v18 or later
* **Rust & Cargo**: Latest stable toolchain
* **pnpm**: Fast package manager

### Installation & Run

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/FaezBarghasa/Oxide-Tech-IDE.git
   cd Oxide-Tech-IDE
   pnpm install
   ```

2. **Launch in development mode**:
   ```bash
   pnpm tauri dev
   ```

3. **Build the production release**:
   ```bash
   # Build frontend bundle
   pnpm build

   # Build native Tauri executable
   pnpm tauri build
   ```

---

## ⌨️ Essential Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Search Everywhere** | `Shift+Shift` (Double Shift) |
| **Run Current Configuration** | `Shift+F10` |
| **Debug Current Configuration** | `Shift+F9` |
| **Stop Process** | `Ctrl+F2` |
| **Cargo Check Workspace** | `Ctrl+F9` |
| **Context Actions / Quick Fix** | `Alt+Enter` |
| **Settings / Preferences** | `Ctrl+Alt+S` |
| **Toggle Omnibar** | `Ctrl+K` |
| **Toggle Harpoon Buffers** | `Ctrl+E` |
| **Oxide AI Prompt Assistant** | `Ctrl+\` |

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
