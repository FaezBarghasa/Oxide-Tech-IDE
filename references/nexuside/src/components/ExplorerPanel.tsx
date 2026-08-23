import React from "react";
import { FileSystemMap } from "../types";

interface ExplorerPanelProps {
  files: FileSystemMap;
  currentFile: string;
  onSelectFile: (path: string) => void;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
}

export default function ExplorerPanel({
  files,
  currentFile,
  onSelectFile,
  expandedFolders,
  onToggleFolder,
}: ExplorerPanelProps) {
  
  // Recursively render node trees
  const renderNode = (nodePath: string, depth: number = 0) => {
    const node = files[nodePath];
    if (!node) return null;

    const isFolder = node.isFolder;
    const isExpanded = expandedFolders[nodePath];
    const isActive = currentFile === nodePath;

    // Define custom icon styles or icon identifiers
    let iconName = node.icon;
    let iconClass = "text-outline";
    
    if (isFolder) {
      iconName = isExpanded ? "folder_open" : "folder";
      iconClass = "text-primary";
    } else {
      if (node.name.endsWith(".rs")) {
        iconName = "data_object";
        iconClass = "text-rust-orange";
      } else if (node.name.endsWith(".toml")) {
        iconName = "description";
        iconClass = "text-toml-red";
      } else if (node.name.endsWith(".lock")) {
        iconName = "lock";
        iconClass = "text-amber-500";
      } else if (node.name.endsWith(".css")) {
        iconName = "css";
        iconClass = "text-cyan-400";
      } else if (node.name.endsWith(".tsx")) {
        iconName = "code";
        iconClass = "text-blue-400";
      }
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFolder) {
        onToggleFolder(nodePath);
      } else {
        onSelectFile(nodePath);
      }
    };

    return (
      <div key={nodePath} className="select-none font-mono text-[11.5px]">
        {/* Row element */}
        <div
          onClick={handleClick}
          style={{ paddingLeft: `${Math.max(8, depth * 12)}px` }}
          className={`flex items-center gap-1.5 py-[3px] pr-2 hover:bg-surface-variant/30 cursor-pointer text-on-surface transition-colors ${
            isActive ? "bg-primary/20 text-on-surface font-semibold border-l-2 border-primary" : "text-on-surface-variant"
          }`}
        >
          {isFolder ? (
            <span className="material-symbols-outlined text-[14px] text-outline">
              {isExpanded ? "expand_more" : "chevron_right"}
            </span>
          ) : (
            <span className="w-[14px] shrink-0"></span>
          )}

          <span className={`material-symbols-outlined text-[14px] ${iconClass}`}>
            {iconName}
          </span>

          <span className="truncate">{node.name}</span>

          {nodePath === "oxide-plugin-intellij" && (
            <span className="text-outline-variant ml-1 text-[9px] font-sans">
              [oxide-plugin-intellij]
            </span>
          )}
        </div>

        {/* Children render */}
        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map((childPath) => renderNode(childPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[260px] bg-surface-container-low border-r border-outline-variant flex flex-col shrink-0 overflow-hidden">
      <div className="h-8 px-3 flex items-center justify-between font-body-sm text-[12px] font-semibold text-on-surface border-b border-outline-variant/30 bg-surface">
        <div className="flex items-center gap-1 cursor-pointer">
          <span>Project</span>
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Collapse all folders")}
            className="text-outline hover:text-on-surface transition-colors"
            title="Collapse All"
          >
            <span className="material-symbols-outlined text-[14px]">visibility</span>
          </button>
          <button 
            onClick={() => alert("Filter workspace items...")}
            className="text-outline hover:text-on-surface transition-colors"
            title="Filter View"
          >
            <span className="material-symbols-outlined text-[14px]">filter_alt</span>
          </button>
          <button 
            onClick={() => alert("Project tree settings preferences")}
            className="text-outline hover:text-on-surface transition-colors"
            title="Tree Settings"
          >
            <span className="material-symbols-outlined text-[14px]">settings</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 font-code-md text-[11.5px] leading-[22px]">
        {renderNode("oxide-plugin-intellij")}
        
        {/* Virtual additions matching the layout */}
        <div className="flex items-center gap-1.5 px-2 py-1 mt-2 text-outline hover:bg-surface-variant/30 cursor-pointer">
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="material-symbols-outlined text-[14px]">library_books</span>
          <span className="truncate">External Libraries</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 text-outline hover:bg-surface-variant/30 cursor-pointer">
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="material-symbols-outlined text-[14px]">edit_note</span>
          <span className="truncate">Scratches and Consoles</span>
        </div>
      </div>
    </aside>
  );
}
