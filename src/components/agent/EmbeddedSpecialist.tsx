import React, { useState } from 'react';
import { HardFaultDiagnosis, GeneratedHalDriver, AppliedFix } from '../../types/agent';
import { tauriCommands } from '../../services/tauri';
import {
  Cpu,
  Wrench,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Copy,
  RotateCw,
  Terminal,
} from 'lucide-react';

interface EmbeddedSpecialistProps {
  workspacePath: string;
}

export const EmbeddedSpecialist: React.FC<EmbeddedSpecialistProps> = ({ workspacePath }) => {
  const [activeTab, setActiveTab] = useState<'hardfault' | 'hal_gen' | 'healing'>('hardfault');
  const [loading, setLoading] = useState(false);

  // HardFault state
  const [hfsr, setHfsr] = useState('0x40000000');
  const [cfsr, setCfsr] = useState('0x00010000');
  const [pc, setPc] = useState('0x08001234');
  const [lr, setLr] = useState('0x08000FAD');
  const [diagnosis, setDiagnosis] = useState<HardFaultDiagnosis | null>(null);

  // HAL Gen state
  const [chip, setChip] = useState('STM32F401RE');
  const [peripheral, setPeripheral] = useState('SPI1');
  const [dmaEnabled, setDmaEnabled] = useState(true);
  const [asyncEmbassy, setAsyncEmbassy] = useState(true);
  const [generatedDriver, setGeneratedDriver] = useState<GeneratedHalDriver | null>(null);

  // Healing state
  const [healingFixes, setHealingFixes] = useState<AppliedFix[] | null>(null);

  const handleDiagnoseHardFault = async () => {
    setLoading(true);
    try {
      const diag = await tauriCommands.agentEmbeddedDiagnoseFault(hfsr, {
        CFSR: cfsr,
        PC: pc,
        LR: lr,
      });
      setDiagnosis(diag);
    } catch (e) {
      console.error('Failed to diagnose fault:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHal = async () => {
    setLoading(true);
    try {
      const features: string[] = [];
      if (dmaEnabled) features.push('DMA');
      if (asyncEmbassy) features.push('EmbassyAsync');
      features.push('MasterMode');

      const driver = await tauriCommands.agentGenerateHalDriver(chip, peripheral, features);
      setGeneratedDriver(driver);
    } catch (e) {
      console.error('Failed to generate driver:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleHealErrors = async () => {
    setLoading(true);
    try {
      const fixes = await tauriCommands.agentHealCompileErrors(workspacePath, 5);
      setHealingFixes(fixes);
    } catch (e) {
      console.error('Failed to heal compiler errors:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] text-zinc-200 text-xs font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">Embedded & Healing Agent</span>
        </div>
        <div className="flex items-center bg-[#141414] rounded border border-zinc-800 p-0.5">
          <button
            onClick={() => setActiveTab('hardfault')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'hardfault' ? 'bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            HardFault Decoder
          </button>
          <button
            onClick={() => setActiveTab('hal_gen')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'hal_gen' ? 'bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Forge HAL Synthesizer
          </button>
          <button
            onClick={() => setActiveTab('healing')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'healing' ? 'bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Compiler Guard
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'hardfault' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-3 bg-[#202020] border border-zinc-800 rounded-lg space-y-3">
              <div className="font-semibold text-zinc-200 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" /> Cortex-M HardFault Diagnostic
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">HFSR (HardFault Status)</label>
                  <input
                    type="text"
                    value={hfsr}
                    onChange={(e) => setHfsr(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">CFSR (Configurable Fault)</label>
                  <input
                    type="text"
                    value={cfsr}
                    onChange={(e) => setCfsr(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">PC (Program Counter)</label>
                  <input
                    type="text"
                    value={pc}
                    onChange={(e) => setPc(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">LR (Link Register)</label>
                  <input
                    type="text"
                    value={lr}
                    onChange={(e) => setLr(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleDiagnoseHardFault}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  Decode & Synthesize Fix
                </button>
              </div>
            </div>

            {diagnosis && (
              <div className="p-3 bg-[#1e1e1e] border border-emerald-900/60 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Root Cause Identified
                </div>
                <div className="p-2.5 bg-[#141414] border border-zinc-800 rounded text-zinc-200 font-mono text-[11px]">
                  {diagnosis.cause}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Recommended Fix</div>
                  <div className="text-zinc-300">{diagnosis.recommended_fix}</div>
                </div>
                {diagnosis.mitigation_patch && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Mitigation Code</div>
                    <pre className="p-2 bg-[#121212] border border-zinc-800 rounded text-emerald-300 font-mono text-[10px] overflow-x-auto">
                      {diagnosis.mitigation_patch}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hal_gen' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="p-3 bg-[#202020] border border-zinc-800 rounded-lg space-y-3">
              <div className="font-semibold text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Forge JIT Hardware Driver Synthesizer
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Target MCU / Chip</label>
                  <input
                    type="text"
                    value={chip}
                    onChange={(e) => setChip(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Peripheral</label>
                  <input
                    type="text"
                    value={peripheral}
                    onChange={(e) => setPeripheral(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dmaEnabled}
                    onChange={(e) => setDmaEnabled(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-600"
                  />
                  <span>DMA Buffers</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asyncEmbassy}
                    onChange={(e) => setAsyncEmbassy(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-600"
                  />
                  <span>Embassy Async HAL</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateHal}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Synthesize HAL Driver
                </button>
              </div>
            </div>

            {generatedDriver && (
              <div className="p-3 bg-[#1e1e1e] border border-zinc-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">
                    Generated Driver for {generatedDriver.peripheral} ({generatedDriver.chip})
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedDriver.driver_source)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </button>
                </div>
                <pre className="p-3 bg-[#121212] border border-zinc-800 rounded text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-96">
                  {generatedDriver.driver_source}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'healing' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-4 bg-[#202020] border border-zinc-800 rounded-lg space-y-3 text-center">
              <Terminal className="w-8 h-8 mx-auto text-emerald-400 opacity-80" />
              <div className="font-semibold text-zinc-200 text-sm">
                Compiler Guard Autonomous Healing Loop
              </div>
              <div className="text-zinc-400 text-[11px] max-w-md mx-auto">
                Spawns <code>cargo check</code>, captures rustc JSON diagnostic spans, reasons on AST borrow/type errors, and applies surgical diffs until compilation is green.
              </div>
              <button
                onClick={handleHealErrors}
                disabled={loading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium inline-flex items-center gap-2 transition-colors"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Run Autonomous Healing
              </button>
            </div>

            {healingFixes && (
              <div className="p-3 bg-[#1e1e1e] border border-zinc-800 rounded-lg space-y-2">
                <div className="font-semibold text-zinc-200">
                  Healing Results ({healingFixes.length} fix{healingFixes.length > 1 ? 'es' : ''})
                </div>
                {healingFixes.length === 0 ? (
                  <div className="text-emerald-400 text-[11px]">
                    Workspace is already clean. Zero compiler errors detected.
                  </div>
                ) : (
                  healingFixes.map((f, i) => (
                    <div key={i} className="p-2 bg-[#141414] border border-zinc-800 rounded flex items-center justify-between">
                      <span className="font-mono text-zinc-300">{f.file_path}</span>
                      <span className="text-emerald-400 font-medium">{f.description}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
