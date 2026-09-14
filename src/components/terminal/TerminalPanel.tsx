import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { listen } from '@tauri-apps/api/event';
import { Terminal as TerminalIcon, AlertCircle, ListTree, Plus, X } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { DiagnosticsPanel } from '../compilation/DiagnosticsPanel';
import { ASTViewer } from '../ast/ASTViewer';
import { cn } from '../../utils/theme';

interface TerminalTab {
  id: string;
  name: string;
  termInstance?: Terminal;
  fitAddon?: FitAddon;
}

export function TerminalPanel() {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'ast'>('terminal');
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    { id: `pty-1`, name: 'Terminal 1' },
  ]);
  const [activePtyId, setActivePtyId] = useState<string>('pty-1');

  const { diagnostics } = useCompilationStore();
  const { workspaceRoot } = useFileSystemStore();

  const activeTermRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(null);

  // Initialize PTY session for activePtyId
  useEffect(() => {
    if (!terminalContainerRef.current || activeTab !== 'terminal') return;

    let isDisposed = false;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    const term = new Terminal({
      theme: {
        background: '#1e1f22',
        foreground: '#bcbec4',
        cursor: '#cc7832',
        selectionBackground: 'rgba(46, 67, 110, 0.5)',
        black: '#1e1f22',
        red: '#f75464',
        green: '#6aab73',
        yellow: '#e0af68',
        blue: '#56a8f5',
        magenta: '#c77dbb',
        cyan: '#299999',
        white: '#bcbec4',
        brightBlack: '#5f6368',
        brightRed: '#ff6b68',
        brightGreen: '#73c991',
        brightYellow: '#ffc66d',
        brightBlue: '#70b0ff',
        brightMagenta: '#d58fff',
        brightCyan: '#4cdada',
        brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12,
      lineHeight: 1.3,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainerRef.current);
    fitAddon.fit();

    activeTermRef.current = { term, fitAddon };

    const initialCols = term.cols || 80;
    const initialRows = term.rows || 24;

    // 1. Spawn PTY in Rust backend
    tauriCommands
      .ptySpawn(activePtyId, undefined, workspaceRoot, initialCols, initialRows)
      .catch((e) => {
        if (!isDisposed) {
          term.writeln(`\x1b[31m[PTY Error] Failed to spawn shell: ${e}\x1b[0m`);
        }
      });

    // 2. Listen for output events
    listen<{ session_id: string; data: string }>('pty:output', (event) => {
      if (event.payload.session_id === activePtyId && !isDisposed) {
        term.write(event.payload.data);
      }
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    // 3. Listen for exit events
    listen<{ session_id: string }>('pty:exit', (event) => {
      if (event.payload.session_id === activePtyId && !isDisposed) {
        term.writeln('\r\n\x1b[90m[Process completed]\x1b[0m');
      }
    }).then((unlisten) => {
      unlistenExit = unlisten;
    });

    // 4. Forward keyboard inputs
    const onDataDisposable = term.onData((data) => {
      tauriCommands.ptyWrite(activePtyId, data).catch(() => {});
    });

    // 5. Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed) return;
      try {
        fitAddon.fit();
        if (term.cols > 0 && term.rows > 0) {
          tauriCommands.ptyResize(activePtyId, term.cols, term.rows).catch(() => {});
        }
      } catch {
        // ignore layout resize errors
      }
    });
    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      tauriCommands.ptyKill(activePtyId).catch(() => {});
      term.dispose();
    };
  }, [activePtyId, activeTab, workspaceRoot]);

  const handleCreateNewTab = () => {
    const newId = `pty-${Date.now()}`;
    const newName = `Terminal ${terminalTabs.length + 1}`;
    setTerminalTabs([...terminalTabs, { id: newId, name: newName }]);
    setActivePtyId(newId);
  };

  const handleCloseTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalTabs.length <= 1) return;

    const remaining = terminalTabs.filter((t) => t.id !== idToClose);
    setTerminalTabs(remaining);
    tauriCommands.ptyKill(idToClose).catch(() => {});

    if (activePtyId === idToClose) {
      setActivePtyId(remaining[remaining.length - 1].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg relative">
      {/* Top Tool Window Sub-bar */}
      <div className="h-8 border-b border-ide-border flex items-center justify-between px-3 bg-ide-panel shrink-0 select-none">
        <div className="flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest text-ide-text h-full">
          <button
            className={cn(
              'h-full flex items-center transition-colors cursor-pointer',
              activeTab === 'terminal'
                ? 'text-white border-b-2 border-ide-keyword'
                : 'hover:text-white'
            )}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon className="w-3.5 h-3.5 mr-1.5" />
            Terminal
          </button>
          <button
            className={cn(
              'h-full flex items-center transition-colors cursor-pointer',
              activeTab === 'problems'
                ? 'text-white border-b-2 border-ide-keyword'
                : 'hover:text-white'
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
              'h-full flex items-center transition-colors cursor-pointer',
              activeTab === 'ast'
                ? 'text-white border-b-2 border-ide-keyword'
                : 'hover:text-white'
            )}
            onClick={() => setActiveTab('ast')}
          >
            <ListTree className="w-3.5 h-3.5 mr-1.5" />
            AST Viewer
          </button>
        </div>

        {/* Terminal Sessions Tabs (When activeTab is terminal) */}
        {activeTab === 'terminal' && (
          <div className="flex items-center space-x-1">
            {terminalTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActivePtyId(tab.id)}
                className={cn(
                  'flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border',
                  activePtyId === tab.id
                    ? 'bg-[#2b2d30] text-white border-[#393b40]'
                    : 'bg-transparent text-ide-text/70 border-transparent hover:bg-[#2b2d30]/50'
                )}
              >
                <span>{tab.name}</span>
                {terminalTabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="hover:text-red-400 p-0.5 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleCreateNewTab}
              className="p-1 text-ide-text hover:text-white hover:bg-[#2b2d30] rounded cursor-pointer transition-colors"
              title="New Terminal Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative min-h-0">
        {activeTab === 'terminal' && (
          <div className="absolute inset-0 p-2 bg-[#1e1f22]" ref={terminalContainerRef} />
        )}
        {activeTab === 'problems' && <DiagnosticsPanel />}
        {activeTab === 'ast' && <ASTViewer />}
      </div>
    </div>
  );
}
