import { Cpu, Bug, RotateCcw, ShieldAlert } from 'lucide-react';

export function NeuralDebugger() {
  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none text-xs">
      <div className="p-3 border-b border-ide-border bg-ide-panel/50 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 font-medium text-white mb-1">
            <Cpu className="w-4 h-4 text-red-400" />
            <span>NeuralInverse Debugger</span>
          </div>
          <p className="text-ide-text/80 text-[10px] leading-tight">
            Predictive neural state reconstruction and automated inverse patching.
          </p>
        </div>
        <button className="flex items-center space-x-1 border border-ide-border hover:bg-ide-panel px-2 py-1 rounded text-[10px] transition-colors">
          <RotateCcw className="w-3 h-3" />
          <span>Rollback State</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-ide-panel border-b border-ide-border text-[10px] text-ide-text/70 uppercase">
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Prediction</th>
              <th className="p-2 font-medium">Confidence</th>
              <th className="p-2 font-medium w-1/3">Suggested Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ide-border/50 hover:bg-ide-panel/30">
              <td className="p-2">
                <div className="flex items-center space-x-1 text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Panic Detected</span>
                </div>
              </td>
              <td className="p-2 font-mono text-[10px]">Null Reference in MainLayout</td>
              <td className="p-2">
                <div className="w-full bg-ide-bg rounded-full h-1.5 flex items-center">
                  <div className="bg-red-400 h-1.5 rounded-full" style={{ width: '92%' }}></div>
                  <span className="ml-2 text-[10px]">92%</span>
                </div>
              </td>
              <td className="p-2">
                <button className="bg-ide-keyword/20 text-ide-keyword hover:bg-ide-keyword/30 px-2 py-0.5 rounded transition-colors text-[10px]">
                  Apply Inverse Patch
                </button>
              </td>
            </tr>
            <tr className="border-b border-ide-border/50 hover:bg-ide-panel/30">
              <td className="p-2">
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Bug className="w-3.5 h-3.5" />
                  <span>Warning</span>
                </div>
              </td>
              <td className="p-2 font-mono text-[10px]">Memory Leak: SplitPane instances</td>
              <td className="p-2">
                <div className="w-full bg-ide-bg rounded-full h-1.5 flex items-center">
                  <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: '68%' }}></div>
                  <span className="ml-2 text-[10px]">68%</span>
                </div>
              </td>
              <td className="p-2">
                <button className="border border-ide-border hover:bg-ide-panel px-2 py-0.5 rounded transition-colors text-[10px]">
                  Analyze Heap
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
