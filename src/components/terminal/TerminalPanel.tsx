import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { Terminal as TerminalIcon, AlertCircle, ListTree } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { DiagnosticsPanel } from '../compilation/DiagnosticsPanel';
import { ASTViewer } from '../ast/ASTViewer';
import { cn } from '../../utils/theme';

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'ast'>('terminal');
  const { diagnostics } = useCompilationStore();
  const { workspaceRoot } = useFileSystemStore();

  useEffect(() => {
    if (!terminalRef.current || activeTab !== 'terminal') return;
    
    const term = new Terminal({
      theme: {
        background: '#1e1f22',
        foreground: '#a9b7c6',
        cursor: '#cc7832',
        selectionBackground: 'rgba(46, 67, 110, 0.5)',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      cursorBlink: true,
      convertEol: true
    });
    
    term.open(terminalRef.current);
    term.writeln('\x1b[1;34m[Oxide Tech IDE]\x1b[0m Terminal ready.');
    term.writeln('\x1b[90m$ Local backend shell execution active.\x1b[0m');
    term.write('\r\n$ ');
    
    let commandBuffer = '';
    
    term.onData(async (e) => {
      if (e === '\r') {
        const cmd = commandBuffer.trim();
        term.write('\r\n');
        
        if (cmd) {
          if (cmd === 'clear') {
            term.clear();
            commandBuffer = '';
            term.write('$ ');
            return;
          }
          
          try {
            const output = await tauriCommands.executeTerminalCommand(cmd, workspaceRoot);
            term.writeln(output);
          } catch (err) {
            term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
          }
        }
        commandBuffer = '';
        term.write('$ ');
      } else if (e === '\u007F') { // Backspace
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (e.charCodeAt(0) < 32 && e !== '\r' && e !== '\n') {
        // Ignore control keys
      } else {
        commandBuffer += e;
        term.write(e);
      }
    });

    xtermRef.current = term;

    const handleResize = () => {
      if (terminalRef.current) {
        const cols = Math.floor(terminalRef.current.clientWidth / 7.2);
        const rows = Math.floor(terminalRef.current.clientHeight / 16);
        if (cols > 0 && rows > 0) {
          term.resize(cols, rows);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [activeTab, workspaceRoot]);

  return (
    <div className="flex flex-col h-full bg-ide-bg relative">
      <div className="h-8 border-b border-ide-border flex items-center px-4 space-x-6 text-[10px] font-bold uppercase tracking-widest text-ide-text bg-ide-panel shrink-0 select-none">
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activeTab === 'terminal' 
              ? "text-white border-b-2 border-ide-keyword" 
              : "hover:text-white"
          )}
          onClick={() => setActiveTab('terminal')}
        >
          <TerminalIcon className="w-3.5 h-3.5 mr-1.5" />
          Terminal
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activeTab === 'problems' 
              ? "text-white border-b-2 border-ide-keyword" 
              : "hover:text-white"
          )}
          onClick={() => setActiveTab('problems')}
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
          Problems
          {diagnostics.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500/20 text-red-400 px-1 py-0.5 text-[9px] leading-none">
              {diagnostics.length}
            </span>
          )}
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activeTab === 'ast' 
              ? "text-white border-b-2 border-ide-keyword" 
              : "hover:text-white"
          )}
          onClick={() => setActiveTab('ast')}
        >
          <ListTree className="w-3.5 h-3.5 mr-1.5" />
          AST Viewer
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden relative min-h-0">
        {activeTab === 'terminal' && (
          <div className="absolute inset-0 p-3 bg-[#1e1f22]" ref={terminalRef} />
        )}
        {activeTab === 'problems' && (
          <DiagnosticsPanel />
        )}
        {activeTab === 'ast' && (
          <ASTViewer />
        )}
      </div>
    </div>
  );
}
