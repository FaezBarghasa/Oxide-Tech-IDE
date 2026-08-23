import { create } from 'zustand';
import { Position, FileState } from '../types/editor';

interface EditorState {
  currentFile: string | null;
  files: Map<string, FileState>;
  isDebugging: boolean;
  setCurrentFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  setCursor: (path: string, cursor: Position) => void;
  toggleBreakpoint: (path: string, line: number) => void;
  setIsDebugging: (isDebugging: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFile: null,
  files: new Map(),
  isDebugging: false,
  setCurrentFile: (path) => set({ currentFile: path }),
  updateFileContent: (path, content) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path) || { content: '', unsaved: false, cursor: { line: 0, column: 0 }, breakpoints: [] };
    files.set(path, { ...file, content, unsaved: true });
    return { files };
  }),
  markSaved: (path) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path);
    if (file) files.set(path, { ...file, unsaved: false });
    return { files };
  }),
  setCursor: (path, cursor) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path);
    if (file) files.set(path, { ...file, cursor });
    return { files };
  }),
  toggleBreakpoint: (path, line) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path) || { content: '', unsaved: false, cursor: { line: 0, column: 0 }, breakpoints: [] };
    const breakpoints = file.breakpoints || [];
    const index = breakpoints.indexOf(line);
    let newBreakpoints;
    if (index === -1) {
      newBreakpoints = [...breakpoints, line];
    } else {
      newBreakpoints = breakpoints.filter(l => l !== line);
    }
    files.set(path, { ...file, breakpoints: newBreakpoints });
    return { files };
  }),
  setIsDebugging: (isDebugging) => set({ isDebugging })
}));
