import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, AlertOctagon, TerminalIcon, Activity } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { Terminal } from '../terminal/Terminal';

/**
 * Bottom Panels grouping terminal, diagnostics, and logic analyzer
 * @returns React Component handling bottom split views
 */
export function BottomPanels() {
  const [activeTab, setActiveTab] = useState<'problems' | 'terminal'>('problems');
  const diagnostics = useCompilationStore(state => state.diagnostics);

  return (
    <div className="h-56 border-t border-[#393b40] bg-[#2b2d30] flex flex-col font-sans shrink-0 overflow-hidden relative">
      <div className="flex items-center px-2 bg-[#2b2d30] border-b border-[#393b40] shrink-0 text-xs">
        <button 
          onClick={() => setActiveTab('problems')}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${activeTab === 'problems' ? 'text-white border-b-2 border-blue-500 font-medium' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Problems
          {diagnostics.length > 0 && <span className="bg-rose-500/20 text-rose-400 rounded-full px-1.5 ml-1 text-[10px]">{diagnostics.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${activeTab === 'terminal' ? 'text-white border-b-2 border-blue-500 font-medium' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          Terminal
        </button>
      </div>
      
      <div className="flex-1 min-h-0 bg-[#1e1f22] overflow-hidden">
        {activeTab === 'problems' && (
          <div className="h-full overflow-y-auto p-2">
            {diagnostics.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500 text-xs italic">
                <span className="text-emerald-500 font-bold mr-1.5">✓</span> No issues found. Workspace is clean.
              </div>
            ) : (
              diagnostics.map((diag, index) => (
                <div key={index} className="flex gap-2 items-start text-[11px] p-1.5 hover:bg-[#35373c] rounded mb-1 cursor-pointer">
                  {diag.level === 'error' ? <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" /> :
                   diag.level === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                   <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                  <div className="flex flex-col">
                     <span className="text-[#a9b7c6]">{diag.message}</span>
                     {diag.filePath && (
                       <span className="text-gray-500 mt-1 font-mono text-[10px]">
                         {diag.filePath}{diag.line ? `:${diag.line}` : ''}
                       </span>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'terminal' && (
          <Terminal />
        )}
      </div>
    </div>
  );
}
