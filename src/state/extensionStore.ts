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
  extensions: [],
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
