import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type EorPhase = 'Idle' | 'Executing' | 'Observing' | 'Reflecting' | 'Converged' | 'Escalated';

export interface AgentState {
  id: string;
  phase: EorPhase;
  iteration: number;
  tokenUsage: number;
  logs: string[];
}

interface SwarmState {
  agents: Record<string, AgentState>;
  swarmId: string | null;
}

const initialState: SwarmState = {
  agents: {},
  swarmId: null,
};

const swarmSlice = createSlice({
  name: 'swarm',
  initialState,
  reducers: {
    setSwarmId(state, action: PayloadAction<string>) {
      state.swarmId = action.payload;
    },
    addAgent(state, action: PayloadAction<AgentState>) {
      state.agents[action.payload.id] = action.payload;
    },
    updateAgentPhase(state, action: PayloadAction<{ id: string; phase: EorPhase; iteration: number }>) {
      const agent = state.agents[action.payload.id];
      if (agent) {
        agent.phase = action.payload.phase;
        agent.iteration = action.payload.iteration;
      }
    },
    appendLog(state, action: PayloadAction<{ id: string; log: string }>) {
      const agent = state.agents[action.payload.id];
      if (agent) {
        agent.logs.push(action.payload.log);
        // Keep only the last 500 logs to prevent memory bloat
        if (agent.logs.length > 500) {
          agent.logs = agent.logs.slice(-500);
        }
      }
    },
    updateTokenUsage(state, action: PayloadAction<{ id: string; tokens: number }>) {
      const agent = state.agents[action.payload.id];
      if (agent) {
        agent.tokenUsage = action.payload.tokens;
      }
    },
  },
});

export const {
  setSwarmId,
  addAgent,
  updateAgentPhase,
  appendLog,
  updateTokenUsage,
} = swarmSlice.actions;

export default swarmSlice.reducer;