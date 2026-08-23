import React from 'react';
import { Play, RotateCw, AlignLeft } from 'lucide-react';
import { useCompilationStore } from '../../state/compilationStore';
import { useEditorStore } from '../../state/editorStore';

/**
 * Editor Toolbar providing format, lint, and compile buttons
 * @returns React Component for the top bar of the editor pane
 */
export function EditorToolbar() {
  const currentFile = useEditorStore(state => state.currentFile);
  const isCompiling = useCompilationStore(state => state.isCompiling);
  const setDiagnostics = useCompilationStore(state => state.setDiagnostics);
  const setIsCompiling = useCompilationStore(state => state.setIsCompiling);

  const handleCompile = () => {
    setIsCompiling(true);
    setDiagnostics([]); // Clear previous
    // Simulate compilation
    setTimeout(() => {
      setDiagnostics([
        { level: 'error', message: 'expected `;`, found `}`', filePath: currentFile || 'src/main.rs', line: 12, column: 5 },
        { level: 'warning', message: 'unused variable: `hardware`\n`#[warn(unused_variables)]` on by default', filePath: currentFile || 'src/main.rs', line: 15, column: 9 }
      ]);
      setIsCompiling(false);
    }, 1200);
  };

  return (
    <div className="h-10 px-3 bg-[#2b2d30] border-b border-[#1e1f22] flex items-center justify-between shrink-0 font-sans select-none">
      <div className="flex items-center gap-2">
         {currentFile ? (
           <>
              <span className="text-[11px] font-mono text-gray-300 bg-[#1e1f22] px-2 py-1 rounded border border-[#393b40]">
                {currentFile}
              </span>
           </>
         ) : (
           <span className="text-[11px] text-gray-500 italic">No file selected</span>
         )}
      </div>

      <div className="flex items-center gap-2">
         <button className="p-1 hover:bg-[#35373c] rounded text-gray-400 hover:text-gray-200 transition-colors" title="Format Document">
            <AlignLeft className="w-4 h-4" />
         </button>
         <button 
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded outline-none border transition-colors ${
             isCompiling 
               ? 'bg-amber-600/10 text-amber-500 border-amber-600/30 font-medium' 
               : 'bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 border-[#393b40]'
           }`}
           onClick={handleCompile}
           disabled={isCompiling}
         >
            {isCompiling ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
            <span className="text-[11px]">{isCompiling ? 'Checking...' : 'Check'}</span>
         </button>
      </div>
    </div>
  );
}
