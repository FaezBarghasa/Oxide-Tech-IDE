import { Folder, FolderOpen, FileCode2, ChevronRight, ChevronDown, Box, Braces, FileText } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { FileTreeNode as FileNodeType } from '../../types/api';
import { cn } from '../../utils/theme';

const RustIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#e05d44] fill-none shrink-0" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="7" />
    <path d="M12 9v6M9 12h6" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);

const TSIcon = () => (
  <div className="w-3.5 h-3.5 bg-[#3178c6] text-white flex items-center justify-center font-bold text-[8px] rounded-sm select-none font-mono shrink-0">
    TS
  </div>
);

const TSXIcon = () => (
  <div className="w-3.5 h-3.5 bg-[#2f74c0] text-white flex items-center justify-center font-bold text-[7px] rounded-sm select-none font-mono px-0.5 shrink-0">
    TSX
  </div>
);

interface FileTreeNodeProps {
  node: FileNodeType;
  depth: number;
  onContextMenu: (e: React.MouseEvent, node: FileNodeType) => void;
}

export function FileTreeNode({ node, depth, onContextMenu }: FileTreeNodeProps) {
  const { openFile, currentFile } = useEditorStore();
  const { expandedFolders, toggleFolder } = useFileSystemStore();

  const isSelected = currentFile === node.path;
  const isOpen = expandedFolders.includes(node.path);

  const handleClick = async () => {
    if (node.isDirectory) {
      toggleFolder(node.path);
    } else {
      try {
        const content = await tauriCommands.readFile(node.path);
        openFile(node.path, content);
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.rs')) return <RustIcon />;
    if (filename.endsWith('Cargo.toml')) return <Box className="w-3.5 h-3.5 text-[#cc7832] shrink-0" />;
    if (filename.endsWith('.tsx')) return <TSXIcon />;
    if (filename.endsWith('.ts')) return <TSIcon />;
    if (filename.endsWith('.json')) return <Braces className="w-3.5 h-3.5 text-[#d0a33c] shrink-0" />;
    if (filename.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-[#4ea1f7] shrink-0" />;
    return <FileCode2 className="w-3.5 h-3.5 text-ide-text/70 shrink-0" />;
  };

  return (
    <div className="flex flex-col select-none">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "w-full flex items-center text-xs py-1 hover:bg-ide-hover transition-colors text-left rounded cursor-pointer mb-[1px] pr-2 relative group",
          isSelected && !node.isDirectory 
            ? "bg-ide-selection text-white font-medium border-l-2 border-ide-keyword" 
            : "text-ide-text"
        )}
        style={{ paddingLeft: `${depth * 12 + (isSelected && !node.isDirectory ? 6 : 8)}px` }}
      >
        {node.isDirectory ? (
          isOpen ? (
            <ChevronDown className="w-3 h-3 mr-1 text-ide-text/50 shrink-0 transition-transform duration-150" />
          ) : (
            <ChevronRight className="w-3 h-3 mr-1 text-ide-text/50 shrink-0 transition-transform duration-150" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        
        <span className="mr-2">
          {node.isDirectory ? (
            isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-ide-function shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-ide-function shrink-0" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        <span className="truncate flex-1 font-sans text-white/95 group-hover:text-white transition-colors">
          {node.name}
        </span>
      </button>
      
      {node.isDirectory && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

