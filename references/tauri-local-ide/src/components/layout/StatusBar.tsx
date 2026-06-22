import React from 'react';
import { useCompilationStore } from '../../state/compilationStore';
import { Activity, CheckCircle2, XCircle, AlertTriangle, TerminalSquare } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { cn } from '../../utils/theme';

export function StatusBar() {
  const isCompiling = useCompilationStore(state => state.isCompiling);
  const diagnostics = useCompilationStore(state => state.diagnostics);
  const currentFile = useEditorStore(state => state.currentFile);
  const fileData = useEditorStore(state => state.files.get(currentFile || ''));
  
  const errorCount = diagnostics.filter(d => d.level === 'error').length;
  const warningCount = diagnostics.filter(d => d.level === 'warning').length;

  return (
    <footer className="h-full bg-darcula-accent text-white flex items-center justify-between px-3 text-[10px] font-medium uppercase tracking-wide select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 hover:text-white/80 cursor-pointer transition-colors">
          <TerminalSquare className="w-3.5 h-3.5" />
          <span className="font-bold">Tauri IDE</span>
        </div>
        
        {/* Compilation Status */}
        <div className="flex items-center space-x-1">
          {isCompiling ? (
            <span className="flex items-center text-white/80">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Compiling...
            </span>
          ) : (
            <span className="flex items-center text-white">
               <CheckCircle2 className="w-3 h-3 mr-1" />
               Ready
            </span>
          )}
        </div>
        
        {/* Diagnostics Summary */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center space-x-2 bg-black/20 px-2 py-0.5 rounded-full">
            {errorCount > 0 && (
              <span className="flex items-center font-bold text-white">
                <XCircle className="w-3 h-3 mr-1" />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center font-bold text-white">
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
