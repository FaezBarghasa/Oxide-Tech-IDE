import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { 
  Search, FileCode, Play, Settings, Sparkles, 
  Box, CornerDownLeft, LucideIcon
} from 'lucide-react';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { tauriCommands } from '../../services/tauri';
import { FileTreeNode } from '../../types/api';

type SearchTab = 'all' | 'classes' | 'files' | 'symbols' | 'actions' | 'ai';

interface SearchItem {
  id: string;
  type: 'file' | 'class' | 'symbol' | 'action' | 'ai';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: LucideIcon;
  action: () => void | Promise<void>;
}

function flattenTree(nodes: FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  function traverse(list: FileTreeNode[]) {
    for (const node of list) {
      if (!node.isDirectory) {
        result.push(node);
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return result;
}

export function SearchEverywhereOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tree, workspaceRoot } = useFileSystemStore();
  const { openFile } = useEditorStore();
  const { setActiveOverlay } = useSettingsStore();
  const { setBuildStatus, setDiagnostics } = useCompilationStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const flatFiles = useMemo(() => flattenTree(tree), [tree]);

  // Generate Search Index Items
  const items: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];

    // 1. Files
    flatFiles.forEach((f) => {
      list.push({
        id: `file-${f.path}`,
        type: 'file',
        title: f.name,
        subtitle: f.path,
        icon: FileCode,
        action: async () => {
          await openFile(f.path);
          onClose();
        },
      });
    });

    // 2. Actions
    const actions: SearchItem[] = [
      {
        id: 'action-cargo-run',
        type: 'action',
        title: 'Cargo: Run Project',
        subtitle: 'Build and run target application',
        shortcut: 'Shift+F10',
        icon: Play,
        action: async () => {
          onClose();
          setBuildStatus('running');
          await tauriCommands.executeTerminalCommand('cargo run', workspaceRoot || '.');
          setBuildStatus('success');
        },
      },
      {
        id: 'action-cargo-check',
        type: 'action',
        title: 'Cargo: Check Workspace',
        subtitle: 'Run fast rustc typecheck',
        shortcut: 'Ctrl+F9',
        icon: Box,
        action: async () => {
          onClose();
          setBuildStatus('running');
          const resJSON = await tauriCommands.spawnCargoCheck(workspaceRoot || '.');
          try {
            const res = JSON.parse(resJSON);
            setDiagnostics(res.diagnostics || []);
          } catch {
            setDiagnostics([]);
          }
          setBuildStatus('success');
        },
      },
      {
        id: 'action-cargo-clippy',
        type: 'action',
        title: 'Cargo: Run Clippy Linter',
        subtitle: 'Run idiomatic Rust lints with clippy',
        shortcut: 'Alt+Shift+C',
        icon: Box,
        action: async () => {
          onClose();
          setBuildStatus('running');
          const resJSON = await tauriCommands.spawnCargoClippy(workspaceRoot || '.');
          try {
            const res = JSON.parse(resJSON);
            setDiagnostics(res.diagnostics || []);
          } catch {
            setDiagnostics([]);
          }
          setBuildStatus('success');
        },
      },
      {
        id: 'action-open-settings',
        type: 'action',
        title: 'Open Settings / Preferences',
        subtitle: 'Configure Oxide IDE, keymaps, and AI providers',
        shortcut: 'Ctrl+Alt+S',
        icon: Settings,
        action: () => {
          onClose();
          setActiveOverlay('settings');
        },
      },
      {
        id: 'action-open-ai',
        type: 'action',
        title: 'Oxide AI: Prompt Assistant',
        subtitle: 'Engage pair programmer and context reasoning',
        shortcut: 'Ctrl+\\',
        icon: Sparkles,
        action: () => {
          onClose();
          setActiveOverlay('prompt');
        },
      },
    ];

    list.push(...actions);
    return list;
  }, [flatFiles, openFile, onClose, setBuildStatus, setDiagnostics, workspaceRoot, setActiveOverlay]);

  // Filter items by tab
  const tabFilteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'files' && item.type === 'file') return true;
      if (activeTab === 'actions' && item.type === 'action') return true;
      if (activeTab === 'ai' && (item.type === 'ai' || item.id === 'action-open-ai')) return true;
      return false;
    });
  }, [items, activeTab]);

  // Fuzzy Search with Fuse.js
  const fuse = useMemo(() => {
    return new Fuse(tabFilteredItems, {
      keys: ['title', 'subtitle', 'shortcut'],
      threshold: 0.35,
    });
  }, [tabFilteredItems]);

  const searchResults: SearchItem[] = useMemo(() => {
    return query.trim()
      ? fuse.search(query).map((res) => res.item)
      : tabFilteredItems.slice(0, 15);
  }, [fuse, query, tabFilteredItems]);

  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const tabs: SearchTab[] = ['all', 'classes', 'files', 'symbols', 'actions', 'ai'];
      const curIdx = tabs.indexOf(activeTab);
      const nextIdx = e.shiftKey ? (curIdx - 1 + tabs.length) % tabs.length : (curIdx + 1) % tabs.length;
      setActiveTab(tabs[nextIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-100 select-none">
      <div 
        className="w-[660px] bg-[#1e1f22] border border-[#393b40] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar with JetBrains Tabs */}
        <div className="border-b border-[#2b2d30] px-3 pt-2.5 bg-[#26282d] flex items-center justify-between">
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'classes', label: 'Classes / Structs' },
              { key: 'files', label: 'Files' },
              { key: 'symbols', label: 'Symbols' },
              { key: 'actions', label: 'Actions' },
              { key: 'ai', label: 'Oxide AI' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as SearchTab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors cursor-pointer ${
                  activeTab === t.key
                    ? 'bg-[#1e1f22] text-[#dfe1e5] border-t-2 border-[#3574f0]'
                    : 'text-[#868a91] hover:text-[#dfe1e5] hover:bg-[#2b2d30]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-[#6f737a] flex items-center space-x-1 pb-1">
            <span>Tab / Shift+Tab to switch tabs</span>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="p-3 border-b border-[#2b2d30] flex items-center space-x-2.5 bg-[#1e1f22]">
          <Search className="w-4 h-4 text-[#868a91] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everywhere (Double Shift)..."
            className="w-full bg-transparent text-sm text-[#dfe1e5] placeholder-[#6f737a] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#868a91] hover:text-white px-1.5 py-0.5 rounded bg-[#2b2d30]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto py-1 bg-[#1e1f22]">
          {searchResults.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6f737a]">
              No matching items found for <span className="text-[#dfe1e5]">"{query}"</span>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3.5 py-2 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-[#2e436e] text-white' : 'text-[#dfe1e5] hover:bg-[#2b2d30]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.type === 'action'
                          ? 'text-[#3574f0]'
                          : item.type === 'ai'
                          ? 'text-[#a074c4]'
                          : 'text-[#868a91]'
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className={`ml-2 text-[11px] truncate ${isSelected ? 'text-blue-200' : 'text-[#868a91]'}`}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                        isSelected 
                          ? 'bg-blue-800/60 border-blue-600 text-blue-100' 
                          : 'bg-[#2b2d30] border-[#393b40] text-[#868a91]'
                      }`}>
                        {item.shortcut}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft className="w-3 h-3 text-white/70" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="h-7 border-t border-[#2b2d30] bg-[#1a1b1d] px-3 flex items-center justify-between text-[11px] text-[#6f737a]">
          <div className="flex items-center space-x-3">
            <span><strong className="text-[#868a91]">↑↓</strong> Navigate</span>
            <span><strong className="text-[#868a91]">↵</strong> Select</span>
            <span><strong className="text-[#868a91]">Esc</strong> Close</span>
          </div>
          <div>
            <span>JetBrains Search Everywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
}
