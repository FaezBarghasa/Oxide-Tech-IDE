import React, { useState } from 'react';
import { 
  Play, Pause, Square, ArrowRight, CornerDownRight, ArrowUpRight, 
  RotateCcw, Bug, ChevronRight, ChevronDown, Circle, Trash2, Plus, CornerDownLeft,
  Cpu, Radio, Activity, RefreshCw, Zap, Server
} from 'lucide-react';
import { useDebugStore, DebugVariable, DebugEngineType } from '../../state/debugStore';
import { MemoryHexView } from './MemoryHexView';
import { DisassemblyView } from './DisassemblyView';

export function DebuggerToolWindow() {
  const {
    sessionState,
    activeEngine,
    activeTarget,
    currentLine,
    currentFile,
    stackFrames,
    variables,
    breakpoints,
    watchExpressions,
    consoleOutput,
    probes,
    selectedProbeId,
    supportedChips,
    selectedChip,
    defmtLogs,
    qemuLogs,
    peripheralBlock,
    selectedPeripheral,
    setActiveEngine,
    setSelectedChip,
    setSelectedProbeId,
    setSelectedPeripheral,
    startDebugging,
    stopDebugging,
    pauseExecution,
    resumeExecution,
    stepOver,
    stepInto,
    stepOut,
    toggleBreakpoint,
    addWatchExpression,
    removeWatchExpression,
    refreshMcuHardware,
    flashMcuTarget,
    launchQemuEmulator,
    loadPeripheralBlock,
  } = useDebugStore();

  const [activeTab, setActiveTab] = useState<'variables' | 'watches' | 'peripherals' | 'hex' | 'disassembly' | 'defmt' | 'qemu' | 'hardware' | 'console'>('variables');
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({ config: true, rcc_config: true });
  const [expandedRegs, setExpandedRegs] = useState<Record<string, boolean>>({ MODER: true, CR: true });
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  const toggleVarExpand = (name: string) => {
    setExpandedVars((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleRegExpand = (name: string) => {
    setExpandedRegs((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchInput.trim()) {
      addWatchExpression(newWatchInput.trim());
      setNewWatchInput('');
      setIsAddingWatch(false);
    }
  };

  const renderVariableRow = (v: DebugVariable, depth: number = 0) => {
    const isExpanded = !!expandedVars[v.name];
    const hasChildren = v.children && v.children.length > 0;

    return (
      <div key={v.name} className="flex flex-col">
        <div 
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className="py-1 pr-2 hover:bg-[#2b2d30] flex items-center justify-between text-xs font-mono rounded cursor-pointer"
          onClick={() => hasChildren && toggleVarExpand(v.name)}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {hasChildren ? (
              <span className="text-[#868a91]">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            ) : (
              <span className="w-3" />
            )}
            <span className="text-[#9876aa] font-semibold">{v.name}</span>
            <span className="text-[#868a91] text-[10px]">({v.var_type}):</span>
            <span className="text-[#6a8759] truncate">{v.value}</span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{v.children!.map((child) => renderVariableRow(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* JetBrains Debugger Action Controls Strip */}
      <div className="h-9 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1">
          {/* Engine Selector Dropdown */}
          <select
            value={activeEngine}
            onChange={(e) => setActiveEngine(e.target.value as DebugEngineType)}
            className="bg-[#1e1f22] border border-[#393b40] rounded px-1.5 py-0.5 text-[11px] text-[#589df6] font-medium mr-1 focus:outline-none cursor-pointer"
          >
            <option value="probe-rs">probe-rs (Hardware SWD/JTAG)</option>
            <option value="openocd">OpenOCD GDB Server</option>
            <option value="qemu">QEMU System Emulator</option>
            <option value="defmt-rtt">defmt RTT Telemetry</option>
            <option value="lldb">LLDB Desktop Native</option>
          </select>

          <div className="h-4 w-px bg-[#393b40] mx-0.5" />

          {/* Resume / Pause (F9) */}
          {sessionState === 'paused' ? (
            <button
              onClick={resumeExecution}
              title="Resume Target Execution (F9)"
              className="p-1.5 hover:bg-[#35373c] text-[#57a64a] hover:text-[#6ec85c] rounded transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : sessionState === 'running' ? (
            <button
              onClick={pauseExecution}
              title="Halt / Break Target"
              className="p-1.5 hover:bg-[#35373c] text-[#e06c75] rounded transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => startDebugging(activeTarget)}
              title="Start Hardware Debugger (Shift+F9)"
              className="p-1.5 hover:bg-[#35373c] text-[#3574f0] rounded transition-colors cursor-pointer"
            >
              <Bug className="w-4 h-4" />
            </button>
          )}

          {/* Stop (Ctrl+F2) */}
          <button
            onClick={stopDebugging}
            disabled={sessionState === 'stopped'}
            title="Stop & Reset Target (Ctrl+F2)"
            className="p-1.5 hover:bg-[#35373c] text-[#e06c75] disabled:opacity-40 rounded transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <div className="h-4 w-px bg-[#393b40] mx-0.5" />

          {/* Step Over (F8) */}
          <button
            onClick={stepOver}
            disabled={sessionState !== 'paused'}
            title="Step Over Asm / Instruction (F8)"
            className="p-1.5 hover:bg-[#35373c] text-[#3574f0] disabled:opacity-40 rounded transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Step Into (F7) */}
          <button
            onClick={stepInto}
            disabled={sessionState !== 'paused'}
            title="Step Into Subroutine (F7)"
            className="p-1.5 hover:bg-[#35373c] text-[#3574f0] disabled:opacity-40 rounded transition-colors cursor-pointer"
          >
            <CornerDownRight className="w-4 h-4" />
          </button>

          {/* Step Out (Shift+F8) */}
          <button
            onClick={stepOut}
            disabled={sessionState !== 'paused'}
            title="Step Out (Shift+F8)"
            className="p-1.5 hover:bg-[#35373c] text-[#3574f0] disabled:opacity-40 rounded transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Flash Target Button */}
          <button
            onClick={flashMcuTarget}
            title="Flash Firmware (probe-rs run)"
            className="flex items-center space-x-1 px-2 py-1 bg-[#2b2d30] hover:bg-[#3574f0] text-white rounded text-[11px] transition-colors cursor-pointer ml-1"
          >
            <Zap className="w-3 h-3 text-[#f1c40f]" />
            <span>Flash</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => startDebugging(activeTarget)}
            title="Reset Core (Ctrl+F5)"
            className="p-1.5 hover:bg-[#35373c] text-[#868a91] hover:text-white rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Chip Target & Hardware Probe Status */}
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="px-1.5 py-0.5 rounded bg-[#2b2d30] text-[#868a91] font-mono border border-[#393b40]">
            {selectedChip}
          </span>
          {currentLine && (
            <span className="px-2 py-0.5 rounded bg-[#2e436e] text-white font-mono text-[10px] font-bold">
              {currentFile}:{currentLine}
            </span>
          )}
        </div>
      </div>

      {/* Main Debugger Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Frames & Breakpoints */}
        <div className="w-64 border-r border-[#2b2d30] bg-[#1a1b1d] flex flex-col shrink-0">
          <div className="p-2 border-b border-[#2b2d30] font-semibold text-white text-[11px] flex items-center justify-between">
            <span>Frames (Call Stack)</span>
            <span className="text-[10px] text-[#868a91] font-mono">{stackFrames.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {stackFrames.map((frame) => (
              <div
                key={frame.id}
                className={`px-2 py-1.5 rounded cursor-pointer text-xs truncate ${
                  frame.id === 0 ? 'bg-[#2e436e] text-white font-medium' : 'text-[#dfe1e5] hover:bg-[#2b2d30]'
                }`}
              >
                <div className="truncate text-[11px]">{frame.name}</div>
                <div className="text-[9.5px] text-[#868a91] font-mono truncate">
                  {frame.file}:{frame.line}
                </div>
              </div>
            ))}
          </div>

          {/* Breakpoints Subpanel */}
          <div className="border-t border-[#2b2d30] p-2 bg-[#1a1b1d]">
            <div className="font-semibold text-white text-[11px] mb-1.5 flex items-center justify-between">
              <span>Hardware Breakpoints</span>
              <span className="text-[10px] text-[#868a91] font-mono">{breakpoints.length}/6</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {breakpoints.map((bp) => (
                <div
                  key={bp.id}
                  onClick={() => toggleBreakpoint(bp.file, bp.line)}
                  className="flex items-center justify-between text-[10px] font-mono p-1 rounded hover:bg-[#2b2d30] cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <Circle className={`w-2.5 h-2.5 ${bp.enabled ? 'text-[#e06c75] fill-current' : 'text-[#868a91]'}`} />
                    <span className="truncate">{bp.file}:{bp.line}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabbed Subpanels (Variables, Watches, Peripherals, defmt, QEMU, Hardware, Console) */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1f22]">
          {/* Sub-tabs */}
          <div className="h-7 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center space-x-3 overflow-x-auto">
            {[
              { id: 'variables', label: 'Variables' },
              { id: 'watches', label: 'Watches' },
              { id: 'peripherals', label: 'Peripherals (SVD)' },
              { id: 'hex', label: 'Hex Memory' },
              { id: 'disassembly', label: 'Disassembly' },
              { id: 'defmt', label: 'defmt RTT' },
              { id: 'qemu', label: 'QEMU Emulator' },
              { id: 'hardware', label: 'Probes / Targets' },
              { id: 'console', label: 'Debug Console' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === t.id ? 'text-[#3574f0] border-b-2 border-[#3574f0] pb-1 font-semibold' : 'text-[#868a91] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-3 overflow-y-auto">
            {/* Hex Memory Tab */}
            {activeTab === 'hex' && (
              <MemoryHexView selectedChip={selectedChip} probeSerial={selectedProbeId || undefined} />
            )}

            {/* Disassembly Tab */}
            {activeTab === 'disassembly' && (
              <DisassemblyView selectedChip={selectedChip} probeSerial={selectedProbeId || undefined} />
            )}

            {/* Variables */}
            {activeTab === 'variables' && (
              <div className="space-y-1">
                {variables.length > 0 ? (
                  variables.map((v) => renderVariableRow(v))
                ) : (
                  <div className="text-center py-8 text-[#6f737a]">
                    Target halted. No local variables active.
                  </div>
                )}
              </div>
            )}

            {/* Watches */}
            {activeTab === 'watches' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#868a91]">Watch Expressions</span>
                  <button
                    onClick={() => setIsAddingWatch(true)}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#2b2d30] hover:bg-[#3574f0] text-white rounded text-[10px] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Watch</span>
                  </button>
                </div>

                {isAddingWatch && (
                  <form onSubmit={handleAddWatch} className="flex items-center space-x-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="e.g. pac::GPIOA.odr().read()"
                      value={newWatchInput}
                      onChange={(e) => setNewWatchInput(e.target.value)}
                      autoFocus
                      className="flex-1 bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-[#3574f0]"
                    />
                    <button type="submit" className="p-1 bg-[#3574f0] text-white rounded cursor-pointer">
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {watchExpressions.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-1.5 bg-[#1a1b1d] border border-[#2b2d30] rounded font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#3574f0] font-semibold">{w.expression}</span>
                      <span className="text-[#868a91]">=</span>
                      <span className="text-[#6a8759]">{w.result}</span>
                    </div>
                    <button onClick={() => removeWatchExpression(w.id)} className="text-[#868a91] hover:text-[#e06c75] cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SVD Peripheral Registers Inspector */}
            {activeTab === 'peripherals' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b2d30]">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-[#3574f0]" />
                    <span className="font-semibold text-white">SVD Peripheral Registers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedPeripheral}
                      onChange={(e) => {
                        setSelectedPeripheral(e.target.value);
                        loadPeripheralBlock(e.target.value);
                      }}
                      className="bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="GPIOA">GPIOA (0x40020000)</option>
                      <option value="RCC">RCC (0x40023800)</option>
                      <option value="USART1">USART1 (0x40011000)</option>
                      <option value="ADC1">ADC1 (0x40012000)</option>
                    </select>
                  </div>
                </div>

                {peripheralBlock && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-[#868a91] font-mono">
                      Base Address: <span className="text-white">0x{peripheralBlock.base_address.toString(16).toUpperCase()}</span> — {peripheralBlock.description}
                    </div>

                    <div className="space-y-1">
                      {peripheralBlock.registers.map((reg) => (
                        <div key={reg.name} className="border border-[#2b2d30] rounded bg-[#1a1b1d] overflow-hidden">
                          <div
                            onClick={() => toggleRegExpand(reg.name)}
                            className="px-2.5 py-1.5 bg-[#26282d] hover:bg-[#2b2d30] flex items-center justify-between font-mono text-xs cursor-pointer"
                          >
                            <div className="flex items-center space-x-2">
                              {expandedRegs[reg.name] ? <ChevronDown className="w-3.5 h-3.5 text-[#868a91]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#868a91]" />}
                              <span className="font-bold text-[#e5c07b]">{reg.name}</span>
                              <span className="text-[10px] text-[#868a91]">(+0x{reg.offset.toString(16).padStart(2, '0').toUpperCase()})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[#98c379] font-mono font-bold">0x{reg.current_value.toString(16).padStart(8, '0').toUpperCase()}</span>
                              <span className="text-[9px] px-1 rounded bg-[#35373c] text-[#868a91]">{reg.access}</span>
                            </div>
                          </div>

                          {expandedRegs[reg.name] && (
                            <div className="p-2 space-y-1 bg-[#1e1f22] border-t border-[#2b2d30]">
                              {reg.fields.map((f) => (
                                <div key={f.name} className="flex items-center justify-between text-[11px] font-mono hover:bg-[#2b2d30] p-1 rounded">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[#3574f0] font-semibold">{f.name}</span>
                                    <span className="text-[10px] text-[#868a91]">[{f.bit_offset + f.bit_width - 1}:{f.bit_offset}]</span>
                                    <span className="text-[#868a91] text-[10px] truncate max-w-xs">{f.description}</span>
                                  </div>
                                  <span className="text-[#d19a66] font-bold">0x{f.value.toString(16).toUpperCase()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* defmt RTT Telemetry Stream */}
            {activeTab === 'defmt' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b2d30]">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#57a64a]" />
                    <span className="font-semibold text-white">defmt RTT Real-Time Telemetry</span>
                  </div>
                  <span className="text-[10px] text-[#57a64a] font-mono flex items-center space-x-1">
                    <Circle className="w-2 h-2 fill-current animate-pulse" />
                    <span>RTT Channel 0 Connected</span>
                  </span>
                </div>

                <div className="space-y-1 font-mono text-xs">
                  {defmtLogs.map((log, i) => (
                    <div key={i} className="p-1.5 rounded bg-[#1a1b1d] border border-[#2b2d30] flex items-start space-x-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        log.level === 'error' ? 'bg-red-900/60 text-red-300' :
                        log.level === 'warn' ? 'bg-amber-900/60 text-amber-300' :
                        log.level === 'info' ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-300'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-[#868a91] text-[10px]">{log.target}:</span>
                      <span className="text-[#dfe1e5] flex-1">{log.message}</span>
                      <span className="text-[#6f737a] text-[10px]">{log.file}:{log.line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QEMU Emulator Console */}
            {activeTab === 'qemu' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b2d30]">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-[#e5c07b]" />
                    <span className="font-semibold text-white">QEMU System Emulator</span>
                  </div>
                  <button
                    onClick={launchQemuEmulator}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#3574f0] hover:bg-[#2e436e] text-white rounded text-[11px] cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch QEMU (GDB :1234)</span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#141517] rounded border border-[#2b2d30] font-mono text-[11px] text-[#98c379] space-y-1">
                  {qemuLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Hardware Probes & Target Chip Selector */}
            {activeTab === 'hardware' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b2d30]">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#3574f0]" />
                    <span className="font-semibold text-white">Hardware Debug Probes (probe-rs / OpenOCD)</span>
                  </div>
                  <button
                    onClick={refreshMcuHardware}
                    className="p-1 hover:bg-[#2b2d30] rounded text-[#868a91] hover:text-white cursor-pointer"
                    title="Rescan USB Probes"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {probes.map((probe) => (
                    <div
                      key={probe.id}
                      onClick={() => setSelectedProbeId(probe.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-colors ${
                        selectedProbeId === probe.id ? 'bg-[#2b2d30] border-[#3574f0]' : 'bg-[#1a1b1d] border-[#2b2d30] hover:border-[#393b40]'
                      }`}
                    >
                      <div className="font-semibold text-white text-xs truncate">{probe.name}</div>
                      <div className="text-[10px] text-[#868a91] font-mono mt-1 space-y-0.5">
                        <div>Type: <span className="text-[#e5c07b] uppercase">{probe.probe_type}</span></div>
                        <div>Serial: {probe.serial_number}</div>
                        <div>Speed: {probe.speed_khz} kHz | Target Voltage: {probe.voltage.toFixed(2)} V</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#2b2d30]">
                  <span className="font-semibold text-white block mb-2">Supported Target Chips</span>
                  <div className="grid grid-cols-3 gap-2">
                    {supportedChips.map((chip) => (
                      <div
                        key={chip.name}
                        onClick={() => setSelectedChip(chip.name)}
                        className={`p-2 rounded border cursor-pointer text-xs ${
                          selectedChip === chip.name ? 'bg-[#2b2d30] border-[#57a64a]' : 'bg-[#1a1b1d] border-[#2b2d30] hover:border-[#393b40]'
                        }`}
                      >
                        <div className="font-bold text-white truncate">{chip.name}</div>
                        <div className="text-[10px] text-[#868a91]">{chip.core}</div>
                        <div className="text-[9px] text-[#868a91]">{chip.flash_kb}KB Flash / {chip.ram_kb}KB RAM</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Debug Console */}
            {activeTab === 'console' && (
              <div className="font-mono text-[11px] text-[#868a91] space-y-1">
                {consoleOutput.map((line, i) => (
                  <div key={i} className={line.includes('Error') ? 'text-[#e06c75]' : line.includes('Stopped') || line.includes('Target') ? 'text-[#3574f0]' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

