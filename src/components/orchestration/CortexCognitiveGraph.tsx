import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Cpu, Search, Database, Layers, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { DeviceCapabilities, CortexQueryResult } from '../../types/ast';

interface CortexCognitiveGraphProps {
  workspacePath?: string;
}

export const CortexCognitiveGraph: React.FC<CortexCognitiveGraphProps> = () => {
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [searchQuery, setSearchQuery] = useState('database connection pool max connections');
  const [queryResults, setQueryResults] = useState<CortexQueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'hal' | 'search' | 'schema'>('hal');

  const [sampleChunks] = useState<[string, string | null, string][]>([
    [
      'src-tauri/crates/core/src/cortex_engine.rs',
      'Qwen3EmbeddingEngine',
      'Qwen3-Embedding-0.6B local tensor inference engine using Candle with dynamic CUDA/Metal/ROCm/CPU HAL and 1024-dim L2 normalization.'
    ],
    [
      'src-tauri/crates/core/src/forge_engine.rs',
      'ForgeEngine',
      'Lazar Protocol JIT Rust tool synthesis engine compiling wasm32-wasi modules with test-driven verification and oscillation guards.'
    ],
    [
      'src-tauri/crates/core/src/claude_bridge.rs',
      'ClaudeBridge',
      'Structured CLAUDE.md directive parser and semantic memory builder providing drop-in Claude Code parity with 90% token compression.'
    ],
    [
      'src-tauri/crates/core/src/privacy_guard.rs',
      'PrivacyGuard',
      'Stateless inference privacy firewall stripping sensitive API tokens and enforcing no_train and no_global_memory headers.'
    ]
  ]);

  const fetchDeviceCapabilities = async () => {
    try {
      const caps = await invoke<DeviceCapabilities>('get_cortex_device_capabilities');
      setDeviceCaps(caps);
    } catch (e) {
      console.error('Failed to resolve Cortex HAL device:', e);
    }
  };

  useEffect(() => {
    fetchDeviceCapabilities();
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await invoke<CortexQueryResult[]>('search_cortex_knowledge_graph', {
        chunks: sampleChunks,
        query: searchQuery,
        topK: 3,
      });
      setQueryResults(results);
    } catch (e) {
      console.error('Cortex MTree search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'search') {
      handleSearch();
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-[#12141a] text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#181a20] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-100 tracking-wide">Oxide Cortex</span>
            <span className="text-slate-500 ml-2">Qwen3-Embedding-0.6B Candle HAL & SurrealDB 1024-dim MTREE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('hal')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'hal'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Hardware HAL ({deviceCaps?.backend || 'Resolving...'})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            1024-dim MTREE Search
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'schema'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            SurrealQL Schema
          </button>
          <button
            onClick={fetchDeviceCapabilities}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh Device Stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'hal' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Hardware Abstraction Layer (HAL) Resolution
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Candle dynamic backend selection targeting NVIDIA CUDA, Apple Metal, AMD ROCm, or AVX2 CPU SIMD.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                {deviceCaps?.backend} Active
              </span>
            </div>

            {deviceCaps && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Compute Device Info</span>
                  <div className="text-xs text-slate-100 font-semibold">{deviceCaps.device_name}</div>
                  <div className="text-[11px] text-slate-400">
                    Total Dedicated VRAM: <span className="text-cyan-300 font-mono">{deviceCaps.total_vram_mb} MB</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Vector Dimension: <span className="text-amber-300 font-mono">{deviceCaps.vector_dimension}-dim</span>
                  </div>
                </div>

                <div className="p-4 bg-[#181a22] border border-slate-800 rounded-lg space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Precision & Batching Limits</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${deviceCaps.supports_fp16 ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>FP16 Tensor Cores Acceleration: {deviceCaps.supports_fp16 ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${deviceCaps.supports_bf16 ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>BF16 Support: {deviceCaps.supports_bf16 ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Max Batch Size: <span className="text-emerald-300 font-mono">{deviceCaps.max_batch_size} chunks/step</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Query Qwen3-0.6B MTREE vector index (e.g. 'Lazar protocol Wasm synthesis')..."
                className="flex-1 bg-[#181a22] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 hover:opacity-95"
              >
                <Search className="w-3.5 h-3.5" />
                {isSearching ? 'Vectorizing...' : 'KNN Search'}
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Top Approximate Nearest Neighbors (Cosine Similarity)</span>
                <span className="text-cyan-400">{queryResults.length} Matched Chunks</span>
              </div>

              {queryResults.map((res, i) => (
                <div key={i} className="p-3 bg-[#181a22] border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      {res.file_path} {res.symbol_name ? `:: ${res.symbol_name}` : ''}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      {(res.similarity_score * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    {res.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                SurrealDB 1024-Dimensional MTREE Index Schema
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Zero-copy high-dimensional ANN indexing using M-Tree leaf margins and Cosine metric.
              </p>
            </div>

            <pre className="p-4 bg-slate-950 rounded-lg text-amber-300 text-xs font-mono border border-slate-800 overflow-x-auto">
{`-- Define 1024-dim vector field for Qwen3-Embedding-0.6B
DEFINE FIELD embedding ON chunk TYPE vector<1024, f32>;

-- Define MTREE Index for Cosine Similarity
DEFINE INDEX chunk_qwen_mtree ON chunk 
FIELDS embedding 
MTREE DIMENSION 1024 
DIST COSINE 
TYPE F32 
LM 0.2; -- Leaf margin tuning memory vs speed (sub-8ms retrieval)`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
