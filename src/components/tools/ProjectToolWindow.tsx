import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { useEditorStore } from '../../state/editorStore';
import { tauriCommands } from '../../services/tauri';
import { FileTreeNode as FileNodeType } from '../../types/api';
import {
  Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown,
  RefreshCw, FolderPlus, Minimize2, Search
} from 'lucide-react';

interface FlatTreeItem {
  id: string;
  name: string;
  path: string;
  depth: number;
  isDirectory: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
}

export function ProjectToolWindow() {
  const { tree, reloadTree, workspaceRoot, expandedFolders, toggleFolder } = useFileSystemStore();
  const { openFile, currentFile } = useEditorStore();

  const [vcsStatuses, setVcsStatuses] = useState<Record<string, string>>({});
  const [speedSearchText, setSpeedSearchText] = useState('');
  const [isSpeedSearchActive, setIsSpeedSearchActive] = useState(false);
  const [scope, setScope] = useState<'project' | 'changed' | 'open'>('project');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const speedSearchInputRef = useRef<HTMLInputElement>(null);

  // Fetch detailed Git statuses
  useEffect(() => {
    async function loadVcs() {
      try {
        const statuses = await tauriCommands.vcsGetDetailedStatus(workspaceRoot);
        const map: Record<string, string> = {};
        for (const s of statuses) {
          map[s.path] = s.status;
          const normalized = s.path.replace(/^\.\//, '');
          map[normalized] = s.status;
        }
        setVcsStatuses(map);
      } catch (err) {
        console.warn('VCS status load skipped:', err);
      }
    }
    loadVcs();
  }, [workspaceRoot, tree]);

  // Flatten the tree for virtualization
  const flatItems = useMemo(() => {
    const list: FlatTreeItem[] = [];

    function flatten(nodes: FileNodeType[], depth: number) {
      for (const node of nodes) {
        const isExpanded = expandedFolders.includes(node.path);
        const hasChildren = !!(node.isDirectory && node.children && node.children.length > 0);

        // Apply Speed Search filter if active
        if (speedSearchText) {
          const match = node.name.toLowerCase().includes(speedSearchText.toLowerCase());
          if (!match && !node.isDirectory) {
            continue;
          }
        }

        list.push({
          id: node.path,
          name: node.name,
          path: node.path,
          depth,
          isDirectory: node.isDirectory,
          isExpanded,
          hasChildren,
        });

        if (node.isDirectory && isExpanded && node.children) {
          flatten(node.children, depth + 1);
        }
      }
    }

    flatten(tree, 0);
    return list;
  }, [tree, expandedFolders, speedSearchText]);

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 22,
    overscan: 10,
  });

  // Handle Speed Search key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSpeedSearchActive(false);
      setSpeedSearchText('');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setIsSpeedSearchActive(true);
      setTimeout(() => speedSearchInputRef.current?.focus(), 50);
      return;
    }

    // Direct typing triggers Speed Search
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      setIsSpeedSearchActive(true);
      setSpeedSearchText((prev) => prev + e.key);
      setTimeout(() => speedSearchInputRef.current?.focus(), 50);
    }
  };

  const getFileIcon = (name: string, isDirectory: boolean, isExpanded: boolean) => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-[#3574f0] shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-[#3574f0] shrink-0" />
      );
    }

    if (name.endsWith('.rs')) {
      return <FileCode className="w-4 h-4 text-[#e06c75] shrink-0" />;
    }
    if (name.endsWith('.toml')) {
      return <FileText className="w-4 h-4 text-[#98c379] shrink-0" />;
    }
    if (name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.tsx')) {
      return <FileCode className="w-4 h-4 text-[#61afef] shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-[#abb2bf] shrink-0" />;
  };

  const getVcsColorClass = (path: string) => {
    const cleanPath = path.replace(/^\.\//, '');
    const status = vcsStatuses[cleanPath] || vcsStatuses[path];

    if (status === 'untracked' || status === 'added') {
      return 'text-[#629755] font-medium'; // JetBrains Green
    }
    if (status === 'modified') {
      return 'text-[#6897bb] font-medium'; // JetBrains Blue
    }
    if (status === 'conflict') {
      return 'text-[#e06c75] font-bold'; // JetBrains Red
    }
    if (status === 'ignored') {
      return 'text-[#707278] opacity-60'; // JetBrains Gray
    }
    return 'text-[#dfe1e5]';
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] select-none font-sans text-xs outline-none relative"
    >
      {/* Project Toolbar & Scope Selector */}
      <div className="h-7 px-2 border-b border-[#2b2d30] flex items-center justify-between shrink-0 bg-[#2b2d30]/50">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          className="bg-transparent text-[11px] font-semibold text-white/90 focus:outline-none cursor-pointer"
        >
          <option value="project" className="bg-[#1e1f22] text-white">Project Files</option>
          <option value="open" className="bg-[#1e1f22] text-white">Open Files</option>
          <option value="changed" className="bg-[#1e1f22] text-white">Changed Files</option>
        </select>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => reloadTree()}
            title="Refresh Project Tree (Ctrl+Alt+Y)"
            className="p-1 hover:bg-[#393b40] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => useFileSystemStore.setState({ expandedFolders: [] })}
            title="Collapse All"
            className="p-1 hover:bg-[#393b40] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            title="New File/Directory"
            className="p-1 hover:bg-[#393b40] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Virtualized Tree List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-1">
        {flatItems.length === 0 ? (
          <div className="text-[11px] text-[#868a91] text-center py-6">
            {speedSearchText ? 'No matching files found' : 'Workspace Empty'}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = flatItems[virtualRow.index];
              const isSelected = currentFile === item.path;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.isDirectory) {
                      toggleFolder(item.path);
                    } else {
                      openFile(item.path);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingLeft: `${item.depth * 14 + 6}px`,
                  }}
                  className={`flex items-center space-x-1.5 pr-2 py-0.5 rounded cursor-pointer group text-[11px] transition-colors ${
                    isSelected
                      ? 'bg-[#2e436e] text-white font-medium'
                      : 'hover:bg-[#2b2d30] text-[#dfe1e5]'
                  }`}
                >
                  {/* Chevron for folder */}
                  {item.isDirectory ? (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#868a91] shrink-0">
                      {item.isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </span>
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}

                  {/* Icon */}
                  {getFileIcon(item.name, item.isDirectory, item.isExpanded)}

                  {/* Name with VCS Color */}
                  <span className={`truncate ${getVcsColorClass(item.path)}`}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Speed Search Floating Overlay */}
      {isSpeedSearchActive && (
        <div className="absolute bottom-2 right-2 bg-[#2b2d30] border border-[#3574f0] rounded-md shadow-2xl p-1.5 flex items-center space-x-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
          <Search className="w-3.5 h-3.5 text-[#3574f0]" />
          <input
            ref={speedSearchInputRef}
            type="text"
            value={speedSearchText}
            onChange={(e) => setSpeedSearchText(e.target.value)}
            placeholder="Speed search..."
            className="bg-transparent border-none text-[11px] text-white focus:outline-none w-36 font-sans"
          />
          <button
            onClick={() => {
              setIsSpeedSearchActive(false);
              setSpeedSearchText('');
            }}
            className="text-[10px] text-[#868a91] hover:text-white px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
