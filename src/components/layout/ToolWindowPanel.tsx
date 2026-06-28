import { Minus, Settings } from 'lucide-react';
import { useLayoutState, ToolWindowId } from './useLayoutState';
import { ReactNode } from 'react';

interface ToolWindowPanelProps {
  id: ToolWindowId;
  children: ReactNode;
}

export function ToolWindowPanel({ id, children }: ToolWindowPanelProps) {
  const { windows, toggleToolWindow } = useLayoutState();
  const win = windows[id];

  if (!win) return null;

  return (
    <div className="flex flex-col w-full h-full bg-ide-bg border-ide-border">
      <div className="h-8 flex items-center justify-between px-3 bg-ide-panel border-b border-ide-border select-none shrink-0">
        <span className="text-[11px] font-semibold text-white/90 tracking-wide font-sans">{win.title}</span>
        <div className="flex items-center space-x-1.5">
          <button 
            className="p-1 hover:bg-ide-hover rounded cursor-pointer text-ide-text/60 hover:text-white transition-colors"
            title="Options"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button 
            className="p-1 hover:bg-ide-hover rounded cursor-pointer text-ide-text/60 hover:text-white transition-colors"
            onClick={() => toggleToolWindow(id)}
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
