import React from 'react';
import { Box, Code2, Zap } from 'lucide-react';

export function ASTViewer() {
  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      <div className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        AST Visualization
      </div>
      <div className="flex-1 p-2 overflow-auto relative">
        {/* Task 2.1.2: Local AST UI Features from WebAssembly Tree-sitter */}
        <div className="space-y-1 font-mono text-[10px] absolute w-full pr-4 pb-4">
          <div className="flex items-center text-amber-500 font-bold mb-2">
            <Box className="w-3 h-3 mr-1.5" />
            <span>SourceFile</span>
          </div>
          
          <div className="pl-4 space-y-1 border-l border-zinc-900 ml-1.5 pb-2">
            <div className="flex items-center text-sky-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer transition-colors">
              <Code2 className="w-3 h-3 mr-1.5" />
              <span>UseDeclaration</span>
            </div>
            <div className="flex items-center text-sky-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer transition-colors mt-2">
              <Code2 className="w-3 h-3 mr-1.5" />
              <span>FunctionDefinition: <span className="text-amber-300">startServer</span></span>
            </div>
            
            <div className="pl-4 border-l border-zinc-800 ml-1.5 space-y-1 mt-1">
               <div className="text-zinc-500 hover:bg-zinc-900 p-0.5 rounded cursor-pointer">Attribute</div>
               <div className="text-lime-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer">BlockExpr</div>
               
               <div className="pl-4 border-l border-zinc-800 ml-1.5 space-y-1 mt-1 relative">
                 {/* Active selected Node */}
                 <div className="bg-orange-500/20 border border-orange-500/50 text-white px-1.5 py-0.5 rounded flex items-center w-full shadow-lg shadow-orange-500/10">
                    <Zap className="w-2.5 h-2.5 mr-1.5 text-orange-500" />
                    <span className="truncate">Call: attemptAutoHeal</span>
                 </div>
                 
                 <div className="text-pink-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer">MacroCall: expect!</div>
                 <div className="text-zinc-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer">ExpressionStatement</div>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions Phase 3.2 */}
      <div className="p-3 border-t border-zinc-800 space-y-2 bg-zinc-950 z-10">
        <div className="text-[10px] text-zinc-500 tracking-widest font-bold uppercase mb-3">Agent Inference</div>
        <button className="w-full bg-orange-500 text-black text-[11px] uppercase tracking-widest font-bold py-2 rounded transition-colors hover:bg-orange-400 shadow-lg">
          Refactor Node
        </button>
        <button className="w-full bg-zinc-900 text-zinc-300 text-[11px] uppercase tracking-widest font-bold py-2 rounded border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors">
          Generate JSDoc
        </button>
      </div>
    </div>
  );
}
