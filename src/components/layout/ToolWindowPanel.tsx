import { Minus } from 'lucide-react';
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
        <span className="text-xs font-semibold text-white tracking-wide">{win.title}</span>
        <div className="flex items-center space-x-1">
          <button 
            className="p-1 hover:bg-white/10 rounded cursor-pointer text-ide-text hover:text-white"
            onClick={() => toggleToolWindow(id)}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
