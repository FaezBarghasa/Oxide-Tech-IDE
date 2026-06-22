import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveOverlayType = 'omnibar' | 'harpoon' | 'prompt' | 'transient' | null;
export type TransientViewType = 'rest' | 'serial' | 'mqtt' | 'extensions' | 'skills' | 'mcp' | 'previews' | null;

interface SettingsStoreState {
  theme: 'dark' | 'light';
  fontSize: number;
  showMinimap: boolean;
  zenMode: boolean;
  activeOverlay: ActiveOverlayType;
  transientView: TransientViewType;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  toggleMinimap: () => void;
  setZenMode: (val: boolean) => void;
  toggleZenMode: () => void;
  setActiveOverlay: (overlay: ActiveOverlayType) => void;
  setTransientView: (view: TransientViewType) => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      showMinimap: true,
      zenMode: true,
      activeOverlay: null,
      transientView: null,
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      setZenMode: (zenMode) => set({ zenMode }),
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
      setActiveOverlay: (activeOverlay) => set({ activeOverlay }),
      setTransientView: (transientView) => set({ transientView })
    }),
    { name: 'tauri-coder-settings' }
  )
);
