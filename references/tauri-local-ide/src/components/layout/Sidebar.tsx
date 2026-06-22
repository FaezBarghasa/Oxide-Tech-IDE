import React, { useEffect, useState } from 'react';
import { getRepositoryStructure } from '../../services/api';
import { FileTreeNode } from '../../types';
import { Folder, FolderOpen, FileCode2, ChevronRight, ChevronDown } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { readFile } from '../../services/tauri';
import { cn } from '../../utils/theme';

function FileTreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number; key?: React.Key }) {
  const [isOpen, setIsOpen] = useState(false);
  const openFile = useEditorStore(state => state.openFile);
  const currentFile = useEditorStore(state => state.currentFile);
  
  const isSelected = currentFile === node.path;
  
  const handleClick = async () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      try {
        const content = await readFile(node.path);
        openFile(node.path, content);
      } catch (e) {
        console.error("Failed to read file", e);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <button 
        onClick={handleClick}
        className={cn(
          "flex items-center text-xs py-1 px-2 hover:bg-darcula-bg transition-colors text-left rounded mb-[1px]",
          isSelected && !node.isDirectory ? "bg-darcula-selection text-white" : "text-darcula-text"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDirectory ? (
          isOpen ? <ChevronDown className="w-3.5 h-3.5 mr-1 text-darcula-text/50" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-darcula-text/50" />
        ) : (
          <span className="w-4 h-4 mr-1 inline-block" />
        )}
        
        {node.isDirectory ? (
           isOpen ? <FolderOpen className="w-3.5 h-3.5 mr-2 text-darcula-accent" /> : <Folder className="w-3.5 h-3.5 mr-2 text-darcula-accent" />
        ) : (
           <FileCode2 className="w-3.5 h-3.5 mr-2 text-darcula-accent" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      
      {node.isDirectory && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map(child => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTree() {
      const res = await getRepositoryStructure('/workspace');
      if (res.success) {
        setTree(res.tree);
      }
      setLoading(false);
    }
    loadTree();
  }, []);

  return (
    <div className="flex flex-col h-full bg-darcula-toolwindow">
      <div className="p-3 text-[10px] font-bold text-darcula-text/50 uppercase tracking-wider flex justify-between">
        <span>Explorer</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <div className="px-4 text-[11px] text-darcula-text/50 font-medium tracking-wide">Loading workspace...</div>
        ) : (
          tree.map(node => <FileTreeItem key={node.path} node={node} />)
        )}
      </div>
    </div>
  );
}
