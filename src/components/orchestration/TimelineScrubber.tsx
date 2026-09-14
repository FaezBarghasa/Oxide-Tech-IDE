import React from 'react';
import { GitBranch, Check, Play, Eye, Sparkles, Layers } from 'lucide-react';
import { GhostBranchHypothesis } from '../../types/ast';

interface TimelineScrubberProps {
  hypotheses: GhostBranchHypothesis[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMerge: (id: string) => void;
  isRunning?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  hypotheses,
  selectedId,
  onSelect,
  onMerge,
  isRunning = false,
}) => {
  const selectedHypothesis = hypotheses.find((h) => h.id === selectedId) || hypotheses[0];

  return (
    <div className="flex flex-col bg-[#161b22] border-t border-[#30363d] text-zinc-300 select-none">
      {/* Top Bar: Active Hypotheses Branches */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            Parallel Ghost Branch Sandboxes (bwrap / git-worktree)
          </span>
          {isRunning && (
            <span className="flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Evaluating Hypotheses in Sandbox...</span>
            </span>
          )}
        </div>

        {selectedHypothesis && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onMerge(selectedHypothesis.id)}
              className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium shadow transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Merge Hypothesis to Main</span>
            </button>
          </div>
        )}
      </div>

      {/* Scrubber Tracks */}
      <div className="grid grid-cols-3 gap-2 p-2">
        {hypotheses.map((hyp) => {
          const isSelected = hyp.id === selectedId;
          const statusBg =
            hyp.status === 'passed'
              ? 'border-emerald-500/80 bg-emerald-950/20'
              : hyp.status === 'rejected'
              ? 'border-rose-500/80 bg-rose-950/20'
              : 'border-blue-500/50 bg-blue-950/20';

          return (
            <div
              key={hyp.id}
              onClick={() => onSelect(hyp.id)}
              className={`flex flex-col p-2.5 rounded-md border cursor-pointer transition ${
                isSelected
                  ? `ring-2 ring-purple-500/80 ${statusBg}`
                  : 'border-[#30363d] bg-[#0d1117] hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                    {hyp.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                    hyp.status === 'passed'
                      ? 'bg-emerald-900 text-emerald-300'
                      : hyp.status === 'rejected'
                      ? 'bg-rose-900 text-rose-300'
                      : 'bg-blue-900 text-blue-300'
                  }`}
                >
                  {hyp.status}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 line-clamp-1 mb-2">{hyp.description}</p>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#30363d]/60">
                <span className="text-emerald-400">+{hyp.diffStats.added}</span>
                <span className="text-rose-400">-{hyp.diffStats.deleted} lines</span>
                <span className="text-purple-300 font-semibold">{hyp.estimatedAccuracy}% score</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Diff Preview */}
      {selectedHypothesis && (
        <div className="px-3 py-2 bg-[#090d13] border-t border-[#30363d] flex flex-col space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-mono text-zinc-300 font-semibold flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sandbox Diff Preview: {selectedHypothesis.name}</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-500">Target: crates/core/src/loop_engine.rs</span>
          </div>
          <pre className="font-mono text-[11px] bg-[#0d1117] p-2 rounded text-zinc-300 overflow-x-auto border border-[#30363d]/60 max-h-24">
            <code>{selectedHypothesis.previewDiff}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
