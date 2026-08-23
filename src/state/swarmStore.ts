import { create } from 'zustand';

export type EorPhase = 'Idle' | 'Executing' | 'Observing' | 'Reflecting' | 'Converged' | 'Escalated';

export interface AgentState {
  id: string;
  phase: EorPhase;
  iteration: number;
  tokenUsage: number;
  logs: string[];
}

interface SwarmStoreState {
  agents: Record<string, AgentState>;
  swarmId: string | null;
  setSwarmId: (swarmId: string) => void;
  addAgent: (agent: AgentState) => void;
  updateAgentPhase: (payload: { id: string; phase: EorPhase; iteration: number }) => void;
  appendLog: (payload: { id: string; log: string }) => void;
  updateTokenUsage: (payload: { id: string; tokens: number }) => void;
}

export const useSwarmStore = create<SwarmStoreState>((set) => ({
  agents: {},
  swarmId: null,
  setSwarmId: (swarmId) => set({ swarmId }),
  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent },
    })),
  updateAgentPhase: ({ id, phase, iteration }) =>
    set((state) => {
      const existing = state.agents[id];
      if (!existing) return state;
      return {
        agents: {
          ...state.agents,
          [id]: { ...existing, phase, iteration },
        },
      };
    }),
  appendLog: ({ id, log }) =>
    set((state) => {
      const existing = state.agents[id];
      if (!existing) return state;
      const logs = [...existing.logs, log].slice(-500);
      return {
        agents: {
          ...state.agents,
          [id]: { ...existing, logs },
        },
      };
    }),
  updateTokenUsage: ({ id, tokens }) =>
    set((state) => {
      const existing = state.agents[id];
      if (!existing) return state;
      return {
        agents: {
          ...state.agents,
          [id]: { ...existing, tokenUsage: tokens },
        },
      };
    }),
}));
