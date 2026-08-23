import React from 'react';
import { Cpu } from 'lucide-react';

export function MCPExplorer() {
  return (
    <div className="fixed top-20 right-4 w-96 h-[60vh] bg-darcula-toolwindow border border-darcula-border rounded-lg shadow-2xl flex flex-col z-[101] overflow-hidden">
      <div className="p-3 border-b border-darcula-border font-bold text-xs uppercase tracking-widest text-darcula-text">
        <Cpu className="w-4 h-4 inline mr-2 text-darcula-accent" /> MCP Explorer
      </div>
      <div className="flex-1 overflow-y-auto p-2">
         <div className="text-xs text-darcula-text/50">No MCP servers connected.</div>
      </div>
    </div>
  );
}
