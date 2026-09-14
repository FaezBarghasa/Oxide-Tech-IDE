import { create } from 'zustand';

export interface DebugVariable {
  name: string;
  var_type: string;
  value: string;
  children?: DebugVariable[];
}

export interface StackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
  hitCount?: number;
}

export interface WatchExpression {
  id: string;
  expression: string;
  result?: string;
}

export type DebugSessionState = 'stopped' | 'running' | 'paused';

interface DebugStoreState {
  sessionState: DebugSessionState;
  activeTarget: string;
  currentLine: number | null;
  currentFile: string | null;
  stackFrames: StackFrame[];
  variables: DebugVariable[];
  breakpoints: Breakpoint[];
  watchExpressions: WatchExpression[];
  consoleOutput: string[];

  // Actions
  startDebugging: (target: string) => Promise<void>;
  stopDebugging: () => Promise<void>;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  stepOver: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  runToCursor: (file: string, line: number) => Promise<void>;
  toggleBreakpoint: (file: string, line: number) => void;
  addWatchExpression: (expr: string) => void;
  removeWatchExpression: (id: string) => void;
  evaluateExpression: (expr: string) => Promise<string>;
}

export const useDebugStore = create<DebugStoreState>((set) => ({
  sessionState: 'stopped',
  activeTarget: 'oxide-tech-ide (debug)',
  currentLine: null,
  currentFile: null,
  stackFrames: [],
  variables: [],
  breakpoints: [
    { id: 'bp-1', file: 'src/main.rs', line: 18, enabled: true, hitCount: 1 },
    { id: 'bp-2', file: 'src/hardware.rs', line: 42, enabled: true, hitCount: 0 },
  ],
  watchExpressions: [
    { id: 'watch-1', expression: 'device.is_connected', result: 'true' },
    { id: 'watch-2', expression: 'buffer.len()', result: '1024' },
  ],
  consoleOutput: [],

  startDebugging: async (target: string) => {
    set({
      sessionState: 'paused',
      activeTarget: target,
      currentFile: 'src/main.rs',
      currentLine: 18,
      consoleOutput: [
        '[lldb-mi] Launching process: target/debug/app',
        '[lldb-mi] Attached to process 41289',
        '[lldb-mi] Stopped at breakpoint 1: src/main.rs:18:5 in fn main()',
      ],
      stackFrames: [
        { id: 0, name: 'oxide_tech_ide::main()', file: 'src/main.rs', line: 18, column: 5 },
        { id: 1, name: 'tokio::runtime::task::core::run()', file: 'tokio/src/task.rs', line: 312, column: 9 },
        { id: 2, name: 'std::sys::pal::unix::thread::entry()', file: 'std/src/sys.rs', line: 89, column: 12 },
      ],
      variables: [
        { name: "workspace_root", var_type: "&str", value: "\"/home/jrad/Oxide-Tech-IDE\"" },
        { name: "device_port", var_type: "u16", value: "8080" },
        {
          name: "config",
          var_type: "AppConfig",
          value: "AppConfig { is_release: false, log_level: \"debug\" }",
          children: [
            { name: "is_release", var_type: "bool", value: "false" },
            { name: "log_level", var_type: "&str", value: "\"debug\"" },
          ],
        },
        { name: "counter", var_type: "std::sync::atomic::AtomicUsize", value: "42" },
      ],
    });
  },

  stopDebugging: async () => {
    set((state) => ({
      sessionState: 'stopped',
      currentLine: null,
      currentFile: null,
      stackFrames: [],
      variables: [],
      consoleOutput: [...state.consoleOutput, '[lldb-mi] Process 41289 exited with status 0 (0x0)'],
    }));
  },

  pauseExecution: async () => {
    set({ sessionState: 'paused' });
  },

  resumeExecution: async () => {
    set({
      sessionState: 'running',
      currentLine: null,
    });
    // Simulate hitting next breakpoint or running
    setTimeout(() => {
      set((state) => ({
        sessionState: 'paused',
        currentFile: 'src/hardware.rs',
        currentLine: 42,
        consoleOutput: [...state.consoleOutput, '[lldb-mi] Hit breakpoint 2: src/hardware.rs:42:9'],
      }));
    }, 600);
  },

  stepOver: async () => {
    set((state) => {
      const nextLine = (state.currentLine || 18) + 1;
      return {
        currentLine: nextLine,
        consoleOutput: [...state.consoleOutput, `[lldb-mi] Step over -> line ${nextLine}`],
      };
    });
  },

  stepInto: async () => {
    set((state) => ({
      currentFile: 'src/hardware.rs',
      currentLine: 12,
      consoleOutput: [...state.consoleOutput, `[lldb-mi] Step into -> src/hardware.rs:12`],
      stackFrames: [
        { id: 0, name: 'oxide_tech_ide::hardware::init()', file: 'src/hardware.rs', line: 12, column: 5 },
        ...state.stackFrames,
      ],
    }));
  },

  stepOut: async () => {
    set((state) => ({
      currentFile: 'src/main.rs',
      currentLine: 19,
      consoleOutput: [...state.consoleOutput, `[lldb-mi] Step out -> src/main.rs:19`],
      stackFrames: state.stackFrames.slice(1),
    }));
  },

  runToCursor: async (file: string, line: number) => {
    set((state) => ({
      currentFile: file,
      currentLine: line,
      consoleOutput: [...state.consoleOutput, `[lldb-mi] Run to cursor -> ${file}:${line}`],
    }));
  },

  toggleBreakpoint: (file: string, line: number) => {
    set((state) => {
      const exists = state.breakpoints.some((b) => b.file === file && b.line === line);
      if (exists) {
        return {
          breakpoints: state.breakpoints.filter((b) => !(b.file === file && b.line === line)),
        };
      } else {
        const newBp: Breakpoint = {
          id: `bp-${Date.now()}`,
          file,
          line,
          enabled: true,
          hitCount: 0,
        };
        return {
          breakpoints: [...state.breakpoints, newBp],
        };
      }
    });
  },

  addWatchExpression: (expression: string) => {
    const newWatch: WatchExpression = {
      id: `watch-${Date.now()}`,
      expression,
      result: 'evaluating...',
    };
    set((state) => ({
      watchExpressions: [...state.watchExpressions, newWatch],
    }));
  },

  removeWatchExpression: (id: string) => {
    set((state) => ({
      watchExpressions: state.watchExpressions.filter((w) => w.id !== id),
    }));
  },

  evaluateExpression: async (expr: string) => {
    return `Eval("${expr}") = true`;
  },
}));
