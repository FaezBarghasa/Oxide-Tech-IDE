import { invoke } from '@tauri-apps/api/core';
import { FileTreeNode } from '../types/api';
import {
  CargoWorkspaceMetadata,
  GitFileStatusDetail,
  LineDiffDetail,
  MacroExpansionResult,
} from '../types/oxide';

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
  getSystemStats: (): Promise<{ cpu_cores: number; vram_free: string; rss_mb?: number }> => invoke('get_system_stats'),
  getGitStatus: (workspacePath: string): Promise<string> => invoke('get_git_status', { workspacePath }),
  
  // Predictive RAG & AST Indexing
  triggerWorkspaceIndexing: (workspacePath: string): Promise<string> => invoke('trigger_workspace_indexing', { workspacePath }),
  getFileAstOutline: (filePath: string, content?: string): Promise<import('../types/oxide').AstNodeDto[]> => invoke('get_file_ast_outline', { filePath, content }),
  getPredictiveContext: (prompt: string): Promise<import('../types/oxide').ContextFile[]> => invoke('get_predictive_context', { prompt }),

  // Async Git bridge
  gitStatusAsync: (workspacePath: string): Promise<string> => invoke('git_status_async', { workspacePath }),
  gitAddAsync: (files: string[], workspacePath: string): Promise<string> => invoke('git_add_async', { files, workspacePath }),
  gitCommitAsync: (message: string, workspacePath: string): Promise<string> => invoke('git_commit_async', { message, workspacePath }),
  gitCreatePRAsync: (title: string, body: string, branch: string, workspacePath: string): Promise<string> => invoke('git_create_pr_async', { title, body, branch, workspacePath }),

  // Oxide Cargo operations
  cargoGetWorkspaceMetadata: (workspacePath: string): Promise<CargoWorkspaceMetadata> => invoke('cargo_get_workspace_metadata', { workspacePath }),
  rustExpandMacro: (sourceCode: string, macroName?: string, workspacePath: string = '.'): Promise<MacroExpansionResult> => invoke('rust_expand_macro', { sourceCode, macroName, workspacePath }),
  cargoAddDependency: (crateName: string, version?: string, workspacePath: string = '.'): Promise<string> => invoke('cargo_add_dependency', { crateName, version, workspacePath }),

  // Oxide VCS line diffs & statuses
  vcsGetDetailedStatus: (workspacePath: string): Promise<GitFileStatusDetail[]> => invoke('vcs_get_detailed_status', { workspacePath }),
  vcsGetLineDiffs: (filePath: string, workspacePath: string = '.'): Promise<LineDiffDetail[]> => invoke('vcs_get_line_diffs', { filePath, workspacePath }),

  // Oxide Layout & Keymaps persistence
  saveIdeLayout: (layoutJson: string): Promise<void> => invoke('save_ide_layout', { layoutJson }),
  loadIdeLayout: (): Promise<string> => invoke('load_ide_layout'),
  saveUserKeymap: (keymapJson: string): Promise<void> => invoke('save_user_keymap', { keymapJson }),
  loadUserKeymap: (): Promise<string> => invoke('load_user_keymap'),

  // Telemetry hardware daemons
  connectSerialPortDaemon: (port: string, baudRate: number): Promise<string> => invoke('connect_serial_port_daemon', { port, baudRate }),
  connectMqttDaemon: (broker: string, clientId: string): Promise<string> => invoke('connect_mqtt_daemon', { broker, clientId }),
  publishMqttMessageDaemon: (topic: string, message: string): Promise<string> => invoke('publish_mqtt_message_daemon', { topic, message }),
  getHardwareLogs: (): Promise<{ serial: string[], mqtt: string[] }> => invoke('get_hardware_logs'),
  clearHardwareBuffersDaemon: () => invoke<string>('clear_hardware_buffers_daemon'),
  disconnectHardwareDaemons: () => invoke<string>('disconnect_hardware_daemons'),

  // Built-in Request Proxy
  proxyRequest: (url: string, method: string, headers: Record<string, string>, body: string): Promise<string> => invoke('proxy_request', { url, method, headers, body }),

  // Visual Workstation Operations
  playwrightDiscoverTests: (workspaceRoot: string): Promise<import('../types/visualWorkstation').PlaywrightTestItem[]> => invoke('playwright_discover_tests', { workspaceRoot }),
  playwrightRunTest: (testId: string, filePath: string): Promise<import('../types/visualWorkstation').PlaywrightTestItem> => invoke('playwright_run_test', { testId, filePath }),
  playwrightCompareVisualBaselines: (baselinePath: string, currentPath: string): Promise<import('../types/visualWorkstation').PlaywrightVisualDiffResult> => invoke('playwright_compare_visual_baselines', { baselinePath, currentPath }),
  slintCompilePreview: (slintCode: string, filePath: string): Promise<import('../types/visualWorkstation').SlintComponentDefinition[]> => invoke('slint_compile_preview', { slintCode, filePath }),
  slintDispatchCanvasEvent: (eventType: string, x: number, y: number, key?: string): Promise<unknown> => invoke('slint_dispatch_canvas_event', { eventType, x, y, key }),
  embeddedSimGetProfiles: (): Promise<import('../types/visualWorkstation').EmbeddedDisplayProfile[]> => invoke('embedded_sim_get_profiles'),
  embeddedSimRenderSample: (profileId: string): Promise<import('../types/visualWorkstation').EmbeddedSimMetrics> => invoke('embedded_sim_render_sample', { profileId }),
  embeddedSimInjectInput: (sessionId: string, inputType: string, payload: unknown): Promise<string> => invoke('embedded_sim_inject_input', { sessionId, inputType, payload }),
  icedFetchWidgetTree: (cratePath: string): Promise<import('../types/visualWorkstation').IcedWidgetNode> => invoke('iced_fetch_widget_tree', { cratePath }),
  icedTriggerHotReload: (cratePath: string): Promise<unknown> => invoke('iced_trigger_hot_reload', { cratePath }),

  // MCU Hardware & Target Debugging (probe-rs, OpenOCD, defmt, QEMU, SVD)
  mcuDiscoverProbes: (): Promise<import('../types/mcuDebugger').McuDebugProbe[]> => invoke('mcu_discover_probes'),
  mcuGetSupportedChips: (): Promise<import('../types/mcuDebugger').McuTargetChip[]> => invoke('mcu_get_supported_chips'),
  mcuFlashFirmware: (probeId: string, chip: string, elfPath: string, tool: string): Promise<import('../types/mcuDebugger').McuFlashResult> => invoke('mcu_flash_firmware', { probeId, chip, elfPath, tool }),
  mcuPollDefmtRtt: (sessionId: string): Promise<import('../types/mcuDebugger').DefmtLogPacket[]> => invoke('mcu_poll_defmt_rtt', { sessionId }),
  mcuLaunchQemu: (config: import('../types/mcuDebugger').QemuSessionConfig): Promise<string[]> => invoke('mcu_launch_qemu', { config }),
  mcuReadPeripheralRegisters: (peripheralName: string): Promise<import('../types/mcuDebugger').PeripheralBlock> => invoke('mcu_read_peripheral_registers', { peripheralName }),
  runKlippWorkflow: (config: import('../types/mcuDebugger').KlippWorkflowConfig): Promise<import('../types/mcuDebugger').McuFlashResult> => invoke('run_klipp_workflow', { config }),
  mcpGetServerConfigs: (): Promise<import('../types/mcuDebugger').McpServerEntry[]> => invoke('mcp_get_server_configs'),
  mcpToggleServer: (serverId: string, enabled: boolean): Promise<boolean> => invoke('mcp_toggle_server', { serverId, enabled }),

  // Full-Duplex Interactive PTY Terminal
  ptySpawn: (sessionId: string, shell?: string, cwd?: string, cols?: number, rows?: number): Promise<string> =>
    invoke('pty_spawn', { sessionId, shell, cwd, cols: cols || 80, rows: rows || 24 }),
  ptyWrite: (sessionId: string, data: string): Promise<void> =>
    invoke('pty_write', { sessionId, data }),
  ptyResize: (sessionId: string, cols: number, rows: number): Promise<void> =>
    invoke('pty_resize', { sessionId, cols, rows }),
  ptyKill: (sessionId: string): Promise<void> =>
    invoke('pty_kill', { sessionId }),

  // Language Server Protocol (rust-analyzer)
  lspStart: (workspacePath: string): Promise<boolean> =>
    invoke('lsp_start', { workspacePath }),
  lspDidOpen: (path: string, text: string, version: number): Promise<void> =>
    invoke('lsp_did_open', { path, text, version }),
  lspDidChange: (path: string, text: string, version: number): Promise<void> =>
    invoke('lsp_did_change', { path, text, version }),
  lspDidSave: (path: string): Promise<void> =>
    invoke('lsp_did_save', { path }),
  lspDidClose: (path: string): Promise<void> =>
    invoke('lsp_did_close', { path }),
  lspCompletion: (path: string, line: number, character: number): Promise<unknown> =>
    invoke('lsp_completion', { path, line, character }),
  lspHover: (path: string, line: number, character: number): Promise<unknown> =>
    invoke('lsp_hover', { path, line, character }),
  lspDefinition: (path: string, line: number, character: number): Promise<unknown> =>
    invoke('lsp_definition', { path, line, character }),
  lspInlayHints: (path: string, startLine: number, endLine: number): Promise<unknown> =>
    invoke('lsp_inlay_hints', { path, startLine, endLine }),
  lspCodeActions: (path: string, startLine: number, startCol: number, endLine: number, endCol: number): Promise<unknown> =>
    invoke('lsp_code_actions', { path, startLine, startCol, endLine, endCol }),
  lspStatus: (): Promise<boolean> =>
    invoke('lsp_status'),

  // Filesystem Watcher Daemon
  fsWatchStart: (path: string): Promise<boolean> =>
    invoke('fs_watch_start', { path }),
  fsWatchStop: (): Promise<boolean> =>
    invoke('fs_watch_stop'),

  // Local History Revision Engine
  localHistoryRecordSnapshot: (filePath: string, content: string, triggerTag: string = 'save'): Promise<import('../types/oxide').LocalHistoryRevision> =>
    invoke('local_history_record_snapshot', { filePath, content, triggerTag }),
  localHistoryGetRevisions: (filePath: string): Promise<import('../types/oxide').LocalHistoryRevision[]> =>
    invoke('local_history_get_revisions', { filePath }),
  localHistoryGetRevisionContent: (filePath: string, revisionId: string): Promise<string> =>
    invoke('local_history_get_revision_content', { filePath, revisionId }),

  // Cargo Test Runner Engine (Phase 4 complete)
  discoverWorkspaceTests: (workspacePath: string): Promise<import('../types/oxide').WorkspaceTestItem[]> =>
    invoke('discover_workspace_tests', { workspacePath }),
  runSingleTest: (workspacePath: string, testId: string): Promise<import('../types/oxide').TestRunResult> =>
    invoke('run_single_test', { workspacePath, testId }),
  runAllTestsStreaming: (workspacePath: string): Promise<number> =>
    invoke('run_all_tests_streaming', { workspacePath }),
  llvmCovReport: (workspacePath: string): Promise<import('../types/oxide').CoverageFileReport[]> =>
    invoke('llvm_cov_report', { workspacePath }),

  // LSP Phase 2 completions — references, rename, workspace symbols, format
  lspReferences: (path: string, line: number, character: number): Promise<unknown> =>
    invoke('lsp_references', { path, line, character }),
  lspRename: (path: string, line: number, character: number, newName: string): Promise<unknown> =>
    invoke('lsp_rename', { path, line, character, newName }),
  lspWorkspaceSymbols: (query: string): Promise<unknown> =>
    invoke('lsp_workspace_symbols', { query }),
  lspFormatDocument: (path: string): Promise<unknown> =>
    invoke('lsp_format_document', { path }),

  // MCU Phase 5 completions — halt, reset, memory read
  mcuHalt: (chip: string, probeSerial?: string): Promise<string> =>
    invoke('mcu_halt', { chip, probeSerial }),
  mcuReset: (chip: string, haltAfterReset: boolean, probeSerial?: string): Promise<string> =>
    invoke('mcu_reset', { chip, haltAfterReset, probeSerial }),
  mcuMemoryRead: (chip: string, address: number, byteCount: number, probeSerial?: string): Promise<number[]> =>
    invoke('mcu_memory_read', { chip, address, byteCount, probeSerial }),

  // VCS Phase 6 completions — full diff, push, stash, log
  vcsGitDiffContent: (filePath: string, workspacePath: string, staged: boolean): Promise<string> =>
    invoke('vcs_git_diff_content', { filePath, workspacePath, staged }),
  vcsGitPush: (workspacePath: string, remote: string, branch: string, force: boolean): Promise<string> =>
    invoke('vcs_git_push', { workspacePath, remote, branch, force }),
  vcsGitStash: (workspacePath: string, message?: string): Promise<string> =>
    invoke('vcs_git_stash', { workspacePath, message }),
  vcsGitStashPop: (workspacePath: string): Promise<string> =>
    invoke('vcs_git_stash_pop', { workspacePath }),
  vcsGitLog: (workspacePath: string, limit: number): Promise<import('../types/oxide').GitCommitEntry[]> =>
    invoke('vcs_git_log', { workspacePath, limit }),

  // Global Search Phase 7 completions
  searchWorkspaceText: (workspacePath: string, query: string, options?: import('../types/oxide').SearchOptions): Promise<import('../types/oxide').SearchFileGroup[]> =>
    invoke('search_workspace_text', { workspacePath, query, options }),
  searchWorkspaceSymbols: (workspacePath: string, query: string): Promise<import('../types/oxide').SearchMatch[]> =>
    invoke('search_workspace_symbols', { workspacePath, query }),
  searchReplaceInFile: (filePath: string, find: string, replace: string, useRegex: boolean, caseSensitive: boolean): Promise<number> =>
    invoke('search_replace_in_file', { filePath, find, replace, useRegex, caseSensitive }),

  // VCS Phase 1 & 2 extensions
  vcsGitBlame: (workspacePath: string, filePath: string): Promise<import('../types/oxide').GitBlameLine[]> =>
    invoke('vcs_git_blame', { workspacePath, filePath }),
  vcsGitCherryPick: (workspacePath: string, commitHash: string): Promise<string> =>
    invoke('vcs_git_cherry_pick', { workspacePath, commitHash }),

  // MCU Debugger extensions
  mcuMemoryWrite: (chip: string, address: number, data: number[], probeSerial?: string): Promise<string> =>
    invoke('mcu_memory_write', { chip, address, data, probeSerial }),
  mcuDisassemble: (chip: string, address: number, instructionCount: number, probeSerial?: string): Promise<import('../types/oxide').DisassemblyInstruction[]> =>
    invoke('mcu_disassemble', { chip, address, instructionCount, probeSerial }),
};

export const tauriService = tauriCommands;


