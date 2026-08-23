import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Terminal as TerminalIcon, AlertCircle, CheckCircle2, Bug, Play, StepForward, ListTree } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { cn } from '../../utils/theme';

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  const [activeTab, setActiveTab] = useState<'terminal' | 'diagnostics' | 'debugger'>('terminal');
  const diagnostics = useCompilationStore(state => state.diagnostics);

  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Initialize standard terminal
    const term = new Terminal({
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#f97316', // orange-500
        selectionBackground: 'rgba(249, 115, 22, 0.3)',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      cursorBlink: true,
      convertEol: true
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Safely fit inside a small timeout to ensure the terminal is fully mounted
    setTimeout(() => {
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0) {
          const rs = (term as any)._core?._renderService;
          if (rs && rs.dimensions) {
            fitAddon.fit();
          }
        }
      } catch (err) {
        console.warn("Failed to fit terminal on init", err);
      }
    }, 150);
    
    term.writeln('\x1b[1;34m[Tauri IDE]\x1b[0m Terminal ready.');
    term.writeln('\x1b[90m$ Local Actix backend connection established.\x1b[0m');
    term.write('\r\n$ ');
    
    term.onData(e => {
      // Very basic echo for the terminal mock
      if (e === '\r') {
        term.write('\r\n$ ');
      } else if (e === '\u007F') { // Backspace
         term.write('\b \b');
      } else {
        term.write(e);
      }
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      try {
        if (!terminalRef.current || terminalRef.current.clientWidth === 0) return;
        const rs = (xtermRef.current as any)?._core?._renderService;
        if (!rs || !rs.dimensions) return;
        fitAddon.fit();
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      <div className="h-8 border-b border-zinc-800 flex items-center px-4 space-x-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-950">
        <button
          className={cn(
            "h-full flex items-center transition-colors",
            activeTab === 'terminal' 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "hover:text-zinc-300"
          )}
          onClick={() => setActiveTab('terminal')}
        >
          <TerminalIcon className="w-3.5 h-3.5 mr-1.5" />
          Terminal
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors",
            activeTab === 'diagnostics' 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "hover:text-zinc-300"
          )}
          onClick={() => setActiveTab('diagnostics')}
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
          Problems
          {diagnostics.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500/20 text-red-500 px-1 py-0.5 text-[9px] leading-none">
              {diagnostics.length}
            </span>
          )}
        </button>
        {/* Task 4.1.1: DAP UI Component */}
        <button
          className={cn(
            "h-full flex items-center transition-colors px-4 border-b-2",
            activeTab === 'debugger' 
              ? "text-orange-500 border-orange-500 bg-zinc-900/50" 
              : "border-transparent hover:text-zinc-300"
          )}
          onClick={() => setActiveTab('debugger')}
        >
          <Bug className="w-3.5 h-3.5 mr-1.5" />
          Debugger (DAP)
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <div 
          className={cn("absolute inset-0 p-3", activeTab !== 'terminal' && "opacity-0 pointer-events-none")} 
          ref={terminalRef} 
        />
        
        <div className={cn(
          "absolute inset-0 overflow-y-auto p-4 bg-zinc-950", 
          activeTab !== 'diagnostics' && "hidden"
        )}>
           {diagnostics.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <CheckCircle2 className="w-8 h-8 mb-2 text-zinc-800" />
                <p className="text-[11px] uppercase tracking-wider font-bold">No issues found in workspace.</p>
             </div>
           ) : (
             <div className="space-y-2">
               {diagnostics.map((d, i) => (
                 <div key={i} className={cn(
                   "p-2 rounded border text-xs font-mono",
                   d.level === 'error' ? "bg-red-950/20 border-red-900/50 text-red-400" :
                   d.level === 'warning' ? "bg-amber-950/20 border-amber-900/50 text-amber-400" :
                   "bg-sky-950/20 border-sky-900/50 text-sky-400"
                 )}>
                   <div className="flex items-center space-x-2 text-[10px] mb-1 opacity-70">
                     <span className="uppercase">{d.level}</span>
                     <span>|</span>
                     <span>{d.filePath}:{d.line}:{d.column}</span>
                   </div>
                   <div className="leading-relaxed">{d.message}</div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Task 4.1.1: Unified Visual Debugger (WebStorm/CLion Style) */}
        <div className={cn(
          "absolute inset-0 overflow-hidden flex bg-zinc-950", 
          activeTab !== 'debugger' && "hidden"
        )}>
           <div className="w-48 border-r border-zinc-800 p-3 h-full overflow-y-auto">
             <div className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Call Stack</div>
             <div className="text-xs font-mono text-zinc-300 bg-zinc-900 p-1.5 rounded mb-1 border border-zinc-800 cursor-pointer">main <span className="text-zinc-500">server.ts:42</span></div>
             <div className="text-xs font-mono text-zinc-500 p-1.5">initTask <span className="opacity-50">worker.ts:11</span></div>
           </div>
           
           <div className="flex-1 p-3 flex flex-col">
              <div className="flex space-x-2 mb-3 border-b border-zinc-800 pb-2">
                 <button className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"><Play className="w-4 h-4" /></button>
                 <button className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"><StepForward className="w-4 h-4" /></button>
                 <button className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"><ListTree className="w-4 h-4" /></button>
              </div>
              <div className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Local Scopes</div>
              <div className="text-xs font-mono p-2 bg-zinc-900/50 rounded border border-zinc-800/50">
                <div><span className="text-sky-400">taskId</span>: <span className="text-orange-300">"task_161A42"</span></div>
                <div><span className="text-sky-400">req.body</span>: {"{"} <span className="text-pink-400">type</span>: <span className="text-orange-300">"REFACTOR"</span> {"}"}</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
