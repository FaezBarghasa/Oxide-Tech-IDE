import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

/**
 * Terminal component wrapping xterm.js for the bottom panel
 * @returns React Component handling an interactive terminal session
 */
export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#1e1f22',
        foreground: '#a9b7c6',
        cursor: '#a9b7c6',
        selectionBackground: '#2e436e'
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    termRef.current = term;

    term.writeln('\x1b[1;32m$\x1b[0m Welcome to Tauri Coder Terminal (Mock)');
    term.writeln('Type your cargo commands here...');
    term.write('\r\n\x1b[1;32m$\x1b[0m ');

    term.onData((e) => {
       if (e === '\r') {
         term.write('\r\n\x1b[1;32m$\x1b[0m ');
       } else if (e === '\x7F') {
         term.write('\b \b');
       } else {
         term.write(e);
       }
    });

    const observer = new ResizeObserver(() => fitAddon.fit());
    observer.observe(terminalRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#1e1f22] p-2" ref={terminalRef} />
  );
}
