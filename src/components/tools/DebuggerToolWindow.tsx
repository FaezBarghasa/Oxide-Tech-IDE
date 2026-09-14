import { useState } from 'react';
import { 
  Play, Pause, Square, ArrowRight, CornerDownRight, ArrowUpRight, 
  RotateCcw, Bug, ChevronRight, ChevronDown, Circle, Trash2, Plus, CornerDownLeft
} from 'lucide-react';
import { useDebugStore, DebugVariable } from '../../state/debugStore';

export function DebuggerToolWindow() {
  const {
    sessionState,
    activeTarget,
    currentLine,
    currentFile,
    stackFrames,
    variables,
    breakpoints,
    watchExpressions,
    consoleOutput,
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
  } = useDebugStore();

  const [activeTab, setActiveTab] = useState<'threads' | 'variables' | 'watches' | 'console'>('variables');
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({ config: true });
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  const toggleVarExpand = (name: string) => {
    setExpandedVars((prev) => ({ ...prev, [name]: !prev[name] }));
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
          {/* Resume / Pause (F9) */}
          {sessionState === 'paused' ? (
            <button
              onClick={resumeExecution}
              title="Resume Program (F9)"
              className="p-1.5 hover:bg-[#35373c] text-[#57a64a] hover:text-[#6ec85c] rounded transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : sessionState === 'running' ? (
            <button
              onClick={pauseExecution}
              title="Pause Program"
              className="p-1.5 hover:bg-[#35373c] text-[#e06c75] rounded transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => startDebugging(activeTarget)}
              title="Start Debugger (Shift+F9)"
              className="p-1.5 hover:bg-[#35373c] text-[#3574f0] rounded transition-colors cursor-pointer"
            >
              <Bug className="w-4 h-4" />
            </button>
          )}

          {/* Stop (Ctrl+F2) */}
          <button
            onClick={stopDebugging}
            disabled={sessionState === 'stopped'}
            title="Stop Debugger (Ctrl+F2)"
            className="p-1.5 hover:bg-[#35373c] text-[#e06c75] disabled:opacity-40 rounded transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <div className="h-4 w-px bg-[#393b40] mx-1" />

          {/* Step Over (F8) */}
          <button
            onClick={stepOver}
            disabled={sessionState !== 'paused'}
            title="Step Over (F8)"
            className="p-1.5 hover:bg-[#35373c] text-[#3574f0] disabled:opacity-40 rounded transition-colors cursor-pointer flex items-center space-x-1"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Step Into (F7) */}
          <button
            onClick={stepInto}
            disabled={sessionState !== 'paused'}
            title="Step Into (F7)"
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

          {/* Restart */}
          <button
            onClick={() => startDebugging(activeTarget)}
            title="Rerun Session (Ctrl+F5)"
            className="p-1.5 hover:bg-[#35373c] text-[#868a91] hover:text-white rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Target & Line Badge */}
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-[#868a91] font-mono">{activeTarget}</span>
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
              <span>Breakpoints</span>
              <span className="text-[10px] text-[#868a91] font-mono">{breakpoints.length}</span>
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

        {/* Right: Variables & Watches & LLDB Console */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1f22]">
          {/* Sub-tabs */}
          <div className="h-7 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center space-x-3">
            {[
              { id: 'variables', label: 'Variables' },
              { id: 'watches', label: 'Watches' },
              { id: 'console', label: 'LLDB Console' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`text-[11px] font-medium transition-colors cursor-pointer ${
                  activeTab === t.id ? 'text-[#3574f0] border-b-2 border-[#3574f0] pb-1' : 'text-[#868a91] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-3 overflow-y-auto">
            {activeTab === 'variables' && (
              <div className="space-y-1">
                {variables.length > 0 ? (
                  variables.map((v) => renderVariableRow(v))
                ) : (
                  <div className="text-center py-8 text-[#6f737a]">
                    No active debug variables. Start debugger or set breakpoint.
                  </div>
                )}
              </div>
            )}

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
                      placeholder="e.g. buffer.len()"
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

            {activeTab === 'console' && (
              <div className="font-mono text-[11px] text-[#868a91] space-y-1">
                {consoleOutput.map((line, i) => (
                  <div key={i} className={line.includes('Error') ? 'text-[#e06c75]' : line.includes('Stopped') ? 'text-[#3574f0]' : ''}>
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
