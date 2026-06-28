import { Play, Save, Bot } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useCompilationStore } from '../../state/compilationStore';
import { tauriCommands } from '../../services/tauri';
export function EditorToolbar() {
  const { currentFile, files, markSaved } = useEditorStore();
  const fileData = currentFile ? files.get(currentFile) : null;
  const { lastBuildStatus, setBuildStatus, setDiagnostics } = useCompilationStore();

  const handleSave = async () => {
    if (currentFile && fileData) {
      try {
        await tauriCommands.writeFile(currentFile, fileData.content);
        markSaved(currentFile);
      } catch (err) {
        console.error("Failed to save file", err);
      }
    }
  };

  const handleCheck = async () => {
    setBuildStatus('running');
    try {
      const resJSON = await tauriCommands.spawnCargoCheck('.');
      const res = JSON.parse(resJSON);
      if (res.diagnostics && res.diagnostics.length > 0) {
        setDiagnostics(res.diagnostics);
        setBuildStatus('success');

        const firstError = res.diagnostics.find((d: any) => d.level === 'error');
        if (firstError) {
          const { triggerSelfHealing } = await import('../../utils/compilerGuard');
          triggerSelfHealing(firstError);
        }
      } else {
        setDiagnostics([]);
        setBuildStatus('success');
      }
    } catch (err) {
      console.error("Cargo check failed", err);
      setBuildStatus('error');
    }
  };

  return (
    <div className="flex items-center justify-end px-3 space-x-2 h-full bg-ide-panel select-none">
      <button className="flex items-center px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-ide-bg text-ide-text hover:text-white hover:bg-ide-hover rounded border border-ide-border transition-colors mr-2 cursor-pointer">
        <Bot className="w-3.5 h-3.5 mr-1.5 text-ide-function" />
        Gemini 3.5 Flash
      </button>
      <div className="w-px h-4 bg-ide-border mx-1"></div>
      <button 
        onClick={handleSave}
        disabled={!currentFile || !fileData?.unsaved}
        className="p-1.5 text-ide-text hover:text-white hover:bg-ide-hover rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        title="Save File (Ctrl+S)"
      >
        <Save className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-ide-border mx-1"></div>
      <button 
        onClick={handleCheck}
        disabled={lastBuildStatus === 'running'}
        className="flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-ide-hover text-ide-text hover:bg-ide-activeTab hover:text-white rounded border border-ide-border cursor-pointer transition-colors disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5 mr-1.5 text-green-400" />
        Check
      </button>
    </div>
  );
}

