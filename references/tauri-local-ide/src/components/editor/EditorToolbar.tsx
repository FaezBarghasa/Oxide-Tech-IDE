import React from 'react';
import { Play, Save, Bot } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useCompilationStore } from '../../state/compilationStore';
import { spawnCargoCheck } from '../../services/tauri';
import { writeFile } from '../../services/tauri';

export function EditorToolbar() {
  const currentFile = useEditorStore(state => state.currentFile);
  const fileData = useEditorStore(state => currentFile ? state.files.get(currentFile) : null);
  const markSaved = useEditorStore(state => state.markSaved);
  const setCompiling = useCompilationStore(state => state.setCompiling);
  const setDiagnostics = useCompilationStore(state => state.setDiagnostics);

  const handleSave = async () => {
    if (currentFile && fileData) {
      await writeFile(currentFile, fileData.content);
      markSaved(currentFile);
    }
  };

  const handleCheck = async () => {
    setCompiling(true);
    try {
      const resJSON = await spawnCargoCheck('/workspace');
      const res = JSON.parse(resJSON);
      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }
    } catch (e) {
      console.error("Cargo check failed", e);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="h-9 flex bg-zinc-900 border-b border-zinc-800 select-none overflow-hidden">
      <div className="px-4 flex items-center bg-zinc-950 border-t border-t-orange-500 border-r border-r-zinc-800 text-xs space-x-2">
        {currentFile ? (
          <>
            <span className="text-zinc-200 font-mono">{currentFile.split('/').pop()}</span>
            {fileData?.unsaved && <span className="ml-2 w-2 h-2 rounded-full bg-amber-500"></span>}
          </>
        ) : (
          <span className="text-zinc-500 italic">No file open</span>
        )}
      </div>
      
      <div className="flex-1 flex items-center justify-end px-3 space-x-2">
        {/* Task 4.2.2: Multi-Model Protocol Switcher */}
        <button className="flex items-center px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors mr-2">
          <Bot className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
          Gemini 3.5 Flash
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-1 border-r border-black"></div>
        <button 
          onClick={handleSave}
          disabled={!currentFile || !fileData?.unsaved}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Save File (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-1"></div>
        <button 
          onClick={handleCheck}
          className="flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
        >
          <Play className="w-3 h-3 mr-1" />
          Check
        </button>
      </div>
    </div>
  );
}
