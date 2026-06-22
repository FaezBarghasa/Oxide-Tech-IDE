import { create } from 'zustand';
import { Diagnostic } from '../types/compilation';

interface CompilationState {
  diagnostics: Diagnostic[];
  isCompiling: boolean;
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  setIsCompiling: (compiling: boolean) => void;
}

export const useCompilationStore = create<CompilationState>((set) => ({
  diagnostics: [],
  isCompiling: false,
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),
}));
