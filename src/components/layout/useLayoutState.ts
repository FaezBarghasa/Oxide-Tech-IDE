import { create } from 'zustand';

export type ToolWindowId = 
  | 'project' 
  | 'cargo'
  | 'test'
  | 'problems'
  | 'debug' 
  | 'search' 
  | 'git' 
  | 'ai' 
  | 'skills' 
  | 'mcp' 
  | 'previews' 
  | 'rest' 
  | 'mqtt' 
  | 'serial' 
  | 'terminal' 
  | 'ast' 
  | 'macro_viewer'
  | 'local_history'
  | 'embedded_sim'
  | 'slint_preview'
  | 'playwright'
  | 'neural';

export type ToolWindowPosition = 'left' | 'right' | 'bottom';

interface ToolWindow {
  id: ToolWindowId;
  title: string;
  position: ToolWindowPosition;
  isVisible: boolean;
}

interface LayoutState {
  leftDockWidth: number;
  rightDockWidth: number;
  bottomDockHeight: number;
  
  activeLeftWindow: ToolWindowId | null;
  activeRightWindow: ToolWindowId | null;
  activeBottomWindow: ToolWindowId | null;

  windows: Record<ToolWindowId, ToolWindow>;

  toggleToolWindow: (id: ToolWindowId) => void;
  setDockSize: (position: ToolWindowPosition, size: number) => void;
}

const defaultWindows: Record<ToolWindowId, ToolWindow> = {
  project: { id: 'project', title: 'Project', position: 'left', isVisible: true },
  cargo: { id: 'cargo', title: 'Cargo & Features', position: 'left', isVisible: false },
  test: { id: 'test', title: 'Test Explorer', position: 'left', isVisible: false },
  git: { id: 'git', title: 'Git & VCS', position: 'left', isVisible: false },
  search: { id: 'search', title: 'Search', position: 'left', isVisible: false },
  
  ai: { id: 'ai', title: 'AI Assistant', position: 'right', isVisible: false },
  mcp: { id: 'mcp', title: 'MCP Explorer', position: 'right', isVisible: false },
  ast: { id: 'ast', title: 'AST Visualizer', position: 'right', isVisible: false },
  macro_viewer: { id: 'macro_viewer', title: 'Macro Viewer', position: 'right', isVisible: false },
  local_history: { id: 'local_history', title: 'Local History', position: 'right', isVisible: false },
  slint_preview: { id: 'slint_preview', title: 'Slint UI Preview', position: 'right', isVisible: false },
  previews: { id: 'previews', title: 'Previews', position: 'right', isVisible: false },
  skills: { id: 'skills', title: 'Skills', position: 'right', isVisible: false },

  terminal: { id: 'terminal', title: 'Terminal', position: 'bottom', isVisible: true },
  debug: { id: 'debug', title: 'MCU & DAP Debugger', position: 'bottom', isVisible: false },
  problems: { id: 'problems', title: 'Problems & Diagnostics', position: 'bottom', isVisible: false },
  embedded_sim: { id: 'embedded_sim', title: 'Embedded Simulation', position: 'bottom', isVisible: false },
  playwright: { id: 'playwright', title: 'Visual E2E', position: 'bottom', isVisible: false },
  mqtt: { id: 'mqtt', title: 'MQTT Telemetry', position: 'bottom', isVisible: false },
  serial: { id: 'serial', title: 'Serial Console', position: 'bottom', isVisible: false },
  rest: { id: 'rest', title: 'REST Client', position: 'bottom', isVisible: false },
  neural: { id: 'neural', title: 'Neural Debugger', position: 'bottom', isVisible: false }
};


export const useLayoutState = create<LayoutState>((set) => ({
  leftDockWidth: 250,
  rightDockWidth: 300,
  bottomDockHeight: 250,

  activeLeftWindow: 'project',
  activeRightWindow: null,
  activeBottomWindow: 'terminal',

  windows: defaultWindows,

  toggleToolWindow: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;

    const position = win.position;
    const isCurrentlyActive = 
      (position === 'left' && state.activeLeftWindow === id) ||
      (position === 'right' && state.activeRightWindow === id) ||
      (position === 'bottom' && state.activeBottomWindow === id);

    return {
      ...(position === 'left' && { activeLeftWindow: isCurrentlyActive ? null : id }),
      ...(position === 'right' && { activeRightWindow: isCurrentlyActive ? null : id }),
      ...(position === 'bottom' && { activeBottomWindow: isCurrentlyActive ? null : id })
    };
  }),

  setDockSize: (position, size) => set(() => {
    if (position === 'left') return { leftDockWidth: size };
    if (position === 'right') return { rightDockWidth: size };
    return { bottomDockHeight: size };
  })
}));
