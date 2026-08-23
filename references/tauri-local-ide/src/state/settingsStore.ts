import { create } from 'zustand';

interface SettingsState {
  theme: 'dark' | 'light';
  fontSize: number;
  showMinimap: boolean;
  showActivityBar: boolean;
  showSidebar: boolean;
  showChat: boolean;
  showGit: boolean;
  showSkills: boolean;
  showMCP: boolean;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  toggleMinimap: () => void;
  toggleActivityBar: () => void;
  toggleSidebar: () => void;
  toggleZenMode: () => void;
  toggleChat: () => void;
  toggleGit: () => void;
  toggleSkills: () => void;
  toggleMCP: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  fontSize: 14,
  showMinimap: true,
  showActivityBar: false,
  showSidebar: false,
  showChat: false,
  showGit: false,
  showSkills: false,
  showMCP: false,
  
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  toggleActivityBar: () => set((state) => ({ showActivityBar: !state.showActivityBar })),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  toggleZenMode: () => set((state) => ({ 
    showActivityBar: false, 
    showSidebar: false,
    showChat: false,
    showGit: false,
    showSkills: false,
    showMCP: false
  })),
  toggleChat: () => set((state) => ({ showChat: !state.showChat })),
  toggleGit: () => set((state) => ({ showGit: !state.showGit })),
  toggleSkills: () => set((state) => ({ showSkills: !state.showSkills })),
  toggleMCP: () => set((state) => ({ showMCP: !state.showMCP })),
}));
