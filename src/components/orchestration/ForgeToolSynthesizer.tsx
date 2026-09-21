import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Anvil, FileCode, CheckCircle2, XCircle, Play, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { ForgedToolSummary, ForgeSynthesisRequest, ForgeSynthesisResult } from '../../types/ast';

interface ForgeToolSynthesizerProps {
  workspacePath?: string;
}

export const ForgeToolSynthesizer: React.FC<ForgeToolSynthesizerProps> = ({
  workspacePath = '.'
}) => {
  const [tools, setTools] = useState<ForgedToolSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'forge' | 'crystallized'>('catalog');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<ForgedToolSummary | null>(null);

  // New Tool Synthesis Form State
  const [toolName, setToolName] = useState('parse_intel_hex');
  const [toolDesc, setToolDesc] = useState('Parses Intel HEX firmware files and extracts memory segment records');
  const [inputSchemaStr, setInputSchemaStr] = useState(JSON.stringify({
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to .hex file' }
    },
    required: ['file_path']
  }, null, 2));

  const [cargoToml, setCargoToml] = useState(`[package]
name = "parse_intel_hex"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`);

  const [libRs, setLibRs] = useState(`use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct MemorySegment {
    pub address: u32,
    pub length: usize,
    pub data_hex: String,
}

pub fn decode_hex_data(input: &str) -> Vec<MemorySegment> {
    vec![
        MemorySegment {
            address: 0x08000000,
            length: input.len(),
            data_hex: input.to_string(),
        }
    ]
}
`);

  const [testRs, setTestRs] = useState(`use parse_intel_hex::decode_hex_data;

#[test]
fn test_decode_sample() {
    let segs = decode_hex_data("100000000004002011010008130100081501000888");
    assert_eq!(segs.len(), 1);
    assert_eq!(segs[0].address, 0x08000000);
}
`);

  const [synthesisResult, setSynthesisResult] = useState<ForgeSynthesisResult | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await invoke<ForgedToolSummary[]>('discover_forged_tools', { workspacePath });
      setTools(res);
      if (res.length > 0 && !selectedTool) {
        setSelectedTool(res[0]);
      }
    } catch (e) {
      console.error('Error discovering tools:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [workspacePath]);

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setSynthesisResult(null);
    try {
      let parsedSchema: Record<string, unknown> = {};
      try {
        parsedSchema = JSON.parse(inputSchemaStr);
      } catch {
        parsedSchema = { type: 'object' };
      }

      const req: ForgeSynthesisRequest = {
        tool_name: toolName.trim().toLowerCase().replace(/\s+/g, '_'),
        description: toolDesc,
        input_schema: parsedSchema,
        cargo_toml: cargoToml,
        lib_rs: libRs,
        integration_test_rs: testRs,
      };

      const result = await invoke<ForgeSynthesisResult>('synthesize_forged_tool', {
        workspacePath,
        req,
      });
      setSynthesisResult(result);
      if (result.success) {
        fetchTools();
      }
    } catch (e) {
      console.error('Synthesis failed:', e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRecordUsage = async (name: string) => {
    try {
      await invoke('record_forged_tool_usage', { workspacePath, toolName: name });
      fetchTools();
    } catch (e) {
      console.error('Failed to record usage:', e);
    }
  };

  const handleDeprecate = async (name: string) => {
    try {
      await invoke('deprecate_forged_tool', { workspacePath, toolName: name });
      fetchTools();
    } catch (e) {
      console.error('Failed to deprecate tool:', e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12141a] text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* Top Banner & Mode Selector */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#181a20] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Anvil className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-100 tracking-wide">The Forge</span>
            <span className="text-slate-500 ml-2">JIT Tool Synthesis & Lazar Protocol</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'catalog'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Tool Catalog ({tools.length})
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'forge'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Synthesize New Tool
          </button>
          <button
            onClick={fetchTools}
            disabled={loading}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh Tools"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Tool List Sidebar */}
            <div className="w-80 border-r border-slate-800/80 bg-[#14161d] flex flex-col">
              <div className="p-3 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>LOCAL TOOLS (.oxide/forge/tools)</span>
                <span className="text-amber-400">{tools.filter(t => !t.manifest.deprecated).length} Active</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {tools.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No tools synthesized yet.<br />
                    Click <span className="text-amber-400">Synthesize New Tool</span> to forge your first tool.
                  </div>
                ) : (
                  tools.map((t) => (
                    <div
                      key={t.name}
                      onClick={() => setSelectedTool(t)}
                      className={`p-2.5 rounded-lg cursor-pointer border transition-all ${
                        selectedTool?.name === t.name
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-[#181a22] border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-amber-400" />
                          {t.name}
                        </span>
                        {t.manifest.usage_count >= 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Crystallized
                          </span>
                        )}
                        {t.manifest.deprecated && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                            Deprecated
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.manifest.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span>v{t.manifest.version}</span>
                        <span>•</span>
                        <span>Used {t.manifest.usage_count}x</span>
                        <span>•</span>
                        <span className={t.wasm_exists ? 'text-emerald-400' : 'text-amber-400'}>
                          {t.wasm_exists ? 'Wasm Ready' : 'Source Only'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tool Detail View */}
            <div className="flex-1 bg-[#12141a] p-5 overflow-y-auto flex flex-col">
              {selectedTool ? (
                <div className="space-y-4 max-w-3xl">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-100">{selectedTool.name}</h2>
                        {selectedTool.manifest.usage_count >= 3 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Lazar Crystallized Skill
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{selectedTool.manifest.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRecordUsage(selectedTool.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Execute / Test Call
                      </button>
                      {!selectedTool.manifest.deprecated && (
                        <button
                          onClick={() => handleDeprecate(selectedTool.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Deprecate
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1">MCP Input Schema</span>
                      <pre className="text-[10px] text-amber-300 bg-slate-950/60 p-2.5 rounded overflow-x-auto border border-slate-800/80">
                        {JSON.stringify(selectedTool.manifest.input_schema, null, 2)}
                      </pre>
                    </div>

                    <div className="p-3 bg-[#181a22] border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1">Filesystem Lazar Layout</span>
                      <div className="text-[10px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 space-y-1">
                        <div className="text-amber-400">.oxide/forge/tools/{selectedTool.name}/</div>
                        <div className="pl-4 text-slate-400">├── Cargo.toml</div>
                        <div className="pl-4 text-slate-400">├── src/lib.rs</div>
                        <div className="pl-4 text-slate-400">├── tests/integration.rs</div>
                        <div className="pl-4 text-slate-400">├── schema.json</div>
                        <div className="pl-4 text-slate-400">├── {selectedTool.name}.wasm ({selectedTool.wasm_exists ? 'Ready' : 'Pending'})</div>
                        <div className="pl-4 text-slate-400">└── tool.md ({selectedTool.documentation_exists ? 'Present' : 'None'})</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  Select a tool from the sidebar to inspect its Lazar filesystem structure and MCP schema
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Forge Synthesizer Tab */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Inputs: Tool Name, Schema, Cargo.toml */}
            <div className="w-1/2 p-4 border-r border-slate-800 overflow-y-auto space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tool Name (Identifier)</label>
                <input
                  type="text"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="e.g. parse_intel_hex"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Description (MCP Tool Prompt)</label>
                <input
                  type="text"
                  value={toolDesc}
                  onChange={(e) => setToolDesc(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">MCP Input JSON Schema</label>
                <textarea
                  rows={5}
                  value={inputSchemaStr}
                  onChange={(e) => setInputSchemaStr(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-amber-300 text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cargo.toml Dependencies</label>
                <textarea
                  rows={6}
                  value={cargoToml}
                  onChange={(e) => setCargoToml(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Right Inputs: Rust Source, Tests & Synthesis Output */}
            <div className="w-1/2 p-4 overflow-y-auto flex flex-col space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">Rust Implementation (`src/lib.rs`)</label>
                  <span className="text-[10px] text-amber-400">Wasmtime/WASI Compatible</span>
                </div>
                <textarea
                  rows={8}
                  value={libRs}
                  onChange={(e) => setLibRs(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-emerald-300 text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">Test-Driven Suite (`tests/integration.rs`)</label>
                  <span className="text-[10px] text-blue-400">Mandatory Verification</span>
                </div>
                <textarea
                  rows={6}
                  value={testRs}
                  onChange={(e) => setTestRs(e.target.value)}
                  className="w-full bg-[#181a22] border border-slate-700 rounded p-2 text-blue-300 text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleSynthesize}
                  disabled={isSynthesizing}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  <Anvil className={`w-4 h-4 ${isSynthesizing ? 'animate-bounce' : ''}`} />
                  {isSynthesizing ? 'Synthesizing, Compiling & Testing...' : 'Forge & Crystallize Tool'}
                </button>
              </div>

              {/* Synthesis Results & Diagnostics */}
              {synthesisResult && (
                <div className={`p-3 rounded-lg border text-[11px] ${
                  synthesisResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {synthesisResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span>{synthesisResult.success ? 'Synthesis & Verification Succeeded' : 'Verification / Test Failed'}</span>
                    <span className="text-slate-400 font-normal ml-auto">(Attempts: {synthesisResult.attempts}/3)</span>
                  </div>

                  {synthesisResult.output_wasm_path && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Artifact: <span className="text-slate-200">{synthesisResult.output_wasm_path}</span>
                    </div>
                  )}

                  {synthesisResult.logs.length > 0 && (
                    <div className="mt-2 text-[10px] space-y-0.5 text-slate-400">
                      {synthesisResult.logs.map((log, i) => (
                        <div key={i}>• {log}</div>
                      ))}
                    </div>
                  )}

                  {synthesisResult.compiler_diagnostics.length > 0 && (
                    <pre className="mt-2 p-2 bg-slate-950/80 rounded text-[10px] text-red-400 overflow-x-auto border border-red-500/20">
                      {synthesisResult.compiler_diagnostics.join('\n')}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
