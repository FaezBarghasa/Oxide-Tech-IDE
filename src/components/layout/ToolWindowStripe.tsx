import { cn } from '../../utils/theme';
import { useLayoutState, ToolWindowPosition, ToolWindowId } from './useLayoutState';
import { 
  Files, Search, GitBranch, Bot, Wrench, Network, 
  Layout, Globe, Radio, Terminal, Bug, Activity, Cpu 
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

interface ToolWindowStripeProps {
  position: ToolWindowPosition;
}

const ICONS: Record<ToolWindowId, any> = {
  project: Files,
  search: Search,
  git: GitBranch,
  ai: Bot,
  skills: Wrench,
  mcp: Network,
  previews: Layout,
  rest: Globe,
  mqtt: Radio,
  serial: Terminal,
  terminal: Terminal,
  debug: Bug,
  ast: Activity,
  neural: Cpu
};

export function ToolWindowStripe({ position }: ToolWindowStripeProps) {
  const { windows, toggleToolWindow, activeLeftWindow, activeRightWindow, activeBottomWindow } = useLayoutState(useShallow(state => ({
    windows: state.windows,
    toggleToolWindow: state.toggleToolWindow,
    activeLeftWindow: state.activeLeftWindow,
    activeRightWindow: state.activeRightWindow,
    activeBottomWindow: state.activeBottomWindow
  })));

  const stripeWindows = Object.values(windows).filter(w => w.position === position);
  
  if (stripeWindows.length === 0) return null;

  const isVertical = position === 'left' || position === 'right';

  return (
    <div className={cn(
      "bg-ide-panel border-ide-border flex select-none z-10",
      isVertical ? "flex-col w-10 border-r" : "flex-row h-10 border-t items-center px-2",
      position === 'right' ? "border-l border-r-0" : ""
    )}>
      {stripeWindows.map((win) => {
        const Icon = ICONS[win.id];
        let isActive = false;
        if (position === 'left') isActive = activeLeftWindow === win.id;
        if (position === 'right') isActive = activeRightWindow === win.id;
        if (position === 'bottom') isActive = activeBottomWindow === win.id;

        return (
          <button
            key={win.id}
            onClick={() => toggleToolWindow(win.id)}
            title={win.title}
            className={cn(
              "flex items-center justify-center transition-colors cursor-pointer",
              isVertical ? "w-10 h-10" : "h-10 px-3",
              isActive ? "text-white bg-ide-activeTab border-l-2 border-ide-keyword" : "text-ide-text hover:text-white"
            )}
            style={isActive && position === 'bottom' ? { borderLeft: 'none', borderTop: '2px solid var(--ide-keyword)' } : {}}
          >
            <Icon className="w-[18px] h-[18px] stroke-[1.5]" />
          </button>
        );
      })}
    </div>
  );
}
