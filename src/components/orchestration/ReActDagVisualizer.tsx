import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, PauseCircle, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { DagTaskNode } from '../../types/ast';

interface ReActDagVisualizerProps {
  nodes: DagTaskNode[];
  onTriggerHitl?: (nodeId: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

export const ReActDagVisualizer: React.FC<ReActDagVisualizerProps> = ({
  nodes,
  onTriggerHitl,
  onSelectNode,
}) => {
  const hasOscillation = nodes.some((n) => n.is_oscillating || n.status === 'PausedForHitl');

  return (
    <div className="flex flex-col bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">Optio ReAct DAG Operations</span>
          <span className="text-[10px] text-zinc-400 bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
            {nodes.length} Nodes
          </span>
        </div>

        {hasOscillation && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700 text-rose-300 text-xs animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="font-semibold">Oscillation Guard Triggered (Loop Paused)</span>
          </div>
        )}
      </div>

      {/* DAG Node Flow Pipeline */}
      <div className="p-4 flex items-center space-x-3 overflow-x-auto">
        {nodes.map((node, index) => {
          const isOscillating = node.is_oscillating || node.status === 'PausedForHitl';
          const isCompleted = node.status === 'Completed';
          const isRunning = node.status === 'Running';

          const cardBorder = isOscillating
            ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-950/20'
            : isCompleted
            ? 'border-emerald-500/60 bg-emerald-950/10'
            : isRunning
            ? 'border-blue-500/80 bg-blue-950/20 ring-1 ring-blue-500/30'
            : 'border-[#30363d] bg-[#161b22]';

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => onSelectNode?.(node.id)}
                className={`flex-shrink-0 w-64 p-3 rounded-lg border cursor-pointer transition flex flex-col space-y-2 ${cardBorder}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-cyan-300 border border-cyan-800/40">
                    {node.agent_type}
                  </span>
                  <div className="flex items-center space-x-1">
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isRunning && <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />}
                    {isOscillating && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>

                <div className="text-xs font-medium text-white line-clamp-2">{node.description}</div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-[#30363d]">
                  <span>Tokens: {node.actual_tokens || node.estimated_tokens}</span>
                  {node.iteration_count && (
                    <span className={isOscillating ? 'text-rose-400 font-bold' : ''}>
                      Iter: {node.iteration_count}/3
                    </span>
                  )}
                </div>

                {isOscillating && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerHitl?.(node.id);
                    }}
                    className="w-full mt-1 py-1 px-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center space-x-1"
                  >
                    <PauseCircle className="w-3 h-3" />
                    <span>Open HITL Modal</span>
                  </button>
                )}
              </div>

              {index < nodes.length - 1 && (
                <ArrowRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
