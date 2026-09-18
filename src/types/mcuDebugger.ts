export interface McuDebugProbe {
  id: string;
  name: string;
  probe_type: 'cmsis-dap' | 'stlink' | 'jlink' | 'ftdi';
  serial_number: string;
  speed_khz: number;
  voltage: number;
}

export interface McuTargetChip {
  family: string;
  name: string;
  core: string;
  flash_kb: number;
  ram_kb: number;
  default_frequency_mhz: number;
}

export interface DefmtLogPacket {
  timestamp_ms: number;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  target: string;
  message: string;
  file: string;
  line: number;
}

export interface QemuSessionConfig {
  machine: string;
  cpu: string;
  gdb_port: number;
  semihosting_enabled: boolean;
  kernel_elf_path: string;
}

export interface PeripheralRegisterField {
  name: string;
  bit_offset: number;
  bit_width: number;
  value: number;
  description: string;
}

export interface PeripheralRegister {
  name: string;
  offset: number;
  reset_value: number;
  current_value: number;
  access: 'read-write' | 'read-only' | 'write-only';
  fields: PeripheralRegisterField[];
}

export interface PeripheralBlock {
  name: string;
  base_address: number;
  description: string;
  registers: PeripheralRegister[];
}

export interface McuFlashResult {
  success: boolean;
  bytes_written: number;
  duration_ms: number;
  speed_kb_s: number;
  output_logs: string[];
}

export interface KlippWorkflowConfig {
  workspace_path: string;
  target_chip: string;
  probe_id: string;
  release: boolean;
  features: string[];
}

export interface McpServerEntry {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools_count: number;
  transport: 'stdio' | 'sse' | 'websocket';
  description: string;
}

