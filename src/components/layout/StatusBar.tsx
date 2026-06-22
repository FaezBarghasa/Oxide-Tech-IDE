import { useCompilationStore } from '../../state/compilationStore';
import { Activity, CheckCircle2, XCircle, AlertTriangle, TerminalSquare } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';

export function StatusBar() {
  const lastBuildStatus = useCompilationStore(state => state.lastBuildStatus);
  const diagnostics = useCompilationStore(state => state.diagnostics);
  const currentFile = useEditorStore(state => state.currentFile);
  const files = useEditorStore(state => state.files);
  const fileData = currentFile ? files.get(currentFile) : null;
  
  const errorCount = diagnostics.filter(d => d.level === 'error').length;
  const warningCount = diagnostics.filter(d => d.level === 'warning').length;

  return (
    <footer className="h-6 bg-ide-panel border-t border-ide-border text-ide-text flex items-center justify-between px-3 text-[10px] font-medium uppercase tracking-wide select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 hover:text-white cursor-pointer transition-colors">
          <TerminalSquare className="w-3.5 h-3.5 text-ide-keyword" />
          <span className="font-bold text-white">Oxide IDE</span>
        </div>
        
        {/* Compilation Status */}
        <div className="flex items-center space-x-1">
          {lastBuildStatus === 'running' ? (
            <span className="flex items-center text-white/80">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Compiling...
            </span>
          ) : lastBuildStatus === 'error' ? (
            <span className="flex items-center text-red-400">
              <XCircle className="w-3 h-3 mr-1" />
              Error
            </span>
          ) : lastBuildStatus === 'success' ? (
            <span className="flex items-center text-green-400">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ready
            </span>
          ) : (
            <span className="flex items-center text-ide-text">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Idle
            </span>
          )}
        </div>
        
        {/* Diagnostics Summary */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center space-x-2 bg-black/20 px-2 py-0.5 rounded-full">
            {errorCount > 0 && (
              <span className="flex items-center font-bold text-red-400">
                <XCircle className="w-3 h-3 mr-1" />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center font-bold text-amber-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {warningCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4 font-mono">
        <div className="flex items-center space-x-1">
          {currentFile ? (
            <span>
              Ln {fileData?.cursor?.line ?? 1}, Col {fileData?.cursor?.column ?? 1}
            </span>
          ) : null}
        </div>
        <span>UTF-8</span>
        <span>RUST</span>
      </div>
    </footer>
  );
}
