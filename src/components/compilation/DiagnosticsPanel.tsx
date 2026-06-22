import { useCompilationStore } from '../../state/compilationStore';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/theme';

export function DiagnosticsPanel() {
  const { diagnostics } = useCompilationStore();

  if (diagnostics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-ide-text/50 select-none bg-ide-bg">
        <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
        <p className="text-[11px] uppercase tracking-wider font-bold">No issues found in workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-ide-bg h-full overflow-y-auto">
      <div className="space-y-2 select-none">
        {diagnostics.map((d, i) => (
          <div
            key={i}
            className={cn(
              "p-2 rounded border text-xs font-mono",
              d.level === 'error' ? "bg-red-950/20 border-red-900/50 text-red-400" :
              d.level === 'warning' ? "bg-amber-950/20 border-amber-900/50 text-amber-400" :
              "bg-sky-950/20 border-sky-900/50 text-sky-400"
            )}
          >
            <div className="flex items-center space-x-2 text-[10px] mb-1 opacity-70">
              <span className="uppercase">{d.level}</span>
              <span>|</span>
              <span>{d.filePath}:{d.line}:{d.column}</span>
            </div>
            <div className="leading-relaxed">{d.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
