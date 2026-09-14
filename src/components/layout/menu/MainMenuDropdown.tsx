import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../../state/settingsStore';
import { useEditorStore } from '../../../state/editorStore';
import { useCompilationStore } from '../../../state/compilationStore';
import { useDebugStore } from '../../../state/debugStore';
import { tauriCommands } from '../../../services/tauri';
import {
  Folder, FileCode, Play, Bug, RefreshCw, Scissors, Copy, Clipboard,
  Search, Shield, Layers, HelpCircle, Cpu, Settings, ChevronRight,
  Bookmark, Globe, GitBranch
} from 'lucide-react';

export interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void | Promise<void>;
  divider?: boolean;
  icon?: any;
  disabled?: boolean;
  children?: MenuItem[];
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function MainMenuDropdown() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    toggleZenMode,
    setActiveOverlay,
    setTransientView,
  } = useSettingsStore();

  const { currentFile, saveCurrentFile } = useEditorStore();
  const { setBuildStatus, setDiagnostics } = useCompilationStore();
  const { startDebugging, resumeExecution, pauseExecution, stepOver, stepInto, stepOut, stopDebugging } = useDebugStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setActiveSubmenu(null);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerCargo = async (cmd: 'check' | 'clippy' | 'run' | 'test' | 'bench' | 'doc' | 'clean' | 'fmt') => {
    setOpenMenu(null);
    setActiveSubmenu(null);
    setBuildStatus('running');
    try {
      if (cmd === 'check') {
        const resJSON = await tauriCommands.spawnCargoCheck('.');
        try {
          const res = JSON.parse(resJSON);
          setDiagnostics(res.diagnostics || []);
        } catch {
          setDiagnostics([]);
        }
      } else if (cmd === 'clippy') {
        const resJSON = await tauriCommands.spawnCargoClippy('.');
        try {
          const res = JSON.parse(resJSON);
          setDiagnostics(res.diagnostics || []);
        } catch {
          setDiagnostics([]);
        }
      } else {
        await tauriCommands.executeTerminalCommand(`cargo ${cmd}`, '.');
      }
      setBuildStatus('success');
    } catch {
      setBuildStatus('error');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const MENUS: MenuCategory[] = [
    {
      title: 'File',
      items: [
        {
          label: 'New',
          icon: FileCode,
          children: [
            { label: 'Project...', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'Module', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'Package', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'File', shortcut: 'Alt+Insert', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'Directory', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'Scratch File', shortcut: 'Ctrl+Alt+Shift+Insert', action: () => { setActiveOverlay('omnibar'); } },
            { label: 'From Existing Sources...', action: () => {} },
          ]
        },
        {
          label: 'Open...',
          shortcut: 'Ctrl+O',
          icon: Folder,
          action: () => {}
        },
        {
          label: 'Open Recent',
          children: [
            { label: 'Oxide-Tech-IDE', action: () => {} },
            { label: 'embedded-firmware-stm32', action: () => {} },
            { label: 'slint-dashboard-app', action: () => {} },
            { divider: true, label: '' },
            { label: 'Manage Projects...', action: () => {} },
          ]
        },
        { label: 'Close Project', action: () => {} },
        { divider: true, label: '' },
        { label: 'Settings', shortcut: 'Ctrl+Alt+S', icon: Settings, action: () => setActiveOverlay('settings') },
        { label: 'Project Structure...', shortcut: 'Ctrl+Alt+Shift+S', action: () => setActiveOverlay('settings') },
        { divider: true, label: '' },
        { label: 'Save All', shortcut: 'Ctrl+S', action: () => { if (currentFile) saveCurrentFile(); } },
        { label: 'Synchronize', shortcut: 'Ctrl+Alt+Y', action: () => {} },
        { label: 'Reload All from Disk', action: () => {} },
        {
          label: 'Manage IDE Settings',
          children: [
            { label: 'Import Settings...', action: () => {} },
            { label: 'Export Settings...', action: () => {} },
            { label: 'Restore Default Settings...', action: () => {} },
          ]
        },
        { divider: true, label: '' },
        { label: 'Invalidate Caches...', action: () => {} },
        { label: 'Repair IDE', action: () => {} },
        { label: 'Power Save Mode', action: () => {} },
        { label: 'Print...', shortcut: 'Ctrl+P', action: () => {} },
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
        {
          label: 'Copy Path/Reference',
          children: [
            { label: 'Absolute Path', action: () => { if (currentFile) copyToClipboard(currentFile); } },
            { label: 'File Name', action: () => { if (currentFile) copyToClipboard(currentFile.split('/').pop() || ''); } },
            { label: 'Path from Content Root', action: () => { if (currentFile) copyToClipboard(currentFile); } },
            { label: 'Path from Source Root', action: () => { if (currentFile) copyToClipboard(currentFile); } },
            { label: 'Path from Repository Root', action: () => { if (currentFile) copyToClipboard(currentFile); } },
            { label: 'GitHub Repository URL', action: () => {} },
            { label: 'Copy Reference', shortcut: 'Ctrl+Alt+Shift+C', action: () => {} },
          ]
        },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: Clipboard, action: () => {} },
        { label: 'Paste from History...', shortcut: 'Ctrl+Shift+V', action: () => {} },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => {} },
        { label: 'Delete', shortcut: 'Delete', action: () => {} },
        { divider: true, label: '' },
        {
          label: 'Find',
          icon: Search,
          children: [
            { label: 'Find...', shortcut: 'Ctrl+F', action: () => {} },
            { label: 'Replace...', shortcut: 'Ctrl+R', action: () => {} },
            { label: 'Find Next', shortcut: 'F3', action: () => {} },
            { label: 'Find Previous', shortcut: 'Shift+F3', action: () => {} },
            { label: 'Find in Files...', shortcut: 'Ctrl+Shift+F', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
            { label: 'Replace in Files...', shortcut: 'Ctrl+Shift+R', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
            { label: 'Find Word at Caret', shortcut: 'Ctrl+F3', action: () => {} },
            { label: 'Search Structurally...', action: () => {} },
            { label: 'Replace Structurally...', action: () => {} },
          ]
        },
        { label: 'Search Everywhere', shortcut: 'Shift+Shift', action: () => { setTransientView('previews'); setActiveOverlay('transient'); } },
        { label: 'Toggle Case', shortcut: 'Ctrl+Shift+U', action: () => {} },
        { divider: true, label: '' },
        { label: 'Start Macro Recording', action: () => {} },
        { label: 'Stop Macro Recording', action: () => {} },
        { label: 'Play Last Macro', action: () => {} },
        { divider: true, label: '' },
        { label: 'Join Lines', shortcut: 'Ctrl+Shift+J', action: () => {} },
        { label: 'Split Line', shortcut: 'Ctrl+Enter', action: () => {} },
        { label: 'Extend Selection', shortcut: 'Ctrl+W', action: () => {} },
        { label: 'Shrink Selection', shortcut: 'Ctrl+Shift+W', action: () => {} },
        { label: 'Column Selection Mode', shortcut: 'Alt+Shift+Insert', action: () => {} },
        {
          label: 'Bookmarks',
          icon: Bookmark,
          children: [
            { label: 'Toggle Bookmark', shortcut: 'F11', action: () => {} },
            { label: 'Toggle Bookmark with Mnemonic', shortcut: 'Ctrl+F11', action: () => {} },
            { label: 'Show Bookmarks', shortcut: 'Shift+F11', action: () => {} },
          ]
        },
        {
          label: 'Encoding',
          children: [
            { label: 'UTF-8', action: () => {} },
            { label: 'Windows-1252', action: () => {} },
            { label: 'ISO-8859-1', action: () => {} },
            { label: 'Reload in Another Encoding...', action: () => {} },
            { label: 'Convert to Another Encoding...', action: () => {} },
          ]
        },
        {
          label: 'Line Separators',
          children: [
            { label: 'LF - Unix and macOS (\\n)', action: () => {} },
            { label: 'CR - Classic Mac (\\r)', action: () => {} },
            { label: 'CRLF - Windows (\\r\\n)', action: () => {} },
            { label: 'Detect from Content', action: () => {} },
          ]
        },
      ]
    },
    {
      title: 'View',
      items: [
        {
          label: 'Appearance',
          children: [
            { label: 'Navigation Bar (Show/Hide)', action: () => {} },
            { label: 'Status Bar (Show/Hide)', action: () => {} },
            { label: 'Tool Window Bars (Show/Hide)', action: () => {} },
            { label: 'Toolbar (Show/Hide)', action: () => {} },
            { divider: true, label: '' },
            { label: 'Enter Distraction Free Mode', action: () => toggleZenMode() },
            { label: 'Enter Zen Mode', action: () => toggleZenMode() },
            { label: 'Enter Presentation Mode', action: () => {} },
            { divider: true, label: '' },
            { label: 'Breadcrumbs (Show/Hide)', action: () => {} },
            { label: 'Indent Guides (Show/Hide)', action: () => {} },
            { label: 'Line Numbers (Show/Hide)', action: () => {} },
            { label: 'Inlay Hints (Show/Hide)', action: () => {} },
          ]
        },
        {
          label: 'Tool Windows',
          icon: Layers,
          children: [
            { label: 'Project', shortcut: 'Alt+1', action: () => {} },
            { label: 'Cargo', shortcut: 'Cmd+F11', action: () => {} },
            { label: 'Structure', shortcut: 'Alt+7', action: () => {} },
            { label: 'Favorites', shortcut: 'Alt+2', action: () => {} },
            { label: 'Run', shortcut: 'Alt+4', action: () => {} },
            { label: 'Debug', shortcut: 'Alt+5', action: () => {} },
            { label: 'Terminal', shortcut: 'Alt+F12', action: () => {} },
            { label: 'Version Control', shortcut: 'Alt+9', action: () => {} },
            { label: 'Problems', shortcut: 'Alt+6', action: () => {} },
            { label: 'AI Assistant', action: () => {} },
            { label: 'Notifications', shortcut: 'Alt+0', action: () => {} },
            { label: 'MQTT Terminal', action: () => {} },
            { label: 'Playwright E2E', action: () => {} },
            { label: 'Slint Preview', action: () => {} },
            { label: 'Embedded Sim', action: () => {} },
            { label: 'Iced Inspector', action: () => {} },
          ]
        },
        { divider: true, label: '' },
        { label: 'Quick Documentation', shortcut: 'Ctrl+Q', action: () => {} },
        { label: 'Parameter Info', shortcut: 'Ctrl+P', action: () => {} },
        {
          label: 'Active Editor',
          children: [
            { label: 'Go to Line/Column', shortcut: 'Ctrl+G', action: () => {} },
            { label: 'Select In...', shortcut: 'Alt+F1', action: () => {} },
          ]
        },
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
        { label: 'Recent Locations', shortcut: 'Ctrl+Shift+E', action: () => {} },
        { label: 'Last Edit Location', shortcut: 'Ctrl+Shift+Backspace', action: () => {} },
        { divider: true, label: '' },
        { label: 'Back', shortcut: 'Ctrl+Alt+Left', action: () => {} },
        { label: 'Forward', shortcut: 'Ctrl+Alt+Right', action: () => {} },
        { label: 'Declaration', shortcut: 'Ctrl+B', action: () => {} },
        { label: 'Implementation(s)', shortcut: 'Ctrl+Alt+B', action: () => {} },
        { label: 'Type Declaration', shortcut: 'Ctrl+Shift+B', action: () => {} },
        { label: 'Super Method', shortcut: 'Ctrl+U', action: () => {} },
        { label: 'Test', shortcut: 'Ctrl+Shift+T', action: () => triggerCargo('test') },
        { divider: true, label: '' },
        { label: 'Call Hierarchy', shortcut: 'Ctrl+Alt+H', action: () => {} },
        { label: 'Method Hierarchy', shortcut: 'Ctrl+Shift+H', action: () => {} },
        { label: 'Type Hierarchy', shortcut: 'Ctrl+H', action: () => {} },
        { label: 'File Structure Popup', shortcut: 'Ctrl+F12', action: () => {} },
      ]
    },
    {
      title: 'Code',
      items: [
        {
          label: 'Generate...',
          shortcut: 'Alt+Insert',
          children: [
            { label: 'Constructor', action: () => {} },
            { label: 'Getter & Setter', action: () => {} },
            { label: 'ToString / Display', action: () => {} },
            { label: 'Equals and HashCode', action: () => {} },
            { label: 'Override Methods...', action: () => {} },
            { label: 'Implement Methods...', action: () => {} },
            { label: 'Delegate Methods...', action: () => {} },
            { label: 'Test Function', action: () => {} },
            { label: 'Rust: Derive Macro', action: () => {} },
            { label: 'Rust: Impl Block', action: () => {} },
          ]
        },
        { label: 'Override Methods...', shortcut: 'Ctrl+O', action: () => {} },
        { label: 'Implement Methods...', shortcut: 'Ctrl+I', action: () => {} },
        {
          label: 'Surround With...',
          shortcut: 'Ctrl+Alt+T',
          children: [
            { label: 'if / else', action: () => {} },
            { label: 'while', action: () => {} },
            { label: 'match {}', action: () => {} },
            { label: 'unsafe {}', action: () => {} },
            { label: 'loop {}', action: () => {} },
          ]
        },
        { divider: true, label: '' },
        { label: 'Comment with Line Comment', shortcut: 'Ctrl+/', action: () => {} },
        { label: 'Comment with Block Comment', shortcut: 'Ctrl+Shift+/', action: () => {} },
        { label: 'Reformat Code', shortcut: 'Ctrl+Alt+L', action: () => triggerCargo('fmt') },
        { label: 'Optimize Imports', shortcut: 'Ctrl+Alt+O', action: () => {} },
        { label: 'Auto-Indent Lines', shortcut: 'Ctrl+Alt+I', action: () => {} },
        { divider: true, label: '' },
        { label: 'Inspect Code...', action: () => triggerCargo('clippy') },
        { label: 'Run Inspection by Name...', action: () => {} },
      ]
    },
    {
      title: 'Refactor',
      items: [
        { label: 'Refactor This...', shortcut: 'Ctrl+Alt+Shift+T', action: () => {} },
        { divider: true, label: '' },
        { label: 'Rename...', shortcut: 'Shift+F6', action: () => {} },
        { label: 'Change Signature...', shortcut: 'Ctrl+F6', action: () => {} },
        { label: 'Type Migration...', action: () => {} },
        { label: 'Move...', shortcut: 'F6', action: () => {} },
        { label: 'Copy...', shortcut: 'F5', action: () => {} },
        { label: 'Safe Delete...', shortcut: 'Alt+Delete', action: () => {} },
        {
          label: 'Extract',
          children: [
            { label: 'Variable', shortcut: 'Ctrl+Alt+V', action: () => {} },
            { label: 'Field', shortcut: 'Ctrl+Alt+F', action: () => {} },
            { label: 'Constant', shortcut: 'Ctrl+Alt+C', action: () => {} },
            { label: 'Parameter', shortcut: 'Ctrl+Alt+P', action: () => {} },
            { label: 'Function / Method', shortcut: 'Ctrl+Alt+M', action: () => {} },
          ]
        },
        { label: 'Inline...', shortcut: 'Ctrl+Alt+N', action: () => {} },
        { label: 'Invert Boolean', action: () => {} },
        { label: 'Split If', action: () => {} },
        { label: 'Merge Ifs', action: () => {} },
      ]
    },
    {
      title: 'Build',
      items: [
        { label: 'Build Project', shortcut: 'Ctrl+F9', icon: RefreshCw, action: () => triggerCargo('run') },
        { label: 'Rebuild Project', action: () => triggerCargo('run') },
        { label: 'Cargo Check', shortcut: 'Shift+F10', action: () => triggerCargo('check') },
        { label: 'Cargo Clippy', action: () => triggerCargo('clippy') },
        { label: 'Compile', action: () => triggerCargo('run') },
        { label: 'Clean Project', action: () => triggerCargo('clean') },
        { label: 'Build Artifacts', action: () => triggerCargo('run') },
      ]
    },
    {
      title: 'Run',
      items: [
        { label: "Run 'Cargo run'", shortcut: 'Shift+F10', icon: Play, action: () => triggerCargo('run') },
        { label: "Debug 'Cargo run'", shortcut: 'Shift+F9', icon: Bug, action: () => startDebugging('lldb') },
        { label: 'Run Context Configuration', shortcut: 'Ctrl+Shift+F10', action: () => triggerCargo('run') },
        { label: 'Debug Context Configuration', shortcut: 'Ctrl+Shift+F9', action: () => startDebugging('lldb') },
        { label: 'Stop', shortcut: 'Ctrl+F2', action: () => stopDebugging() },
        { divider: true, label: '' },
        { label: 'Resume Program', shortcut: 'F9', action: () => resumeExecution() },
        { label: 'Pause Program', action: () => pauseExecution() },
        { label: 'Step Over', shortcut: 'F8', action: () => stepOver() },
        { label: 'Step Into', shortcut: 'F7', action: () => stepInto() },
        { label: 'Step Out', shortcut: 'Shift+F8', action: () => stepOut() },
        { divider: true, label: '' },
        { label: 'View Breakpoints...', shortcut: 'Ctrl+Shift+F8', action: () => {} },
        { label: 'Mute Breakpoints', action: () => {} },
        { label: 'Run with Coverage', action: () => {} },
        { label: 'Profile...', action: () => {} },
      ]
    },
    {
      title: 'Tools',
      items: [
        {
          label: 'Cargo',
          children: [
            { label: 'Build', action: () => triggerCargo('run') },
            { label: 'Run', action: () => triggerCargo('run') },
            { label: 'Test', action: () => triggerCargo('test') },
            { label: 'Check', action: () => triggerCargo('check') },
            { label: 'Clippy', action: () => triggerCargo('clippy') },
            { label: 'Fmt', action: () => triggerCargo('fmt') },
            { label: 'Doc', action: () => triggerCargo('doc') },
            { label: 'Clean', action: () => triggerCargo('clean') },
            { label: 'Add Dependency...', action: () => {} },
            { label: 'Reload Project', action: () => {} },
          ]
        },
        {
          label: 'Rust',
          children: [
            { label: 'Expand Macro Recursively', action: () => {} },
            { label: 'Show MIR (Mid-level IR)', action: () => {} },
            { label: 'Show HIR (High-level IR)', action: () => {} },
            { label: 'Rustfmt File', action: () => triggerCargo('fmt') },
            { label: 'Rustfmt Project', action: () => triggerCargo('fmt') },
            { label: 'Rust REPL', action: () => {} },
            { label: 'Share in Playground', action: () => {} },
          ]
        },
        {
          label: 'Hardware & Debuggers',
          icon: Cpu,
          children: [
            { label: 'probe-rs: STM32F4 Flash & Run', action: () => startDebugging('probe_rs') },
            { label: 'OpenOCD GDB Server', action: () => startDebugging('openocd') },
            { label: 'QEMU Cortex-M Emulator', action: () => startDebugging('qemu') },
          ]
        },
        {
          label: 'MQTT 5.0 Terminal',
          icon: Globe,
          action: () => {}
        },
        {
          label: 'Docker',
          children: [
            { label: 'Connect to Docker', action: () => {} },
            { label: 'Build Image', action: () => {} },
            { label: 'Run Container', action: () => {} },
          ]
        },
      ]
    },
    {
      title: 'VCS',
      items: [
        { label: 'Update Project...', shortcut: 'Ctrl+T', icon: RefreshCw, action: () => {} },
        { label: 'Commit...', shortcut: 'Ctrl+K', icon: Shield, action: () => {} },
        { label: 'Push...', shortcut: 'Ctrl+Shift+K', action: () => {} },
        { label: 'Pull...', action: () => {} },
        {
          label: 'Branches...',
          icon: GitBranch,
          children: [
            { label: 'New Branch...', action: () => {} },
            { label: 'Checkout...', action: () => {} },
            { label: 'Merge...', action: () => {} },
            { label: 'Rebase...', action: () => {} },
          ]
        },
        { divider: true, label: '' },
        { label: 'Stash Changes...', action: () => {} },
        { label: 'Unstash Changes...', action: () => {} },
        { label: 'Show Git History', shortcut: 'Alt+9', action: () => {} },
        { label: 'Compare with Branch...', action: () => {} },
        { label: 'Compare with Clipboard', action: () => {} },
        { label: 'Rollback Changes...', action: () => {} },
      ]
    },
    {
      title: 'Window',
      items: [
        { label: 'Split Vertically', action: () => {} },
        { label: 'Split Horizontally', action: () => {} },
        { label: 'Unsplit', action: () => {} },
        { label: 'Unsplit All', action: () => {} },
        { divider: true, label: '' },
        { label: 'Restore Default Layout', action: () => {} },
        { label: 'Store Current Layout as Default', action: () => {} },
        { label: 'Minimize Current Window', action: () => {} },
        { label: 'Zoom Current Window', action: () => {} },
      ]
    },
    {
      title: 'Help',
      items: [
        { label: 'Help Contents', shortcut: 'F1', icon: HelpCircle, action: () => {} },
        { label: 'Tip of the Day', action: () => {} },
        { label: 'What\'s New in RustRover 2026.2', action: () => {} },
        { label: 'Keymap Reference', action: () => {} },
        { divider: true, label: '' },
        { label: 'Check for Updates...', action: () => {} },
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
              onClick={() => {
                setOpenMenu(isOpen ? null : menu.title);
                setActiveSubmenu(null);
              }}
              onMouseEnter={() => {
                if (openMenu !== null) {
                  setOpenMenu(menu.title);
                  setActiveSubmenu(null);
                }
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
              <div className="absolute top-full left-0 mt-0.5 min-w-[240px] bg-[#2b2d30] border border-[#393b40] rounded-md shadow-2xl py-1 text-[#dfe1e5] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                {menu.items.map((item, idx) => {
                  if (item.divider) {
                    return <div key={idx} className="my-1 border-t border-[#393b40]" />;
                  }

                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isSubOpen = activeSubmenu === item.label;

                  return (
                    <div
                      key={idx}
                      className="relative"
                      onMouseEnter={() => {
                        if (hasChildren) setActiveSubmenu(item.label);
                        else setActiveSubmenu(null);
                      }}
                    >
                      <button
                        onClick={() => {
                          if (item.action) {
                            item.action();
                            setOpenMenu(null);
                            setActiveSubmenu(null);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#3574f0] hover:text-white flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          {Icon ? (
                            <Icon className="w-3.5 h-3.5 text-ide-text/60 group-hover:text-white shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {item.shortcut && (
                            <span className="text-[10px] text-[#868a91] group-hover:text-white/80 font-mono">
                              {item.shortcut}
                            </span>
                          )}
                          {hasChildren && (
                            <ChevronRight className="w-3 h-3 text-[#868a91] group-hover:text-white" />
                          )}
                        </div>
                      </button>

                      {/* Nested Submenu */}
                      {hasChildren && isSubOpen && (
                        <div className="absolute top-0 left-full ml-0.5 min-w-[220px] bg-[#2b2d30] border border-[#393b40] rounded-md shadow-2xl py-1 text-[#dfe1e5] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                          {item.children?.map((subItem, sIdx) => {
                            if (subItem.divider) {
                              return <div key={sIdx} className="my-1 border-t border-[#393b40]" />;
                            }
                            return (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  if (subItem.action) {
                                    subItem.action();
                                  }
                                  setOpenMenu(null);
                                  setActiveSubmenu(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#3574f0] hover:text-white flex items-center justify-between group transition-colors cursor-pointer"
                              >
                                <span className="truncate">{subItem.label}</span>
                                {subItem.shortcut && (
                                  <span className="text-[10px] text-[#868a91] group-hover:text-white/80 font-mono ml-4">
                                    {subItem.shortcut}
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
            )}
          </div>
        );
      })}
    </div>
  );
}
