import { create } from 'zustand';
import { AIChatMessage } from '../types';

interface ChatState {
  messages: AIChatMessage[];
  isPlanning: boolean;
  addMessage: (message: AIChatMessage) => void;
  setPlanning: (planning: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isPlanning: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setPlanning: (isPlanning) => set({ isPlanning }),
  clearMessages: () => set({ messages: [] }),
}));
