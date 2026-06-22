import { Play, Bug, Settings, Search, GitBranch } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';

export function TopNavigationBar() {
  const { setActiveOverlay, setTransientView } = useSettingsStore();

  return (
    <div className="h-10 border-b border-ide-border bg-ide-bg flex items-center justify-between px-4 select-none shrink-0 text-ide-text text-sm">
      <div className="flex items-center space-x-4">
        {/* Project breadcrumb / name placeholder */}
        <div className="font-semibold text-white tracking-wide">Oxide Tech IDE</div>
        <div className="h-4 w-px bg-ide-border"></div>
        <div className="flex items-center space-x-2 text-xs hover:bg-ide-panel px-2 py-1 rounded cursor-pointer transition-colors">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex bg-ide-panel border border-ide-border rounded px-2 py-1 items-center space-x-2 text-xs cursor-pointer hover:border-ide-activeTab">
          <Play className="w-3.5 h-3.5 text-green-500 fill-current" />
          <span>Run (Shift+F10)</span>
        </div>
        <div className="p-1.5 hover:bg-ide-panel rounded cursor-pointer transition-colors text-blue-400">
          <Bug className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={() => {
            setTransientView('previews');
            setActiveOverlay('transient');
          }}
          className="p-1.5 hover:bg-ide-panel rounded cursor-pointer transition-colors"
          title="Search Everywhere (Cmd+P)"
        >
          <Search className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-ide-panel rounded cursor-pointer transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
