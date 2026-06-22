import { Folder, FolderOpen, FileCode2, ChevronRight, ChevronDown } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { FileTreeNode as FileNodeType } from '../../types/api';
import { cn } from '../../utils/theme';

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

  return (
    <div className="flex flex-col select-none">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "flex items-center text-xs py-1 hover:bg-ide-hover transition-colors text-left rounded cursor-pointer mb-[1px]",
          isSelected && !node.isDirectory ? "bg-ide-selection text-white font-medium" : "text-ide-text"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDirectory ? (
          isOpen ? <ChevronDown className="w-3.5 h-3.5 mr-1 text-ide-text/50" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-ide-text/50" />
        ) : (
          <span className="w-4.5" />
        )}
        {node.isDirectory ? (
          isOpen ? <FolderOpen className="w-3.5 h-3.5 mr-2 text-ide-function" /> : <Folder className="w-3.5 h-3.5 mr-2 text-ide-function" />
        ) : (
          <FileCode2 className="w-3.5 h-3.5 mr-2 text-ide-keyword" />
        )}
        <span className="truncate">{node.name}</span>
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
