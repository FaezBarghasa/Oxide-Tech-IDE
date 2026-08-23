import { create } from 'zustand';
import { Diagnostic } from '../types';

interface CompilationState {
  diagnostics: Diagnostic[];
  isCompiling: boolean;
  lastBuildTime: number | null;
  
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  setCompiling: (compiling: boolean) => void;
  setLastBuildTime: (time: number) => void;
  clearDiagnostics: () => void;
}

export const useCompilationStore = create<CompilationState>((set) => ({
  diagnostics: [],
  isCompiling: false,
  lastBuildTime: null,
  
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setCompiling: (isCompiling) => set({ isCompiling }),
  setLastBuildTime: (lastBuildTime) => set({ lastBuildTime }),
  clearDiagnostics: () => set({ diagnostics: [] }),
}));
