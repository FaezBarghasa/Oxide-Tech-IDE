import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveOverlayType = 'omnibar' | 'harpoon' | 'prompt' | 'transient' | 'settings' | null;
export type TransientViewType = 'rest' | 'serial' | 'mqtt' | 'extensions' | 'skills' | 'mcp' | 'previews' | null;
export type ApiProviderType = 'gemini' | 'openai' | 'anthropic' | 'custom';

interface SettingsStoreState {
  theme: 'dark' | 'light';
  fontSize: number;
  showMinimap: boolean;
  zenMode: boolean;
  activeOverlay: ActiveOverlayType;
  transientView: TransientViewType;
  apiKey: string | null;
  vimMode: boolean;
  apiProvider: ApiProviderType;
  apiEndpoint: string | null;
  apiModel: string | null;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  toggleMinimap: () => void;
  setZenMode: (val: boolean) => void;
  toggleZenMode: () => void;
  setActiveOverlay: (overlay: ActiveOverlayType) => void;
  setTransientView: (view: TransientViewType) => void;
  setApiKey: (key: string | null) => void;
  toggleVimMode: () => void;
  setApiProvider: (provider: ApiProviderType) => void;
  setApiEndpoint: (endpoint: string | null) => void;
  setApiModel: (model: string | null) => void;
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
      apiKey: null,
      vimMode: false,
      apiProvider: 'gemini',
      apiEndpoint: null,
      apiModel: null,
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      setZenMode: (zenMode) => set({ zenMode }),
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
      setActiveOverlay: (activeOverlay) => set({ activeOverlay }),
      setTransientView: (transientView) => set({ transientView }),
      setApiKey: (apiKey) => set({ apiKey }),
      toggleVimMode: () => set((state) => ({ vimMode: !state.vimMode })),
      setApiProvider: (apiProvider) => set({ apiProvider }),
      setApiEndpoint: (apiEndpoint) => set({ apiEndpoint }),
      setApiModel: (apiModel) => set({ apiModel })
    }),
    { name: 'tauri-coder-settings' }
  )
);
