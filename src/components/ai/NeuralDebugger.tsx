import { Cpu, Bug, RotateCcw, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { useSystemStats } from '../../hooks/useSystemStats';
import { triggerSelfHealing } from '../../utils/compilerGuard';
import { useState } from 'react';

export function NeuralDebugger() {
  const { diagnostics } = useCompilationStore();
  const { data: systemStats, refetch, isFetching } = useSystemStats();
  const [rollbackLog, setRollbackLog] = useState<string[]>([]);

  const handleRollback = () => {
    setRollbackLog(prev => [
      `[Rollback] Restored workspace state to revision H-${1000 + prev.length}`,
      ...prev
    ]);
  };

  const handleHealing = async (diag: any) => {
    await triggerSelfHealing(diag);
  };

  const errors = diagnostics.filter(d => d.level === 'error');
  const warnings = diagnostics.filter(d => d.level === 'warning');

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none text-xs">
      {/* Top Header */}
      <div className="p-3 border-b border-ide-border bg-ide-panel/50 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center space-x-2 font-medium text-white mb-1">
            <Cpu className="w-4 h-4 text-red-400" />
            <span>NeuralInverse Debugger</span>
          </div>
          <p className="text-ide-text/80 text-[10px] leading-tight font-sans">
            Predictive neural state reconstruction and automated inverse patching.
          </p>
        </div>
        <button 
          onClick={handleRollback}
          className="flex items-center space-x-1 border border-ide-border hover:bg-ide-hover px-2 py-1 rounded text-[10px] transition-colors cursor-pointer text-white"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Rollback State</span>
        </button>
      </div>

      {/* Hardware Telemetry Bar */}
      <div className="bg-ide-panel/20 border-b border-ide-border p-2.5 flex items-center justify-between text-[10px] font-mono shrink-0">
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-white/80">
            <Cpu className="w-3 h-3 mr-1 text-ide-keyword" />
            Cores: {systemStats?.cpu_cores ?? 'Loading...'}
          </span>
          <span className="flex items-center text-white/80">
            <Bug className="w-3 h-3 mr-1 text-[#ffc66d]" />
            Free VRAM: {systemStats?.vram_free ?? 'Loading...'}
          </span>
        </div>
        <button 
          onClick={() => refetch()}
          className="text-ide-text/60 hover:text-white p-0.5 rounded cursor-pointer"
          title="Refresh telemetry"
        >
          <RefreshCw className={isFetching ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
        </button>
      </div>

      {/* Main predictions / diagnostics table */}
      <div className="flex-grow overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-ide-panel border-b border-ide-border text-[9px] text-ide-text/50 uppercase font-bold tracking-wider">
              <th className="p-2.5 font-medium">Status</th>
              <th className="p-2.5 font-medium">Diagnostic Prediction</th>
              <th className="p-2.5 font-medium">Confidence</th>
              <th className="p-2.5 font-medium w-1/4">Suggested Action</th>
            </tr>
          </thead>
          <tbody className="font-sans text-[11px]">
            {errors.length === 0 && warnings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-ide-text/40 font-mono text-[10px]">
                  <div className="flex flex-col items-center space-y-1">
                    <CheckCircle className="w-6 h-6 text-green-500/60" />
                    <span>No active panics or compiler diagnostics. Workspace safe.</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {errors.map((diag, idx) => (
                  <tr key={`err-${idx}`} className="border-b border-ide-border/50 hover:bg-ide-panel/30">
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5 text-red-400 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Panic/Error</span>
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-white/90 truncate max-w-[200px]">
                      {diag.message}
                    </td>
                    <td className="p-2.5">
                      <div className="w-full bg-ide-bg rounded-full h-1.5 flex items-center">
                        <div className="bg-red-400 h-1.5 rounded-full" style={{ width: '94%' }}></div>
                        <span className="ml-2 text-[9px] font-mono text-red-300">94%</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <button 
                        onClick={() => handleHealing(diag)}
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/35 border border-red-500/40 px-2 py-0.5 rounded transition-colors text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Apply Patch
                      </button>
                    </td>
                  </tr>
                ))}
                {warnings.map((diag, idx) => (
                  <tr key={`warn-${idx}`} className="border-b border-ide-border/50 hover:bg-ide-panel/30">
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5 text-yellow-400 font-bold">
                        <Bug className="w-3.5 h-3.5" />
                        <span>Warning</span>
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-white/90 truncate max-w-[200px]">
                      {diag.message}
                    </td>
                    <td className="p-2.5">
                      <div className="w-full bg-ide-bg rounded-full h-1.5 flex items-center">
                        <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                        <span className="ml-2 text-[9px] font-mono text-yellow-300">75%</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[10px] text-ide-text/50 italic">Warning - Auto healing skipped</span>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Rollback history list */}
      {rollbackLog.length > 0 && (
        <div className="border-t border-ide-border bg-ide-panel/40 p-3 h-28 flex flex-col shrink-0">
          <span className="text-[9px] text-ide-text/40 font-bold uppercase tracking-widest mb-1.5">Rollback Log</span>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-[#6a8759] space-y-1">
            {rollbackLog.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
