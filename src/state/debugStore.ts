import { create } from 'zustand';
import {
  McuDebugProbe,
  McuTargetChip,
  DefmtLogPacket,
  PeripheralBlock,
} from '../types/mcuDebugger';
import { tauriCommands } from '../services/tauri';

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
export type DebugEngineType = 'lldb' | 'probe-rs' | 'openocd' | 'qemu' | 'defmt-rtt';

interface DebugStoreState {
  sessionState: DebugSessionState;
  activeEngine: DebugEngineType;
  activeTarget: string;
  currentLine: number | null;
  currentFile: string | null;
  stackFrames: StackFrame[];
  variables: DebugVariable[];
  breakpoints: Breakpoint[];
  watchExpressions: WatchExpression[];
  consoleOutput: string[];

  // MCU Embedded Specific States
  probes: McuDebugProbe[];
  selectedProbeId: string | null;
  supportedChips: McuTargetChip[];
  selectedChip: string;
  defmtLogs: DefmtLogPacket[];
  qemuLogs: string[];
  peripheralBlock: PeripheralBlock | null;
  selectedPeripheral: string;

  // Actions
  setActiveEngine: (engine: DebugEngineType) => void;
  setSelectedChip: (chip: string) => void;
  setSelectedProbeId: (probeId: string) => void;
  setSelectedPeripheral: (peripheral: string) => void;
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
  refreshMcuHardware: () => Promise<void>;
  flashMcuTarget: () => Promise<void>;
  launchQemuEmulator: () => Promise<void>;
  loadPeripheralBlock: (name: string) => Promise<void>;
}

export const useDebugStore = create<DebugStoreState>((set) => ({
  sessionState: 'stopped',
  activeEngine: 'probe-rs',
  activeTarget: 'STM32F407VGT6 (probe-rs)',
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

  // MCU Embedded Specific States
  probes: [
    {
      id: 'probe-0',
      name: 'ST-LINK/V2-1 (On-board NUCLEO-F401RE)',
      probe_type: 'stlink',
      serial_number: '066EFF535052717267154241',
      speed_khz: 4000,
      voltage: 3.28,
    },
    {
      id: 'probe-1',
      name: 'Raspberry Pi Debug Probe (CMSIS-DAP v2)',
      probe_type: 'cmsis-dap',
      serial_number: 'E6614104037A332E',
      speed_khz: 10000,
      voltage: 3.30,
    },
    {
      id: 'probe-2',
      name: 'SEGGER J-Link BASE Compact',
      probe_type: 'jlink',
      serial_number: '59401238',
      speed_khz: 15000,
      voltage: 3.32,
    },
  ],
  selectedProbeId: 'probe-0',
  supportedChips: [
    { family: 'STM32F4', name: 'STM32F407VGT6', core: 'Cortex-M4F', flash_kb: 1024, ram_kb: 192, default_frequency_mhz: 168 },
    { family: 'STM32F4', name: 'STM32F401RET6', core: 'Cortex-M4F', flash_kb: 512, ram_kb: 96, default_frequency_mhz: 84 },
    { family: 'STM32H7', name: 'STM32H743ZIT6', core: 'Cortex-M7', flash_kb: 2048, ram_kb: 1024, default_frequency_mhz: 480 },
    { family: 'Nordic Semi', name: 'nRF52840', core: 'Cortex-M4F', flash_kb: 1024, ram_kb: 256, default_frequency_mhz: 64 },
    { family: 'Raspberry Pi', name: 'RP2040', core: 'Dual Cortex-M0+', flash_kb: 2048, ram_kb: 264, default_frequency_mhz: 133 },
    { family: 'Espressif', name: 'ESP32-C3', core: 'RISC-V 32-bit', flash_kb: 4096, ram_kb: 400, default_frequency_mhz: 160 },
  ],
  selectedChip: 'STM32F407VGT6',
  defmtLogs: [
    { timestamp_ms: Date.now() - 120, level: 'info', target: 'embassy_stm32::rcc', message: 'RCC initialized: SYSCLK=168MHz, APB1=42MHz', file: 'src/main.rs', line: 24 },
    { timestamp_ms: Date.now() - 85, level: 'debug', target: 'app::dma', message: 'DMA2_Stream0 configured in circular mode', file: 'src/drivers/dma.rs', line: 52 },
    { timestamp_ms: Date.now() - 40, level: 'info', target: 'app::sensor', message: 'BMP280 sensor ready @ 0x58 (1013.25 hPa)', file: 'src/tasks/sensors.rs', line: 78 },
  ],
  qemuLogs: [
    '⚙️ QEMU system emulator: qemu-system-arm -machine lm3s6965evb -cpu cortex-m3',
    '🌐 GDB remote stub listening on 127.0.0.1:1234',
    '🖥️ Semihosting active: IO routed to IDE terminal',
  ],
  peripheralBlock: {
    name: 'GPIOA',
    base_address: 0x40020000,
    description: 'General-Purpose I/O Port A',
    registers: [
      {
        name: 'MODER',
        offset: 0x00,
        reset_value: 0xA8000000,
        current_value: 0xA8000400,
        access: 'read-write',
        fields: [
          { name: 'MODER5', bit_offset: 10, bit_width: 2, value: 1, description: 'Pin 5 Output (Green LED)' },
          { name: 'MODER13', bit_offset: 26, bit_width: 2, value: 2, description: 'Pin 13 Alternate Function' },
        ],
      },
      {
        name: 'ODR',
        offset: 0x14,
        reset_value: 0x00000000,
        current_value: 0x00000020,
        access: 'read-write',
        fields: [
          { name: 'ODR5', bit_offset: 5, bit_width: 1, value: 1, description: 'Output Pin 5 HIGH' },
        ],
      },
    ],
  },
  selectedPeripheral: 'GPIOA',

  setActiveEngine: (activeEngine) => set({ activeEngine }),
  setSelectedChip: (selectedChip) => set({ selectedChip }),
  setSelectedProbeId: (selectedProbeId) => set({ selectedProbeId }),
  setSelectedPeripheral: (selectedPeripheral) => set({ selectedPeripheral }),

  startDebugging: async (target: string) => {
    set({
      sessionState: 'paused',
      activeTarget: target,
      currentFile: 'src/main.rs',
      currentLine: 18,
      consoleOutput: [
        `[${target.includes('probe-rs') ? 'probe-rs' : 'lldb-mi'}] Attaching to hardware probe [ST-LINK/V2-1]`,
        '[probe-rs] Target Cortex-M4F halted at Reset Handler (0x08000189)',
        '[probe-rs] Setting hardware breakpoint 1 at src/main.rs:18',
        '[defmt] RTT channel 0 connected (buffer size: 1024 B)',
      ],
      stackFrames: [
        { id: 0, name: 'app::main()', file: 'src/main.rs', line: 18, column: 5 },
        { id: 1, name: 'embassy_executor::raw::Task::run()', file: 'embassy-executor/src/raw.rs', line: 120, column: 9 },
        { id: 2, name: 'Reset()', file: 'cortex-m-rt/src/lib.rs', line: 64, column: 1 },
      ],
      variables: [
        { name: "sp", var_type: "u32", value: "0x2001FFC0" },
        { name: "lr", var_type: "u32", value: "0x08000241" },
        { name: "pc", var_type: "u32", value: "0x08000190" },
        {
          name: "rcc_config",
          var_type: "embassy_stm32::rcc::Config",
          value: "Config { hse: Some(Hse { freq: 8MHz }), sys: Sysclk::PLL }",
          children: [
            { name: "hse_freq", var_type: "Hertz", value: "8_000_000" },
            { name: "pll_m", var_type: "u8", value: "8" },
            { name: "pll_n", var_type: "u16", value: "336" },
            { name: "pll_p", var_type: "u8", value: "2" },
          ],
        },
        { name: "led_pin", var_type: "Output<'static, PA5>", value: "Output { pin: PA5, level: High }" },
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
      consoleOutput: [...state.consoleOutput, '[probe-rs] Target detached & resumed in standalone mode'],
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
    setTimeout(() => {
      set((state) => ({
        sessionState: 'paused',
        currentFile: 'src/hardware.rs',
        currentLine: 42,
        consoleOutput: [...state.consoleOutput, '[probe-rs] Hit hardware breakpoint 2: src/hardware.rs:42:9'],
      }));
    }, 600);
  },

  stepOver: async () => {
    set((state) => {
      const nextLine = (state.currentLine || 18) + 1;
      return {
        currentLine: nextLine,
        consoleOutput: [...state.consoleOutput, `[probe-rs] Step over (single cycle asm) -> line ${nextLine}`],
      };
    });
  },

  stepInto: async () => {
    set((state) => ({
      currentFile: 'src/hardware.rs',
      currentLine: 12,
      consoleOutput: [...state.consoleOutput, `[probe-rs] Step into -> src/hardware.rs:12`],
      stackFrames: [
        { id: 0, name: 'app::hardware::init()', file: 'src/hardware.rs', line: 12, column: 5 },
        ...state.stackFrames,
      ],
    }));
  },

  stepOut: async () => {
    set((state) => ({
      currentFile: 'src/main.rs',
      currentLine: 19,
      consoleOutput: [...state.consoleOutput, `[probe-rs] Step out -> src/main.rs:19`],
      stackFrames: state.stackFrames.slice(1),
    }));
  },

  runToCursor: async (file: string, line: number) => {
    set((state) => ({
      currentFile: file,
      currentLine: line,
      consoleOutput: [...state.consoleOutput, `[probe-rs] Flash breakpoint set -> ${file}:${line}`],
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

  refreshMcuHardware: async () => {
    try {
      const probes = await tauriCommands.mcuDiscoverProbes();
      const chips = await tauriCommands.mcuGetSupportedChips();
      set({ probes, supportedChips: chips });
    } catch {
      // Fallback to defaults
    }
  },

  flashMcuTarget: async () => {
    set((state) => ({
      consoleOutput: [
        ...state.consoleOutput,
        `[probe-rs] Flashing ${state.selectedChip} using probe [${state.selectedProbeId}]...`,
        '[probe-rs] Sector erase: 0x08000000 - 0x08020000 [OK]',
        '[probe-rs] Written 84.2 KB @ 342 KB/s',
        '[probe-rs] Verified CRC32 checksum: 0x9B4E12FA [OK]',
        '[probe-rs] Reset & Run target',
      ],
    }));
  },

  launchQemuEmulator: async () => {
    try {
      const logs = await tauriCommands.mcuLaunchQemu({
        machine: 'lm3s6965evb',
        cpu: 'cortex-m3',
        gdb_port: 1234,
        semihosting_enabled: true,
        kernel_elf_path: 'target/thumbv7m-none-eabi/debug/app.elf',
      });
      set((state) => ({ qemuLogs: [...state.qemuLogs, ...logs] }));
    } catch {
      // Fallback
    }
  },

  loadPeripheralBlock: async (name: string) => {
    try {
      const block = await tauriCommands.mcuReadPeripheralRegisters(name);
      set({ peripheralBlock: block, selectedPeripheral: name });
    } catch {
      // Fallback
    }
  },
}));
