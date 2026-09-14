import { useState } from 'react';
import { Play, Bug, Square, Settings, Search, Sparkles, ChevronDown, Box, Check, FolderGit2, Menu } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { MainMenuDropdown } from './menu/MainMenuDropdown';

type ConfigKey = 'run' | 'check' | 'clippy' | 'test' | 'bench';

const CONFIGS: Record<ConfigKey, { label: string; cmd: string }> = {
  run: { label: 'Cargo run', cmd: 'run' },
  check: { label: 'Cargo check', cmd: 'check' },
  clippy: { label: 'Cargo clippy', cmd: 'clippy' },
  test: { label: 'Cargo test (all)', cmd: 'test' },
  bench: { label: 'Cargo bench', cmd: 'bench' },
};

export function RustRoverHeader() {
  const { setActiveOverlay } = useSettingsStore();
  const { workspaceRoot } = useFileSystemStore();
  const { lastBuildStatus, setBuildStatus, setDiagnostics } = useCompilationStore();

  const [selectedConfig, setSelectedConfig] = useState<ConfigKey>('run');
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(true);

  const projectName = workspaceRoot ? workspaceRoot.split('/').pop() || 'Oxide-Tech-IDE' : 'Oxide-Tech-IDE';

  const handlePlay = async () => {
    setBuildStatus('running');
    try {
      if (selectedConfig === 'check') {
        const resJSON = await tauriCommands.spawnCargoCheck('.');
        try {
          const res = JSON.parse(resJSON);
          setDiagnostics(res.diagnostics || []);
        } catch {
          setDiagnostics([]);
        }
      } else if (selectedConfig === 'clippy') {
        const resJSON = await tauriCommands.spawnCargoClippy('.');
        try {
          const res = JSON.parse(resJSON);
          setDiagnostics(res.diagnostics || []);
        } catch {
          setDiagnostics([]);
        }
      } else {
        await tauriCommands.executeTerminalCommand(`cargo ${CONFIGS[selectedConfig].cmd}`, '.');
      }
      setBuildStatus('success');
    } catch (err) {
      console.error('Execution failed', err);
      setBuildStatus('error');
    }
  };

  const handleStop = async () => {
    setBuildStatus('idle');
  };

  return (
    <header className="h-10 bg-[#1e1f22] border-b border-[#2b2d30] flex items-center justify-between px-3 select-none shrink-0 text-[#dfe1e5] text-xs z-30 font-sans">
      {/* Left Section: Hamburger & Main Menus & Project Switcher */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowMainMenu(!showMainMenu)}
          title="Toggle Main Menu"
          className="p-1 hover:bg-[#2b2d30] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {showMainMenu ? (
          <MainMenuDropdown />
        ) : (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#2b2d30]/60 border border-[#393b40]/50 text-white font-medium">
            <FolderGit2 className="w-3.5 h-3.5 text-[#3574f0]" />
            <span className="text-[11px] tracking-wide">{projectName}</span>
          </div>
        )}
      </div>

      {/* Center Section: Run/Debug Configuration Bar */}
      <div className="flex items-center relative">
        <div className="flex items-center bg-[#2b2d30] border border-[#393b40] rounded shadow-inner h-[28px] overflow-hidden">
          {/* Target Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsConfigDropdownOpen(!isConfigDropdownOpen)}
              className="flex items-center space-x-2 px-2.5 h-full hover:bg-[#35373c] text-[11px] text-white font-medium transition-colors cursor-pointer border-r border-[#393b40]"
            >
              <Box className="w-3.5 h-3.5 text-[#e06c75]" />
              <span className="max-w-[130px] truncate">{CONFIGS[selectedConfig].label}</span>
              <ChevronDown className="w-3 h-3 text-[#868a91]" />
            </button>

            {isConfigDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsConfigDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-52 bg-[#2b2d30] border border-[#393b40] rounded-md shadow-2xl py-1 z-50 text-xs">
                  {Object.entries(CONFIGS).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedConfig(key as ConfigKey);
                        setIsConfigDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] text-[#dfe1e5] hover:text-white flex items-center justify-between transition-colors cursor-pointer text-[11px]"
                    >
                      <div className="flex items-center space-x-2">
                        <Box className="w-3.5 h-3.5 text-[#e06c75]" />
                        <span>{cfg.label}</span>
                      </div>
                      {selectedConfig === key && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Run Button (Shift+F10) */}
          <button
            onClick={handlePlay}
            disabled={lastBuildStatus === 'running'}
            title={`Run '${CONFIGS[selectedConfig].label}' (Shift+F10)`}
            className="px-2.5 h-full hover:bg-[#35373c] text-[#57a64a] hover:text-[#6ec85c] disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer border-r border-[#393b40]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Debug Button (Shift+F9) */}
          <button
            title={`Debug '${CONFIGS[selectedConfig].label}' (Shift+F9)`}
            className="px-2.5 h-full hover:bg-[#35373c] text-[#3574f0] hover:text-[#528bff] transition-colors flex items-center justify-center cursor-pointer border-r border-[#393b40]"
          >
            <Bug className="w-3.5 h-3.5" />
          </button>

          {/* Stop Button (Ctrl+F2) */}
          <button
            onClick={handleStop}
            title="Stop Process (Ctrl+F2)"
            className="px-2.5 h-full hover:bg-[#35373c] text-[#e06c75] hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>

      {/* Right Section: Search Everywhere, AI Assistant, Settings */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => {
            setActiveOverlay('search-everywhere');
          }}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#2b2d30]/60 hover:bg-[#2b2d30] border border-[#393b40]/60 hover:border-[#393b40] rounded text-[11px] text-[#868a91] hover:text-white transition-colors cursor-pointer"
          title="Search Everywhere (Double Shift)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] text-[#6f737a]">Shift+Shift</span>
        </button>

        <button
          onClick={() => {
            setActiveOverlay('prompt');
          }}
          className="p-1.5 hover:bg-[#2b2d30] rounded text-[#868a91] hover:text-[#3574f0] transition-colors cursor-pointer"
          title="Oxide AI Assistant"
        >
          <Sparkles className="w-4 h-4 text-[#3574f0]" />
        </button>

        <button
          onClick={() => setActiveOverlay('settings')}
          className="p-1.5 hover:bg-[#2b2d30] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
          title="Settings (Ctrl+Alt+S)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
