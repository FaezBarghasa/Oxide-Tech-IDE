import { create } from 'zustand';

export interface ExtensionManifest {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
  description?: string;
  main?: string;
  engines?: { vscode?: string };
  contributes?: {
    commands?: Array<{ command: string; title: string; category?: string }>;
    languages?: Array<{ id: string; aliases?: string[]; extensions?: string[] }>;
    themes?: Array<{ label: string; uiTheme: string; path: string }>;
    snippets?: Array<{ language: string; path: string }>;
    keybindings?: Array<{ command: string; key: string; when?: string }>;
  };
}

interface ExtensionStoreState {
  extensions: Array<{
    manifest: ExtensionManifest;
    path: string;
    isActive: boolean;
  }>;
  registerExtension: (manifest: ExtensionManifest, path: string) => void;
  toggleExtension: (name: string) => void;
  removeExtension: (name: string) => void;
}

export const useExtensionStore = create<ExtensionStoreState>((set) => ({
  extensions: [
    {
      manifest: {
        name: "rust-analyzer",
        version: "0.4.2026",
        publisher: "rust-lang",
        displayName: "Rust Analyzer",
        description: "Standard language server support for Rust in the Oxide Tech IDE.",
      },
      path: "/builtin/extensions/rust-analyzer",
      isActive: true
    },
    {
      manifest: {
        name: "gitlens",
        version: "15.1.0",
        publisher: "GitKraken",
        displayName: "GitLens",
        description: "Visualize code authorship at a glance via Git blame annotations.",
      },
      path: "/builtin/extensions/gitlens",
      isActive: true
    },
    {
      manifest: {
        name: "copilot",
        version: "1.252.0",
        publisher: "GitHub",
        displayName: "GitHub Copilot",
        description: "AI pair programmer providing inline autocomplete and predictions.",
      },
      path: "/builtin/extensions/copilot",
      isActive: true
    },
    {
      manifest: {
        name: "prettier",
        version: "10.4.0",
        publisher: "Prettier",
        displayName: "Prettier - Code formatter",
        description: "Opinionated code formatter for Javascript, TypeScript, CSS, and HTML.",
      },
      path: "/builtin/extensions/prettier",
      isActive: true
    }
  ],
  registerExtension: (manifest, path) => set((state) => {
    // Prevent duplicate registrations
    if (state.extensions.some(e => e.manifest.name === manifest.name)) {
      return state;
    }
    return {
      extensions: [...state.extensions, { manifest, path, isActive: true }]
    };
  }),
  toggleExtension: (name) => set((state) => ({
    extensions: state.extensions.map(e =>
      e.manifest.name === name ? { ...e, isActive: !e.isActive } : e
    )
  })),
  removeExtension: (name) => set((state) => ({
    extensions: state.extensions.filter(e => e.manifest.name !== name)
  }))
}));
