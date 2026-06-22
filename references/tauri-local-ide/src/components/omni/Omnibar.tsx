import React, { useState, useEffect } from 'react';
import { Search, Code, FileText, Sparkles, Command, Sidebar as SidebarIcon, MinusSquare, Layout } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';

export function Omnibar() {
  const [isOpen, setIsOpen] = useState(false);
  const { toggleActivityBar, toggleSidebar, toggleZenMode } = useSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Task 3.1.1: Global Command Palette (CMD+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const runCommand = (cmd: () => void) => {
      cmd();
      setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-darcula-bg/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-darcula-toolwindow border border-darcula-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center px-4 py-4 border-b border-darcula-border bg-darcula-toolwindow/50">
          <Search className="w-5 h-5 text-darcula-text/50 mr-3" />
          <input 
            autoFocus
            type="text" 
            placeholder="Search files, type @ to reference, or / for agents..." 
            className="flex-1 bg-transparent border-none outline-none text-darcula-text text-base placeholder:text-darcula-text/30 font-sans"
          />
          <div className="px-2 py-0.5 rounded bg-darcula-bg text-[10px] text-darcula-text/50 font-mono tracking-widest border border-darcula-border flex items-center">
            <Command className="w-3 h-3 mr-1" /> K
          </div>
        </div>
        
        <div className="p-2 space-y-1 max-h-[40vh] overflow-y-auto">
          <div className="px-3 py-2 mt-1 text-[10px] font-bold text-darcula-text/50 uppercase tracking-widest">Layout</div>
          <button onClick={() => runCommand(toggleSidebar)} className="w-full flex items-center px-3 py-2.5 hover:bg-darcula-selection rounded text-sm text-darcula-text hover:text-white transition-colors text-left group">
             <SidebarIcon className="w-4 h-4 text-darcula-accent mr-3 flex-shrink-0" />
             <span>Toggle Sidebar</span>
          </button>
          <button onClick={() => runCommand(toggleActivityBar)} className="w-full flex items-center px-3 py-2.5 hover:bg-darcula-selection rounded text-sm text-darcula-text hover:text-white transition-colors text-left group">
             <Layout className="w-4 h-4 text-darcula-accent mr-3 flex-shrink-0" />
             <span>Toggle Activity Bar</span>
          </button>
          <button onClick={() => runCommand(toggleZenMode)} className="w-full flex items-center px-3 py-2.5 hover:bg-darcula-selection rounded text-sm text-darcula-text hover:text-white transition-colors text-left group">
             <MinusSquare className="w-4 h-4 text-darcula-accent mr-3 flex-shrink-0" />
             <span>Zen Mode</span>
          </button>
          
          <div className="px-3 py-2 mt-4 text-[10px] font-bold text-darcula-text/50 uppercase tracking-widest">AI & Workflows</div>
          {/* ... keeping existing AI commands ... */}
        </div>
        
        <div className="bg-darcula-bg border-t border-darcula-border p-2 flex items-center justify-between text-[10px] text-darcula-text/50 tracking-wider">
           <div className="flex space-x-4">
             <span><kbd className="font-mono bg-darcula-border px-1 py-0.5 rounded">↑↓</kbd> to navigate</span>
             <span><kbd className="font-mono bg-darcula-border px-1 py-0.5 rounded">↵</kbd> to select</span>
           </div>
           <span>Type <span className="text-darcula-accent">@</span> for context</span>
        </div>
      </div>
    </div>
  );
}
