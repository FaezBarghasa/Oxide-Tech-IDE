import { create } from 'zustand';
import { Diagnostic, LintSuggestion } from '../types/compilation';

interface CompilationStoreState {
  diagnostics: Diagnostic[];
  suggestions: LintSuggestion[];
  lastBuildStatus: 'success' | 'error' | 'idle' | 'running';
  progress: number;
  
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  setSuggestions: (suggestions: LintSuggestion[]) => void;
  setBuildStatus: (status: 'success' | 'error' | 'idle' | 'running') => void;
  setProgress: (progress: number) => void;
}

export const useCompilationStore = create<CompilationStoreState>((set) => ({
  diagnostics: [],
  suggestions: [],
  lastBuildStatus: 'idle',
  progress: 0,
  
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setBuildStatus: (lastBuildStatus) => set({ lastBuildStatus }),
  setProgress: (progress) => set({ progress })
}));
