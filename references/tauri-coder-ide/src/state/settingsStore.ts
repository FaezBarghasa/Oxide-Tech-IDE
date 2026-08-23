import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'dark' | 'light';
  fontSize: number;
  showMinimap: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  setShowMinimap: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      showMinimap: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowMinimap: (showMinimap) => set({ showMinimap })
    }),
    { name: 'tauri-coder-settings' }
  )
);
