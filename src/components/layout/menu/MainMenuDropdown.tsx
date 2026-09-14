import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../../state/settingsStore';
import { useEditorStore } from '../../../state/editorStore';
import { useCompilationStore } from '../../../state/compilationStore';
import { tauriCommands } from '../../../services/tauri';
import {
  Folder, FileCode, Play, Bug, RefreshCw, Scissors, Copy, Clipboard,
  Search, Shield, Layers, HelpCircle
} from 'lucide-react';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void | Promise<void>;
  divider?: boolean;
  icon?: any;
  disabled?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function MainMenuDropdown() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    toggleZenMode,
    setActiveOverlay,
    setTransientView,
  } = useSettingsStore();

  const { currentFile, saveCurrentFile } = useEditorStore();
  const { setBuildStatus, setDiagnostics } = useCompilationStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerCargo = async (cmd: 'check' | 'clippy' | 'run' | 'test') => {
    setOpenMenu(null);
    setBuildStatus('running');
    try {
      if (cmd === 'check') {
        const resJSON = await tauriCommands.spawnCargoCheck('.');
        const res = JSON.parse(resJSON);
        setDiagnostics(res.diagnostics || []);
      } else if (cmd === 'clippy') {
        const resJSON = await tauriCommands.spawnCargoClippy('.');
        const res = JSON.parse(resJSON);
        setDiagnostics(res.diagnostics || []);
      } else {
        await tauriCommands.executeTerminalCommand(`cargo ${cmd}`, '.');
      }
      setBuildStatus('success');
    } catch {
      setBuildStatus('error');
    }
  };

  const MENUS: MenuCategory[] = [
    {
      title: 'File',
      items: [
        { label: 'New File...', shortcut: 'Alt+Insert', icon: FileCode, action: () => { setActiveOverlay('omnibar'); } },
        { label: 'Open...', shortcut: 'Ctrl+O', icon: Folder, action: () => {} },
        { label: 'Save All', shortcut: 'Ctrl+S', action: () => { if (currentFile) saveCurrentFile(); } },
        { label: 'Synchronize', shortcut: 'Ctrl+Alt+Y', action: () => {} },
        { divider: true, label: '' },
        { label: 'Settings...', shortcut: 'Ctrl+Alt+S', action: () => setActiveOverlay('settings') },
        { label: 'Project Structure...', shortcut: 'Ctrl+Alt+Shift+S', action: () => {} },
        { divider: true, label: '' },
        { label: 'Invalidate Caches...', action: () => {} },
        { label: 'Power Save Mode', action: () => {} },
        { divider: true, label: '' },
        { label: 'Exit', shortcut: 'Ctrl+Q', action: () => {} },
      ]
    },
    {
      title: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => {} },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => {} },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', icon: Scissors, action: () => {} },
        { label: 'Copy', shortcut: 'Ctrl+C', icon: Copy, action: () => {} },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: Clipboard, action: () => {} },
        { label: 'Paste from History...', shortcut: 'Ctrl+Shift+V', action: () => {} },
        { divider: true, label: '' },
        { label: 'Find in Files...', shortcut: 'Ctrl+Shift+F', icon: Search, action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { label: 'Search Everywhere', shortcut: 'Shift+Shift', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { divider: true, label: '' },
        { label: 'Join Lines', shortcut: 'Ctrl+Shift+J', action: () => {} },
        { label: 'Toggle Bookmark', shortcut: 'F11', action: () => {} },
      ]
    },
    {
      title: 'View',
      items: [
        { label: 'Search Everywhere', shortcut: 'Shift+Shift', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { label: 'Tool Windows', icon: Layers, action: () => {} },
        { divider: true, label: '' },
        { label: 'Toggle Zen Mode', action: () => toggleZenMode() },
        { label: 'Quick Documentation', shortcut: 'Ctrl+Q', action: () => {} },
        { label: 'Parameter Info', shortcut: 'Ctrl+P', action: () => {} },
        { divider: true, label: '' },
        { label: 'Show Inlay Hints', action: () => {} },
        { label: 'Show VCS Markers', action: () => {} },
      ]
    },
    {
      title: 'Navigate',
      items: [
        { label: 'Class / Struct...', shortcut: 'Ctrl+N', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { label: 'File...', shortcut: 'Ctrl+Shift+N', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { label: 'Symbol...', shortcut: 'Ctrl+Alt+Shift+N', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { divider: true, label: '' },
        { label: 'Recent Files', shortcut: 'Ctrl+E', action: () => { setActiveOverlay('harpoon'); } },
        { label: 'Declaration or Usages', shortcut: 'Ctrl+B', action: () => {} },
        { label: 'Implementation(s)', shortcut: 'Ctrl+Alt+B', action: () => {} },
        { label: 'Type Declaration', shortcut: 'Ctrl+Shift+B', action: () => {} },
      ]
    },
    {
      title: 'Code',
      items: [
        { label: 'Generate...', shortcut: 'Alt+Insert', action: () => {} },
        { label: 'Surround With...', shortcut: 'Ctrl+Alt+T', action: () => {} },
        { divider: true, label: '' },
        { label: 'Reformat Code', shortcut: 'Ctrl+Alt+L', action: () => {} },
        { label: 'Optimize Imports', shortcut: 'Ctrl+Alt+O', action: () => {} },
        { label: 'Auto-Indent Lines', shortcut: 'Ctrl+Alt+I', action: () => {} },
        { divider: true, label: '' },
        { label: 'Inspect Code...', action: () => triggerCargo('clippy') },
      ]
    },
    {
      title: 'Refactor',
      items: [
        { label: 'Refactor This...', shortcut: 'Ctrl+Alt+Shift+T', action: () => {} },
        { divider: true, label: '' },
        { label: 'Rename...', shortcut: 'Shift+F6', action: () => {} },
        { label: 'Change Signature...', shortcut: 'Ctrl+F6', action: () => {} },
        { label: 'Extract Variable...', shortcut: 'Ctrl+Alt+V', action: () => {} },
        { label: 'Extract Function...', shortcut: 'Ctrl+Alt+M', action: () => {} },
        { label: 'Inline...', shortcut: 'Ctrl+Alt+N', action: () => {} },
      ]
    },
    {
      title: 'Build',
      items: [
        { label: 'Build Project', shortcut: 'Ctrl+F9', icon: RefreshCw, action: () => triggerCargo('run') },
        { label: 'Cargo Check', shortcut: 'Shift+F10', action: () => triggerCargo('check') },
        { label: 'Cargo Clippy', action: () => triggerCargo('clippy') },
        { label: 'Clean Project', action: () => {} },
      ]
    },
    {
      title: 'Run',
      items: [
        { label: "Run 'Cargo run'", shortcut: 'Shift+F10', icon: Play, action: () => triggerCargo('run') },
        { label: "Debug 'Cargo run'", shortcut: 'Shift+F9', icon: Bug, action: () => {} },
        { label: 'Stop', shortcut: 'Ctrl+F2', action: () => {} },
        { divider: true, label: '' },
        { label: 'View Breakpoints...', shortcut: 'Ctrl+Shift+F8', action: () => {} },
        { label: 'Mute Breakpoints', action: () => {} },
      ]
    },
    {
      title: 'Tools',
      items: [
        { label: 'Cargo: Check', action: () => triggerCargo('check') },
        { label: 'Cargo: Clippy Lints', action: () => triggerCargo('clippy') },
        { label: 'Cargo: Test (All)', shortcut: 'Ctrl+Shift+T', action: () => triggerCargo('test') },
        { label: 'Cargo: Add Dependency...', action: () => {} },
        { divider: true, label: '' },
        { label: 'Rust: Expand Macro Recursively', action: () => {} },
        { label: 'Rust: Reformat with Rustfmt', action: () => {} },
        { label: 'Rust: Open in Playground', action: () => {} },
      ]
    },
    {
      title: 'VCS',
      items: [
        { label: 'Commit...', shortcut: 'Ctrl+K', icon: Shield, action: () => {} },
        { label: 'Push...', shortcut: 'Ctrl+Shift+K', action: () => {} },
        { label: 'Update Project...', shortcut: 'Ctrl+T', action: () => {} },
        { divider: true, label: '' },
        { label: 'Branches...', action: () => {} },
        { label: 'Show Git History', shortcut: 'Alt+9', action: () => {} },
        { label: 'Rollback Changes...', action: () => {} },
      ]
    },
    {
      title: 'Help',
      items: [
        { label: 'Keymap Reference', icon: HelpCircle, action: () => {} },
        { label: 'Tip of the Day', action: () => {} },
        { label: 'What\'s New in RustRover 2026.2', action: () => {} },
        { divider: true, label: '' },
        { label: 'About Oxide-Tech-IDE', action: () => {} },
      ]
    }
  ];

  return (
    <div ref={containerRef} className="flex items-center text-xs font-sans select-none relative z-50">
      {MENUS.map((menu) => {
        const isOpen = openMenu === menu.title;
        return (
          <div key={menu.title} className="relative">
            <button
              onClick={() => setOpenMenu(isOpen ? null : menu.title)}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(menu.title);
              }}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-ide-hover text-white font-medium'
                  : 'text-ide-text/80 hover:text-white hover:bg-ide-panel/80'
              }`}
            >
              {menu.title}
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-[#2b2d30] border border-[#393b40] rounded-md shadow-2xl py-1 text-[#dfe1e5] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                {menu.items.map((item, idx) => {
                  if (item.divider) {
                    return <div key={idx} className="my-1 border-t border-[#393b40]" />;
                  }

                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        }
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#3574f0] hover:text-white flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        {Icon ? (
                          <Icon className="w-3.5 h-3.5 text-ide-text/60 group-hover:text-white" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <span className="text-[10px] text-[#868a91] group-hover:text-white/80 font-mono ml-4">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
