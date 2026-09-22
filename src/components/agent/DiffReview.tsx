import React from 'react';
import { PendingDiff } from '../../types/agent';
import { Check, X, FileCode, ChevronRight, ChevronDown } from 'lucide-react';

interface DiffReviewProps {
  diffs: PendingDiff[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onToggleDiff?: (filePath: string) => void;
}

export const DiffReview: React.FC<DiffReviewProps> = ({
  diffs,
  onAcceptAll,
  onRejectAll,
  onToggleDiff,
}) => {
  const [expandedFiles, setExpandedFiles] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    diffs.forEach(d => { initial[d.file_path] = true; });
    return initial;
  });

  const toggleExpand = (path: string) => {
    setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  if (diffs.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500">
        No pending diffs to review.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-zinc-800 text-zinc-200">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-300">
            Pending Diffs ({diffs.length} file{diffs.length > 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRejectAll}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-950/60 hover:bg-red-900 border border-red-800/80 rounded text-red-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reject All
          </button>
          <button
            onClick={onAcceptAll}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/80 rounded text-emerald-200 font-medium transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Accept All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {diffs.map((diff) => {
          const isExpanded = !!expandedFiles[diff.file_path];
          return (
            <div
              key={diff.file_path}
              className="border border-zinc-800 bg-[#181818] rounded overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(diff.file_path)}
                className="flex items-center justify-between px-2.5 py-1.5 bg-[#222222] hover:bg-[#2a2a2a] cursor-pointer border-b border-zinc-800/60 select-none"
              >
                <div className="flex items-center gap-1.5">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span className="text-xs font-mono text-amber-300 font-medium">
                    {diff.file_path}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    ({diff.hunks.length} hunk{diff.hunks.length > 1 ? 's' : ''})
                  </span>
                </div>
                {onToggleDiff && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDiff(diff.file_path);
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      diff.applied
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {diff.applied ? 'Applied' : 'Staged'}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="p-2 font-mono text-xs overflow-x-auto space-y-2 bg-[#121212]">
                  {diff.hunks.map((hunk, idx) => (
                    <div key={idx} className="border border-zinc-800/80 rounded bg-[#161616]">
                      <div className="px-2 py-0.5 text-[10px] text-cyan-400 bg-cyan-950/30 border-b border-zinc-800/80 select-none">
                        @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
                      </div>
                      <div className="py-1">
                        {hunk.lines.map((line, lIdx) => {
                          const isAdd = line.startsWith('+');
                          const isDel = line.startsWith('-');
                          return (
                            <div
                              key={lIdx}
                              className={`px-2 py-0.5 leading-relaxed whitespace-pre font-mono ${
                                isAdd
                                  ? 'bg-emerald-950/40 text-emerald-300'
                                  : isDel
                                  ? 'bg-red-950/40 text-red-300'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
