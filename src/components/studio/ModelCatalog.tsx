import React, { useState } from 'react';
import { Cpu, Zap, HardDrive, Play, CheckCircle2, Sliders } from 'lucide-react';

interface LocalModel {
  id: string;
  name: string;
  parameters: string;
  quantization: string;
  vramRequiredMb: number;
  gpuTarget: 'GPU 0 (RTX 3090)' | 'GPU 1 (RTX 3090)' | 'Dual GPU Split';
  status: 'ready' | 'loaded' | 'downloading';
  loraAdapters: string[];
}

export const ModelCatalog: React.FC = () => {
  const [gpu0VramUsedMb] = useState(14200);
  const [gpu1VramUsedMb] = useState(8400);
  const totalVramPerGpu = 24576; // 24GB RTX 3090

  const [models, setModels] = useState<LocalModel[]>([
    {
      id: 'qwen-2.5-coder-32b',
      name: 'Qwen 2.5 Coder 32B Instruct',
      parameters: '32.5B',
      quantization: 'Unsloth 4-bit GGUF / AWQ',
      vramRequiredMb: 19800,
      gpuTarget: 'GPU 0 (RTX 3090)',
      status: 'loaded',
      loraAdapters: ['rust-embedded-lora-v2', 'syntax-synth-lora'],
    },
    {
      id: 'deepseek-coder-v2-lite',
      name: 'DeepSeek Coder V2 Lite',
      parameters: '16B',
      quantization: 'Unsloth 4-bit (ExLlamaV2)',
      vramRequiredMb: 9400,
      gpuTarget: 'GPU 1 (RTX 3090)',
      status: 'ready',
      loraAdapters: ['cargo-diagnostics-lora'],
    },
    {
      id: 'llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      parameters: '70.6B',
      quantization: 'Unsloth 4-bit Dynamic Split',
      vramRequiredMb: 38400,
      gpuTarget: 'Dual GPU Split',
      status: 'ready',
      loraAdapters: ['ide-agent-swarm-lora'],
    },
  ]);

  const [activeModelId, setActiveModelId] = useState('qwen-2.5-coder-32b');

  const handleLoadModel = (id: string) => {
    setModels(prev =>
      prev.map(m => (m.id === id ? { ...m, status: 'loaded' } : m))
    );
    setActiveModelId(id);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] text-[#cdd6f4] p-4 overflow-y-auto select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#313244] pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-[#89b4fa]" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-white">
            Unsloth Model Studio & Dual RTX 3090 Profiler
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs text-[#a6adc8]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#a6e3a1]/10 text-[#a6e3a1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a6e3a1] animate-pulse"></span>
            CUDA 12.4 NVLink Active
          </span>
        </div>
      </div>

      {/* GPU VRAM Dual Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* GPU 0 */}
        <div className="bg-[#181825] border border-[#313244] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#89b4fa]" />
              <span className="text-xs font-semibold text-white">GPU 0: NVIDIA RTX 3090</span>
            </div>
            <span className="text-[10px] font-mono text-[#89b4fa]">
              {(gpu0VramUsedMb / 1024).toFixed(1)} / {(totalVramPerGpu / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="w-full bg-[#313244] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#89b4fa] h-full rounded-full transition-all duration-300"
              style={{ width: `${(gpu0VramUsedMb / totalVramPerGpu) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#6c7086] mt-1">
            <span>Primary Inference Engine</span>
            <span>{((gpu0VramUsedMb / totalVramPerGpu) * 100).toFixed(0)}% Allocated</span>
          </div>
        </div>

        {/* GPU 1 */}
        <div className="bg-[#181825] border border-[#313244] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#cba6f7]" />
              <span className="text-xs font-semibold text-white">GPU 1: NVIDIA RTX 3090</span>
            </div>
            <span className="text-[10px] font-mono text-[#cba6f7]">
              {(gpu1VramUsedMb / 1024).toFixed(1)} / {(totalVramPerGpu / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="w-full bg-[#313244] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#cba6f7] h-full rounded-full transition-all duration-300"
              style={{ width: `${(gpu1VramUsedMb / totalVramPerGpu) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#6c7086] mt-1">
            <span>LoRA Training & Swarm Critic</span>
            <span>{((gpu1VramUsedMb / totalVramPerGpu) * 100).toFixed(0)}% Allocated</span>
          </div>
        </div>
      </div>

      {/* Model Catalog Table */}
      <div className="flex-1 bg-[#181825] border border-[#313244] rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Available Unsloth Local Models
          </span>
          <button className="flex items-center space-x-1 text-[11px] bg-[#313244] hover:bg-[#45475a] text-white px-2 py-1 rounded transition">
            <Sliders className="w-3 h-3" />
            <span>Quantization Config</span>
          </button>
        </div>

        <div className="space-y-2">
          {models.map(m => {
            const isSelected = m.id === activeModelId;
            return (
              <div
                key={m.id}
                onClick={() => setActiveModelId(m.id)}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#313244]/60 border-[#89b4fa]'
                    : 'bg-[#1e1e2e]/60 border-[#313244] hover:border-[#45475a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-[#fab387]" />
                    <span className="text-xs font-semibold text-white">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#45475a] text-[#cdd6f4]">
                      {m.parameters}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#313244] text-[#89b4fa]">
                      {m.quantization}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[#a6adc8]">
                      {(m.vramRequiredMb / 1024).toFixed(1)} GB VRAM
                    </span>
                    {m.status === 'loaded' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#a6e3a1]/20 text-[#a6e3a1] px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Loaded
                      </span>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleLoadModel(m.id);
                        }}
                        className="flex items-center space-x-1 text-[10px] bg-[#89b4fa] hover:bg-[#b4befe] text-[#11111b] font-medium px-2 py-0.5 rounded transition"
                      >
                        <Play className="w-3 h-3 fill-current" /> Load
                      </button>
                    )}
                  </div>
                </div>

                {/* LoRA Adapters */}
                {m.loraAdapters.length > 0 && (
                  <div className="flex items-center space-x-1.5 mt-2 pt-2 border-t border-[#313244]/50">
                    <span className="text-[9px] text-[#6c7086]">Active LoRAs:</span>
                    {m.loraAdapters.map(lora => (
                      <span
                        key={lora}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-[#cba6f7]/10 text-[#cba6f7] border border-[#cba6f7]/20 font-mono"
                      >
                        {lora}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
