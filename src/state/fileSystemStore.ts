import { create } from 'zustand';
import { FileTreeNode } from '../types/api';
import { tauriCommands } from '../services/tauri';

interface FileSystemStoreState {
  tree: FileTreeNode[];
  expandedFolders: string[];
  workspaceRoot: string;
  setWorkspaceRoot: (root: string) => void;
  setTree: (tree: FileTreeNode[]) => void;
  toggleFolder: (path: string) => void;
  reloadTree: () => Promise<void>;
}

export const useFileSystemStore = create<FileSystemStoreState>((set, get) => ({
  tree: [],
  expandedFolders: [],
  workspaceRoot: '.',
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  setTree: (tree) => set({ tree }),
  toggleFolder: (path) => set((state) => {
    const isExpanded = state.expandedFolders.includes(path);
    if (isExpanded) {
      return { expandedFolders: state.expandedFolders.filter(p => p !== path) };
    }
    return { expandedFolders: [...state.expandedFolders, path] };
  }),
  reloadTree: async () => {
    const root = get().workspaceRoot;
    try {
      const tree = await tauriCommands.readDir(root);
      set({ tree });
      tauriCommands.triggerWorkspaceIndexing(root).catch(err => {
        console.warn("Silent RAG Indexing warning:", err);
      });
    } catch (err) {
      console.error("Failed to load workspace tree from", root, err);
      // Fallback to basic structure if backend fails / mock
      if (get().tree.length === 0) {
        set({
          tree: [
            {
              name: 'src',
              path: './src',
              isDirectory: true,
              children: [
                { name: 'main.rs', path: './src/main.rs', isDirectory: false },
                { name: 'hardware.rs', path: './src/hardware.rs', isDirectory: false },
              ]
            },
            { name: 'Cargo.toml', path: './Cargo.toml', isDirectory: false },
            { name: 'README.md', path: './README.md', isDirectory: false },
          ]
        });
      }
    }
  }
}));
