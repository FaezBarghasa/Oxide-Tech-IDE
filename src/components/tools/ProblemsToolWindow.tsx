import { useState } from 'react';
import { useCompilationStore } from '../../state/compilationStore';
import { useEditorStore } from '../../state/editorStore';
import { AlertTriangle, XCircle, CheckCircle2, ChevronRight, ChevronDown, Filter, FileCode } from 'lucide-react';

export function ProblemsToolWindow() {
  const { diagnostics } = useCompilationStore();
  const { openFile } = useEditorStore();

  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

  const filtered = diagnostics.filter((d) => {
    if (d.level === 'error' && !showErrors) return false;
    if (d.level === 'warning' && !showWarnings) return false;
    return true;
  });

  const errorCount = diagnostics.filter((d) => d.level === 'error').length;
  const warningCount = diagnostics.filter((d) => d.level === 'warning').length;

  // Group by file path
  const groupedByFile: Record<string, typeof diagnostics> = {};
  for (const item of filtered) {
    const key = item.filePath || 'Workspace';
    if (!groupedByFile[key]) groupedByFile[key] = [];
    groupedByFile[key].push(item);
  }

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  const handleNavigate = (filePath: string) => {
    if (filePath && filePath !== 'Workspace') {
      openFile(filePath);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] select-none font-sans text-xs">
      {/* Problems Toolbar */}
      <div className="h-7 px-3 border-b border-[#2b2d30] flex items-center justify-between shrink-0 bg-[#2b2d30]/50">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-white">Problems (Alt+6)</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                showErrors ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-[#868a91] hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{errorCount} Errors</span>
            </button>

            <button
              onClick={() => setShowWarnings(!showWarnings)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                showWarnings ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-[#868a91] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warningCount} Warnings</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[#868a91]">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[10px]">Autoscroll to Source</span>
        </div>
      </div>

      {/* Problems List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-[#868a91]">
            <CheckCircle2 className="w-8 h-8 text-[#57a64a] mb-2" />
            <p className="text-xs font-medium text-white">No problems found</p>
            <p className="text-[11px] mt-0.5">Workspace compiler checks passed cleanly</p>
          </div>
        ) : (
          Object.entries(groupedByFile).map(([file, items]) => {
            const isExpanded = expandedFiles.includes(file) || expandedFiles.length === 0;

            return (
              <div key={file} className="border border-[#2b2d30] rounded overflow-hidden">
                <div
                  onClick={() => toggleFile(file)}
                  className="flex items-center space-x-1.5 px-2 py-1.5 bg-[#2b2d30]/60 hover:bg-[#2b2d30] cursor-pointer text-white font-medium"
                >
                  <span className="text-[#868a91]">
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                  <FileCode className="w-3.5 h-3.5 text-[#e06c75]" />
                  <span className="text-[11px] font-mono">{file}</span>
                  <span className="text-[10px] text-[#868a91] font-sans">({items.length})</span>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-[#2b2d30]/50 bg-[#1e1f22]">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        onDoubleClick={() => handleNavigate(file)}
                        className="flex items-start space-x-2 px-6 py-1.5 hover:bg-[#2b2d30] cursor-pointer text-[11px] transition-colors group"
                      >
                        {item.level === 'error' ? (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="text-[#dfe1e5] group-hover:text-white">{item.message}</div>
                          <div className="text-[10px] text-[#868a91] font-mono mt-0.5">
                            Line {item.line}, Column {item.column}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
