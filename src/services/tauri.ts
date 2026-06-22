import { invoke } from '@tauri-apps/api/core';
import { FileTreeNode } from '../types/api';

export const tauriCommands = {
  readFile: (path: string): Promise<string> => invoke('read_file', { path }),
  writeFile: (path: string, content: string): Promise<void> => invoke('write_file', { path, content }),
  readDir: (path: string): Promise<FileTreeNode[]> => invoke('read_dir', { path }),
  createFile: (path: string): Promise<void> => invoke('create_file', { path }),
  createDir: (path: string): Promise<void> => invoke('create_dir', { path }),
  deleteFile: (path: string): Promise<void> => invoke('delete_file', { path }),
  renameFile: (oldPath: string, newPath: string): Promise<void> => invoke('rename_file', { oldPath, newPath }),
  spawnCargoCheck: (workspacePath: string): Promise<string> => invoke('spawn_cargo_check', { workspacePath }),
  spawnCargoClippy: (workspacePath: string): Promise<string> => invoke('spawn_cargo_clippy', { workspacePath }),
  executeTerminalCommand: (command: string, workspacePath: string, shellType?: string): Promise<string> => invoke('execute_terminal_command', { shellType, command, workspacePath }),
  getSystemStats: (): Promise<{ cpu_cores: number, vram_free: string }> => invoke('get_system_stats'),
  getGitStatus: (workspacePath: string): Promise<string> => invoke('get_git_status', { workspacePath }),
  
  // Predictive RAG & AST Indexing
  triggerWorkspaceIndexing: (workspacePath: string): Promise<string> => invoke('trigger_workspace_indexing', { workspacePath }),
  getPredictiveContext: (prompt: string): Promise<{ path: string; content: string; score: number }[]> => invoke('get_predictive_context', { prompt }),

  // Async Git bridge
  gitStatusAsync: (workspacePath: string): Promise<string> => invoke('git_status_async', { workspacePath }),
  gitAddAsync: (files: string[], workspacePath: string): Promise<string> => invoke('git_add_async', { files, workspacePath }),
  gitCommitAsync: (message: string, workspacePath: string): Promise<string> => invoke('git_commit_async', { message, workspacePath }),
  gitCreatePRAsync: (title: string, body: string, branch: string, workspacePath: string): Promise<string> => invoke('git_create_pr_async', { title, body, branch, workspacePath }),

  // Telemetry hardware daemons
  connectSerialPortDaemon: (port: string, baudRate: number): Promise<string> => invoke('connect_serial_port_daemon', { port, baudRate }),
  connectMqttDaemon: (broker: string, clientId: string): Promise<string> => invoke('connect_mqtt_daemon', { broker, clientId }),
  publishMqttMessageDaemon: (topic: string, message: string): Promise<string> => invoke('publish_mqtt_message_daemon', { topic, message }),
  getHardwareLogs: (): Promise<{ serial: string[], mqtt: string[] }> => invoke('get_hardware_logs'),
  clearHardwareBuffersDaemon: () => invoke<string>('clear_hardware_buffers_daemon'),
  disconnectHardwareDaemons: () => invoke<string>('disconnect_hardware_daemons'),

  // Built-in Request Proxy
  proxyRequest: (url: string, method: string, headers: Record<string, string>, body: string): Promise<string> => invoke('proxy_request', { url, method, headers, body })
};
