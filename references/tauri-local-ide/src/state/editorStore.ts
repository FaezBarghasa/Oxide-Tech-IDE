import { create } from 'zustand';
import { Position } from '../types';

export interface EditorFile {
  content: string;
  unsaved: boolean;
  cursor: Position;
}

interface EditorState {
  currentFile: string | null;
  files: Map<string, EditorFile>;
  openTabs: string[];
  
  setCurrentFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFile: null,
  files: new Map(),
  openTabs: [],
  
  setCurrentFile: (path) => set({ currentFile: path }),
  
  updateFileContent: (path, content) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path) || { content: '', unsaved: false, cursor: { line: 1, column: 1 } };
    files.set(path, { ...file, content, unsaved: true });
    return { files };
  }),
  
  markSaved: (path) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path);
    if (file) files.set(path, { ...file, unsaved: false });
    return { files };
  }),
  
  openFile: (path, content) => set((state) => {
    const files = new Map(state.files);
    if (!files.has(path)) {
      files.set(path, { content, unsaved: false, cursor: { line: 1, column: 1 } });
    }
    const openTabs = state.openTabs.includes(path) ? state.openTabs : [...state.openTabs, path];
    return { files, openTabs, currentFile: path };
  }),
  
  closeTab: (path) => set((state) => {
    const openTabs = state.openTabs.filter(t => t !== path);
    const currentFile = state.currentFile === path 
      ? (openTabs.length > 0 ? openTabs[openTabs.length - 1] : null) 
      : state.currentFile;
    return { openTabs, currentFile };
  })
}));
