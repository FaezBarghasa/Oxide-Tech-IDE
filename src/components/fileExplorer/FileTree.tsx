import { useEffect, useState } from 'react';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { FileTreeNode } from './FileTreeNode';
import { FileContextMenu } from './FileContextMenu';
import { FileTreeNode as FileNodeType } from '../../types/api';
import { RefreshCw, FolderPlus } from 'lucide-react';

export function FileTree() {
  const { tree, reloadTree, workspaceRoot } = useFileSystemStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetPath: string;
    isDirectory: boolean;
  } | null>(null);

  useEffect(() => {
    reloadTree();
  }, [workspaceRoot, reloadTree]);

  const handleContextMenu = (e: React.MouseEvent, node: FileNodeType) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPath: node.path,
      isDirectory: node.isDirectory,
    });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPath: workspaceRoot,
      isDirectory: true,
    });
  };

  return (
    <div className="flex flex-col h-full text-ide-text" onContextMenu={handleRootContextMenu}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-ide-border select-none shrink-0 bg-ide-panel/30">
        <span className="text-[10px] text-white font-medium uppercase tracking-wider">Workspace</span>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setContextMenu({ x: 100, y: 100, targetPath: workspaceRoot, isDirectory: true })}
            title="New File/Folder in Root"
            className="text-ide-text hover:text-white transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => reloadTree()}
            title="Refresh Explorer"
            className="text-ide-text hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="text-xs text-ide-text/40 text-center py-4 select-none">Empty Workspace</div>
        ) : (
          <div className="flex flex-col space-y-[2px]">
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetPath={contextMenu.targetPath}
          isDirectory={contextMenu.isDirectory}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
