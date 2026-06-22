import { useCompilationStore } from '../../state/compilationStore';
import { useEditorStore } from '../../state/editorStore';
import { Brain, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

export function TaskHUD() {
  const { lastBuildStatus, progress } = useCompilationStore();
  const { reviewComments } = useEditorStore();

  const isEditorBusy = reviewComments.length > 0;
  const isCompiling = lastBuildStatus === 'running';

  if (!isCompiling && !isEditorBusy && lastBuildStatus === 'idle') {
    return null;
  }

  // Determine stage states for Kanban sequence
  let stage1: 'pending' | 'running' | 'done' = 'done';
  let stage2: 'pending' | 'running' | 'done' = 'pending';
  let stage3: 'pending' | 'running' | 'done' = 'pending';

  if (isCompiling) {
    stage1 = 'done';
    stage2 = 'done';
    stage3 = 'running';
  } else if (isEditorBusy) {
    stage1 = 'done';
    stage2 = 'running';
    stage3 = 'pending';
  } else {
    stage1 = 'running';
    stage2 = 'pending';
    stage3 = lastBuildStatus === 'success' ? 'done' : 'pending';
  }

  const renderStageIcon = (state: 'pending' | 'running' | 'done') => {
    switch (state) {
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-ide-keyword animate-spin shrink-0" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-ide-text/20 shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-60 bg-ide-panel/95 backdrop-blur-md border border-ide-border rounded-lg shadow-2xl p-3 z-50 text-ide-text font-sans select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between border-b border-ide-border pb-1.5 mb-2 shrink-0">
        <div className="flex items-center space-x-1.5">
          <Brain className="w-4 h-4 text-ide-keyword animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">Cortex Agent HUD</span>
        </div>
        {isCompiling && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-ide-keyword/10 text-ide-keyword font-mono">
            {progress}%
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">
            {isCompiling
              ? 'Testing compilation...'
              : isEditorBusy
              ? 'Awaiting inline fixes'
              : 'Idle'}
          </span>
          <span className="text-[9px] text-ide-text/40">Status</span>
        </div>

        {/* Minimalist Kanban Sequence */}
        <div className="space-y-1.5 bg-ide-bg/40 rounded p-2 border border-ide-border/50">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2">
              {renderStageIcon(stage1)}
              <span className={stage1 === 'running' ? 'text-white font-medium' : 'text-ide-text/60'}>
                1. Analyzing Context
              </span>
            </div>
            {stage1 === 'done' && <span className="text-[9px] text-green-400">ok</span>}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2">
              {renderStageIcon(stage2)}
              <span className={stage2 === 'running' ? 'text-white font-medium' : 'text-ide-text/60'}>
                2. Editing Codebase
              </span>
            </div>
            {stage2 === 'done' && <span className="text-[9px] text-green-400">ok</span>}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2">
              {renderStageIcon(stage3)}
              <span className={stage3 === 'running' ? 'text-white font-medium' : 'text-ide-text/60'}>
                3. Running Cargo Check
              </span>
            </div>
            {stage3 === 'done' && <span className="text-[9px] text-green-400">ok</span>}
          </div>
        </div>

        {/* Status Line */}
        {lastBuildStatus === 'success' && (
          <div className="flex items-center space-x-1.5 text-[10px] text-green-400 mt-1 bg-green-400/5 p-1 rounded border border-green-500/10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Clippy checks verified successfully</span>
          </div>
        )}
        {lastBuildStatus === 'error' && (
          <div className="flex items-center space-x-1.5 text-[10px] text-red-400 mt-1 bg-red-400/5 p-1 rounded border border-red-500/10">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Diagnostics report build failures</span>
          </div>
        )}
      </div>
    </div>
  );
}
