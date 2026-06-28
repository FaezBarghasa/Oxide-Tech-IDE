import { useState } from 'react';
import { Play, Bug, Settings, Search, GitBranch, ChevronDown, Box, Check } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { tauriCommands } from '../../services/tauri';

type ConfigKey = 'check' | 'clippy' | 'run' | 'test';

const CONFIGS = {
  check: { label: 'Cargo check', cmd: 'check' },
  clippy: { label: 'Cargo clippy', cmd: 'clippy' },
  run: { label: 'Cargo run', cmd: 'run' },
  test: { label: 'Cargo test', cmd: 'test' },
};

export function TopNavigationBar() {
  const { setActiveOverlay, setTransientView } = useSettingsStore();
  const { setBuildStatus, setDiagnostics } = useCompilationStore();
  const [selectedConfig, setSelectedConfig] = useState<ConfigKey>('check');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePlay = async () => {
    setBuildStatus('running');
    try {
      let resJSON = '';
      if (selectedConfig === 'check') {
        resJSON = await tauriCommands.spawnCargoCheck('.');
      } else if (selectedConfig === 'clippy') {
        resJSON = await tauriCommands.spawnCargoClippy('.');
      } else {
        // Run general command
        const out = await tauriCommands.executeTerminalCommand(`cargo ${CONFIGS[selectedConfig].cmd}`, '.');
        resJSON = JSON.stringify({ diagnostics: [], output: out });
      }
      
      try {
        const res = JSON.parse(resJSON);
        if (res.diagnostics && res.diagnostics.length > 0) {
          setDiagnostics(res.diagnostics);
          setBuildStatus('success');

          const firstError = res.diagnostics.find((d: any) => d.level === 'error');
          if (firstError) {
            const { triggerSelfHealing } = await import('../../utils/compilerGuard');
            triggerSelfHealing(firstError);
          }
        } else {
          setDiagnostics([]);
          setBuildStatus('success');
        }
      } catch {
        setDiagnostics([]);
        setBuildStatus('success');
      }
    } catch (err) {
      console.error("Execution failed", err);
      setBuildStatus('error');
    }
  };

  return (
    <div className="h-10 border-b border-ide-border bg-ide-bg flex items-center justify-between px-4 select-none shrink-0 text-ide-text text-sm">
      {/* Left section: breadcrumb & branch */}
      <div className="flex items-center space-x-4">
        <div className="font-semibold text-white tracking-wide flex items-center space-x-1.5">
          <span className="text-ide-keyword">oxide-tech-ide</span>
        </div>
        <div className="h-4 w-px bg-ide-border"></div>
        <div className="flex items-center space-x-1.5 text-xs hover:bg-ide-panel px-2 py-1 rounded cursor-pointer transition-colors border border-transparent hover:border-ide-border">
          <GitBranch className="w-3.5 h-3.5 text-ide-text/60" />
          <span className="font-mono text-white/90">main</span>
        </div>
      </div>

      {/* Center section: RustRover Run Widget */}
      <div className="flex items-center relative">
        <div className="flex items-center">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex bg-ide-panel border border-ide-border hover:bg-ide-hover px-2.5 py-1 items-center space-x-2 text-xs text-white rounded-l cursor-pointer transition-colors border-r-0 h-[26px]"
            >
              <Box className="w-3.5 h-3.5 text-[#cc7832]" />
              <span className="font-medium">{CONFIGS[selectedConfig].label}</span>
              <ChevronDown className="w-3 h-3 text-ide-text/60" />
            </button>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-7 left-0 w-44 bg-ide-panel border border-ide-border rounded shadow-xl py-1 z-50 font-sans text-xs">
                  {Object.entries(CONFIGS).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedConfig(key as ConfigKey);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-ide-hover text-ide-text hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Box className="w-3.5 h-3.5 text-[#cc7832]" />
                        <span>{config.label}</span>
                      </div>
                      {selectedConfig === key && <Check className="w-3 h-3 text-ide-keyword" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button 
            onClick={handlePlay}
            className="bg-ide-panel border border-ide-border hover:bg-ide-hover p-1.5 cursor-pointer text-green-500 hover:text-green-400 border-r-0 h-[26px] w-[30px] flex items-center justify-center transition-colors"
            title={`Run '${CONFIGS[selectedConfig].label}' (Shift+F10)`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
          <button 
            className="bg-ide-panel border border-ide-border hover:bg-ide-hover p-1.5 cursor-pointer text-blue-400 hover:text-blue-300 rounded-r h-[26px] w-[30px] flex items-center justify-center transition-colors"
            title="Debug (Shift+F9)"
          >
            <Bug className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right section: Search / Settings */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => {
            setTransientView('previews');
            setActiveOverlay('transient');
          }}
          className="p-1.5 hover:bg-ide-panel rounded cursor-pointer transition-colors"
          title="Search Everywhere (Double Shift / Cmd+P)"
        >
          <Search className="w-4 h-4 text-ide-text/80 hover:text-white" />
        </button>
        <button className="p-1.5 hover:bg-ide-panel rounded cursor-pointer transition-colors">
          <Settings className="w-4 h-4 text-ide-text/80 hover:text-white" />
        </button>
      </div>
    </div>
  );
}

