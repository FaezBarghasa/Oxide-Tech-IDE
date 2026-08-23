import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { CodeEditor } from '../editor/CodeEditor';
import { EditorToolbar } from '../editor/EditorToolbar';
import { BottomPanels } from './BottomPanels';
import { ASTViewer } from '../ast/ASTViewer';

/**
 * Main Layout framing the entire application
 * @returns React Component for the top layout wrap
 */
export function MainLayout() {
  const [editorHeight, setEditorHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setEditorHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1f22] overflow-hidden selection:bg-[#2e436e]">
      {/* MacOS / IntelliJ style Top Menu Bar */}
      <div className="h-7 bg-[#2b2d30] border-b border-[#1e1f22] flex items-center justify-between px-3 shrink-0 text-xs font-sans text-gray-300">
        <div className="flex items-center gap-3.5">
          <span className="font-bold tracking-wide text-[11px] text-[#cc7832] select-none">Tauri Coder IDE</span>
          <div className="flex items-center gap-3 text-gray-400 font-medium select-none">
            {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(m => (
              <span key={m} className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#35373c] text-[11px] transition-colors">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        
        <div className="flex flex-col flex-1 min-w-0 bg-[#1e1f22] border-l border-[#393b40]">
           <EditorToolbar />
           
           <div className="flex-1 min-h-0 flex flex-col relative">
             <div className="flex-1 relative" ref={containerRef}>
                <CodeEditor height={editorHeight} />
             </div>
             
             <BottomPanels />
           </div>
        </div>
        
        <ASTViewer />
      </div>

      <StatusBar />
    </div>
  );
}
