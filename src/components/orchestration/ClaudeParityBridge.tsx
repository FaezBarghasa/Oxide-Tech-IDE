import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Terminal, BookOpen, Layers, Play, CheckCircle2, ShieldCheck, Sparkles, RefreshCw, FileSearch, Code2 } from 'lucide-react';
import { ClaudeConvention, ClaudeSlashCommand, OxReadResult, OxEditResult, OxGrepResult, OxBashResult } from '../../types/ast';

interface ClaudeParityBridgeProps {
  workspacePath?: string;
}

export const ClaudeParityBridge: React.FC<ClaudeParityBridgeProps> = ({
  workspacePath = '/home/jrad/RustroverProjects/Oxide-Tech-IDE'
}) => {
  const [activeTab, setActiveTab] = useState<'conventions' | 'commands' | 'arsenal'>('conventions');
  const [conventions, setConventions] = useState<ClaudeConvention[]>([]);
  const [slashCommands, setSlashCommands] = useState<ClaudeSlashCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Arsenal Test Runner state
  const [testTool, setTestTool] = useState<'read' | 'edit' | 'grep' | 'bash'>('read');
  const [targetFile, setTargetFile] = useState('src-tauri/crates/core/src/lib.rs');
  const [readOffset, setReadOffset] = useState(1);
  const [readLimit, setReadLimit] = useState(25);
  const [oldStr, setOldStr] = useState('pub mod claude_bridge;');
  const [newStr, setNewStr] = useState('pub mod claude_bridge;');
  const [grepPattern, setGrepPattern] = useState('ClaudeBridge');
  const [bashCommand, setBashCommand] = useState('cargo check --manifest-path src-tauri/crates/core/Cargo.toml');

  const [readOutput, setReadOutput] = useState<OxReadResult | null>(null);
  const [editOutput, setEditOutput] = useState<OxEditResult | null>(null);
  const [grepOutput, setGrepOutput] = useState<OxGrepResult | null>(null);
  const [bashOutput, setBashOutput] = useState<OxBashResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const fetchClaudeData = async () => {
    setLoading(true);
    try {
      const convs = await invoke<ClaudeConvention[]>('parse_claude_conventions', { workspacePath });
      setConventions(convs);

      const cmds = await invoke<ClaudeSlashCommand[]>('discover_claude_slash_commands', { workspacePath });
      setSlashCommands(cmds);
    } catch (e) {
      console.error('Failed to load Claude data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaudeData();
  }, [workspacePath]);

  const handleExecuteTool = async () => {
    setIsExecuting(true);
    try {
      if (testTool === 'read') {
        const res = await invoke<OxReadResult>('execute_ox_read', {
          workspacePath,
          filePath: targetFile,
          offset: Number(readOffset),
          limit: Number(readLimit),
        });
        setReadOutput(res);
      } else if (testTool === 'edit') {
        const res = await invoke<OxEditResult>('execute_ox_edit', {
          workspacePath,
          filePath: targetFile,
          oldStr,
          newStr,
        });
        setEditOutput(res);
      } else if (testTool === 'grep') {
        const res = await invoke<OxGrepResult>('execute_ox_grep', {
          workspacePath,
          pattern: grepPattern,
          extFilter: 'rs',
        });
        setGrepOutput(res);
      } else if (testTool === 'bash') {
        const res = await invoke<OxBashResult>('execute_ox_bash', {
          workspacePath,
          command: bashCommand,
        });
        setBashOutput(res);
      }
    } catch (e) {
      console.error('Tool execution error:', e);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12141a] text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#181a20] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-100 tracking-wide">Claude Code Bridge & Arsenal</span>
            <span className="text-slate-500 ml-2">CLAUDE.md Memory Ingestion, .mcp.json & Ghost Tools</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('conventions')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'conventions'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            CLAUDE.md Rules ({conventions.length})
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'commands'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Slash Commands ({slashCommands.length})
          </button>
          <button
            onClick={() => setActiveTab('arsenal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'arsenal'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Oxide Arsenal Sandbox
          </button>
          <button
            onClick={fetchClaudeData}
            disabled={loading}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'conventions' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Structured CLAUDE.md Memory Ingestion
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Directives extracted into local Semantic Memory nodes instead of raw token-wasting prompt dumps.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  90% Token Savings
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {conventions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#161822] rounded-lg border border-slate-800">
                  No CLAUDE.md files found in workspace root or .claude/ directory.
                </div>
              ) : (
                conventions.map((conv, idx) => (
                  <div key={idx} className="p-3 bg-[#181a22] border border-slate-800 rounded-lg flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold uppercase">
                        {conv.category}
                      </span>
                      {conv.context_pattern && (
                        <span className="text-[10px] text-slate-400 font-mono">Scope: {conv.context_pattern}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 pt-1">{conv.rule}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'commands' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Native `.claude/commands/` Slash Workflows
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Custom markdown workflows discovered and converted into executable DAG templates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {slashCommands.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-slate-500 bg-[#161822] rounded-lg border border-slate-800">
                  No custom slash commands found in `.claude/commands/`.
                </div>
              ) : (
                slashCommands.map((cmd) => (
                  <div key={cmd.name} className="p-3 bg-[#181a22] border border-slate-800 rounded-lg flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 text-xs">/{cmd.name}</span>
                      <span className="text-[10px] text-slate-500">Custom Command</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{cmd.description}</p>
                    <pre className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded max-h-24 overflow-y-auto border border-slate-800">
                      {cmd.prompt_template}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'arsenal' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Tool Selection Sidebar */}
            <div className="w-64 border-r border-slate-800 bg-[#14161d] p-3 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">OXIDE HARNESS TOOLS</span>

              <button
                onClick={() => setTestTool('read')}
                className={`w-full p-2.5 rounded-lg text-left border flex items-center gap-2 transition-all ${
                  testTool === 'read' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-[#181a22] border-slate-800 text-slate-300'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="font-semibold text-xs">ox_read</div>
                  <div className="text-[10px] text-slate-500">AST Symbol Reader</div>
                </div>
              </button>

              <button
                onClick={() => setTestTool('edit')}
                className={`w-full p-2.5 rounded-lg text-left border flex items-center gap-2 transition-all ${
                  testTool === 'edit' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-[#181a22] border-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-xs">ox_edit</div>
                  <div className="text-[10px] text-slate-500">Graph-Invalidating Edit</div>
                </div>
              </button>

              <button
                onClick={() => setTestTool('grep')}
                className={`w-full p-2.5 rounded-lg text-left border flex items-center gap-2 transition-all ${
                  testTool === 'grep' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-[#181a22] border-slate-800 text-slate-300'
                }`}
              >
                <FileSearch className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <div className="font-semibold text-xs">ox_grep</div>
                  <div className="text-[10px] text-slate-500">Hybrid Text & Symbol Search</div>
                </div>
              </button>

              <button
                onClick={() => setTestTool('bash')}
                className={`w-full p-2.5 rounded-lg text-left border flex items-center gap-2 transition-all ${
                  testTool === 'bash' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-[#181a22] border-slate-800 text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <div className="font-semibold text-xs">ox_bash</div>
                  <div className="text-[10px] text-slate-500">Atomic Bubblewrap Sandbox</div>
                </div>
              </button>
            </div>

            {/* Test Inputs & Result Inspector */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-3xl">
              <div className="space-y-3">
                {testTool === 'read' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Target File Path</label>
                      <input
                        type="text"
                        value={targetFile}
                        onChange={(e) => setTargetFile(e.target.value)}
                        className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Line Offset</label>
                        <input
                          type="number"
                          value={readOffset}
                          onChange={(e) => setReadOffset(Number(e.target.value))}
                          className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Line Limit</label>
                        <input
                          type="number"
                          value={readLimit}
                          onChange={(e) => setReadLimit(Number(e.target.value))}
                          className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {testTool === 'edit' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Target File Path</label>
                      <input
                        type="text"
                        value={targetFile}
                        onChange={(e) => setTargetFile(e.target.value)}
                        className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Old String Target</label>
                      <input
                        type="text"
                        value={oldStr}
                        onChange={(e) => setOldStr(e.target.value)}
                        className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-rose-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">New Replacement String</label>
                      <input
                        type="text"
                        value={newStr}
                        onChange={(e) => setNewStr(e.target.value)}
                        className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-emerald-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {testTool === 'grep' && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Grep Query Pattern</label>
                    <input
                      type="text"
                      value={grepPattern}
                      onChange={(e) => setGrepPattern(e.target.value)}
                      className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-cyan-300 text-xs font-mono"
                    />
                  </div>
                )}

                {testTool === 'bash' && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Sandboxed Bash Command</label>
                    <input
                      type="text"
                      value={bashCommand}
                      onChange={(e) => setBashCommand(e.target.value)}
                      className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-purple-300 text-xs font-mono"
                    />
                  </div>
                )}

                <button
                  onClick={handleExecuteTool}
                  disabled={isExecuting}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded flex items-center justify-center gap-2 hover:opacity-95"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isExecuting ? 'Executing in Ghost Sandbox...' : `Execute ${testTool.toUpperCase()}`}
                </button>
              </div>

              {/* Outputs */}
              {readOutput && testTool === 'read' && (
                <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lines: {readOutput.line_count}</span>
                    <span>Symbols Detected: {readOutput.ast_symbols.length}</span>
                  </div>
                  {readOutput.ast_symbols.length > 0 && (
                    <div className="text-[10px] text-amber-300 bg-slate-950/60 p-2 rounded border border-slate-800">
                      AST Symbols: {readOutput.ast_symbols.join(' | ')}
                    </div>
                  )}
                  <pre className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded max-h-60 overflow-y-auto font-mono">
                    {readOutput.content}
                  </pre>
                </div>
              )}

              {editOutput && testTool === 'edit' && (
                <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Replaced {editOutput.occurrences_replaced} occurrence(s)
                  </div>
                  <pre className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded font-mono">
                    {editOutput.diff_preview}
                  </pre>
                </div>
              )}

              {grepOutput && testTool === 'grep' && (
                <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <div className="text-[11px] text-cyan-300 font-semibold">
                    Found {grepOutput.total_matches} match(es) for &quot;{grepOutput.pattern}&quot;
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {grepOutput.matches.map((m, i) => (
                      <div key={i} className="p-1.5 bg-slate-950/60 rounded text-[10px] font-mono flex items-center justify-between">
                        <span className="text-slate-400">{m.file_path}:{m.line_number}</span>
                        <span className="text-slate-200">{m.line_content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bashOutput && testTool === 'bash' && (
                <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={bashOutput.exit_code === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Exit Code: {bashOutput.exit_code}
                    </span>
                    <span className="text-slate-400">{bashOutput.duration_ms}ms</span>
                    <span className="text-amber-400">Errors Detected: {bashOutput.compiler_error_count}</span>
                  </div>
                  <pre className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded max-h-60 overflow-y-auto font-mono">
                    {bashOutput.stdout || bashOutput.stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
