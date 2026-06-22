import { create } from 'zustand';
import { GitFileStatus } from '../types';

interface GitState {
  files: GitFileStatus[];
  branch: string;
  refreshStatus: () => void;
}

export const useGitStore = create<GitState>((set) => ({
  files: [],
  branch: 'main',
  refreshStatus: () => set({ files: [] }), // Placeholder
}));
