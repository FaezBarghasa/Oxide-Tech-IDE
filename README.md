# Oxide Tech IDE 🚀

**Oxide Tech IDE** is a high-performance, developer-first integrated development environment built using Tauri, React, TypeScript, and Rust. It features a premium JetBrains RustRover-inspired dark theme, dynamic real-time AST visualization, a rule-based Compiler Guard for surgical compile error self-healing, and a universal Bring-Your-Own-Key (BYOK) AI Copilot supporting multiple models.

---

## Key Features 🌟

### 🎨 RustRover UI Aesthetics
* **Premium Dark Mode**: Styled with Tailwind CSS v4 using a highly polished dark palette (`#1e1f22`, `#2b2d30`).
* **Multi-Tab Editor Row**: Visual tab support featuring active tab blue outlines (`#3574f0`), hover close actions, and unsaved file indicator dots.
* **Top Navigation Run Bar**: Centralized Run Configurations widget allowing developers to switch between `Cargo check`, `Cargo clippy`, `Cargo run`, and `Cargo test` with instant Play (F10) execution.
* **Full-Width Tree Highlighting**: File tree layout presenting vertical indicators, folder toggles, and customized file-type SVGs (Rust cogs, Cargo boxes, TypeScript TS/TSX logs).

### 🤖 Multi-Provider AI BYOK Settings
* **Universal Model Support**: Connect the IDE to Google Gemini, OpenAI, Anthropic Claude, or local open-source LLMs (Ollama/Llama3).
* **Configurable API Settings**: Customize API keys, models (e.g., `gemini-1.5-flash`, `gpt-4o`, `claude-3-5-sonnet`), and custom endpoints (e.g., `http://localhost:11434/v1` for local offline use) stored securely in persisted local storage.
* **Local Copilot Chat & Refactoring**: Trigger AI reviews, chat instructions, or selected-text code modifications through the Floating AI Prompt widget.

### 🛡️ Compiler Guard & Self-Healing
* **Surgical Hotfixes**: The editor automatically intercepts compiler warnings and errors.
* **Auto-Healing Router**: Standard compiler errors (such as missing semicolons, missing standard library imports like `std::fs`, or `.to_string()` mismatches) are automatically analyzed and patched in the workspace.

### 🌳 Real-Time AST Visualizer
* **Instant Syntax Trees**: Fully interactive abstract syntax tree (AST) visualizer mapping out use declarations, structs, enums, functions, and import blocks dynamically as you type.

### 🔌 Vim Mode Emulation
* **Vim Bindings**: Standard modal editing (Insert/Normal, hjkl cursor movements) can be enabled inside settings, displaying an active Vim indicator in the editor status bar.

---

## Tech Stack 🛠️

* **Frontend**: React, TypeScript, Tailwind CSS v4, Lucide Icons, Monaco Editor.
* **State Management**: Zustand (Persisted Storage).
* **Query Caching**: React Query (TanStack).
* **Desktop Platform**: Tauri (Rust-based secure shell).

---

## Getting Started ⚙️

### Prerequisites
Make sure you have Node.js (v18+), Rust, and `pnpm` installed on your system.

### Installation
1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Launch the desktop application in development mode:
   ```bash
   pnpm tauri dev
   ```
3. To build the production bundle:
   ```bash
   pnpm build
   ```

---

## AI BYOK Integration Setup 🔑

1. Click the **Settings Gear** icon in the top-right corner of the navigation bar.
2. Select the **AI Models BYOK** tab.
3. Select your API Provider:
   * **Google Gemini**: Set your key and optional model.
   * **OpenAI**: Enter your standard OpenAI key.
   * **Anthropic**: Enter your Anthropic key.
   * **Custom**: Set local Ollama endpoints (`http://localhost:11434/v1`) and target models like `llama3`.
4. Press **Save Settings**. The AI chat and floating prompts will now route prompts directly to your selected model. If left empty, the IDE will run in offline simulation mode.

---

## License 📄

This project is open-source and licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
