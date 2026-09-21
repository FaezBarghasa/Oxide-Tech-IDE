# Oxide Tech IDE — Design System & UI/UX Guidelines

## 1. Visual Design Philosophy

Oxide Tech IDE adheres to a modern, high-density visual design language coupled with dark mode aesthetics. Every component is designed for maximum information density, clean typography, low visual fatigue during extended sessions, and pixel-perfect spatial alignment.

---

## 2. Color Palette & Token System

All color tokens are calibrated for modern dark theme IDE workflows:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **`bg-ide-bg`** | `#1e1f22` | Primary IDE background and main editor container |
| **`bg-ide-panel`** | `#26282e` | Tool windows, side stripes, modal headers, and dock bars |
| **`bg-ide-sidebar`** | `#18191b` | File tree sidebar, local history timeline, and terminal dark areas |
| **`border-ide-border`**| `#2b2d30` | Structural dividers, panel borders, and splitters |
| **`border-ide-active`**| `#393b40` | Focused input borders, hover outlines, and active tab borders |
| **`text-ide-primary`** | `#dfe1e5` | Primary text, identifiers, and active menu labels |
| **`text-ide-secondary`**| `#868a91` | Secondary descriptions, timestamps, and line numbers |
| **`text-ide-muted`**   | `#707278` | Inactive tabs, disabled items, and ghost text |
| **`accent-primary`**   | `#3574f0` | JetBrains Blue — focus rings, selections, and primary CTA buttons |
| **`accent-success`**   | `#59a869` | JetBrains Green — passed tests, added VCS lines, and run glyphs |
| **`accent-warning`**   | `#e5a00d` | JetBrains Yellow — compiler warnings, breakline arrow glyphs |
| **`accent-error`**     | `#db5860` | JetBrains Red — compiler errors, failed tests, deleted VCS lines |

---

## 3. Typography Hierarchy

- **UI Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
- **Code Font**: `'JetBrains Mono'`, `'Fira Code'`, `Consolas`, `monospace`.
- **Typographic Scale**:
  - `Header Title`: 14px (SemiBold, `#dfe1e5`)
  - `Section / Tool Header`: 12px (Medium, `#dfe1e5`)
  - `Standard UI / List Items`: 11.5px / 12px (Regular, `#bcbec4`)
  - `Code Editor`: 13px / 14px (Line height: 22px)
  - `Gutter Line Numbers / Badges`: 10px / 11px (Monospace, `#707278`)

---

## 4. Component Design Specifications

### 4.1 Tool Window Layout (Spatial Docking)
- **Header**: 32px height, `#26282e` background, 1px bottom border `#2b2d30`. Contains title with icon, action buttons (`Refresh`, `Collapse`, `Settings`), and view toggles.
- **Content Area**: `#1e1f22` or `#18191b` background with custom slim scrollbars (width: 6px, thumb: `#393b40`, hover: `#4e5157`).
- **Dividers**: 1px solid `#2b2d30`.

### 4.2 Monaco Editor Rust Customizations
- **Theme**: `oxide-dark` with tailored keyword (`#cc7832`), type (`#6897bb`), trait (`#b200b2`), macro (`#ffc66d`), string (`#6a8759`), and comment (`#808080`) highlighting.
- **Glyph Margin**: 24px width for breakpoint dots (`#db5860`), execution arrow glyphs (`#e5a00d`), and green play icons (`#59a869`).
- **Inlay Hints**: 10px font size, `#868a91` text, `#2b2d30` badge background with rounded corners.

### 4.3 Dialogs & Modals
- **Backdrop**: `rgba(0, 0, 0, 0.65)` with `backdrop-blur(2px)`.
- **Container**: `#1e1f22` surface, 1px border `#393b40`, rounded-lg (8px radius), subtle drop shadow (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)`).
- **Footer**: `#26282d` surface with `Cancel` (subtle border) and `Apply / Save` (`#3574f0`) buttons.
