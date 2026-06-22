import { useEffect, useRef, useState } from 'react';
import { useFileSystem } from './useFileSystem';
import { FilePlus, FolderPlus, Edit, Trash2 } from 'lucide-react';

interface FileContextMenuProps {
  x: number;
  y: number;
  targetPath: string;
  isDirectory: boolean;
  onClose: () => void;
}

export function FileContextMenu({ x, y, targetPath, isDirectory, onClose }: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { createFile, createDir, deleteFile, renameFile } = useFileSystem();
  const [promptMode, setPromptMode] = useState<'createFile' | 'createDir' | 'rename' | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      if (promptMode === 'createFile') {
        const fullPath = targetPath.endsWith('/') || targetPath.endsWith('\\')
          ? `${targetPath}${inputValue}`
          : `${targetPath}/${inputValue}`;
        await createFile(fullPath);
      } else if (promptMode === 'createDir') {
        const fullPath = targetPath.endsWith('/') || targetPath.endsWith('\\')
          ? `${targetPath}${inputValue}`
          : `${targetPath}/${inputValue}`;
        await createDir(fullPath);
      } else if (promptMode === 'rename') {
        const parts = targetPath.split(/[\/\\]/);
        parts.pop();
        const parentPath = parts.join('/');
        const newPath = parentPath ? `${parentPath}/${inputValue}` : inputValue;
        await renameFile(targetPath, newPath);
      }
      onClose();
    } catch (err) {
      alert(`Action failed: ${err}`);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${targetPath}?`)) {
      try {
        await deleteFile(targetPath);
        onClose();
      } catch (err) {
        alert(`Delete failed: ${err}`);
      }
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-ide-panel border border-ide-border rounded shadow-xl text-ide-text text-xs p-1 select-none flex flex-col min-w-[140px]"
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      {promptMode ? (
        <form onSubmit={handleAction} className="p-1.5 flex flex-col space-y-1.5">
          <label className="text-[10px] text-white font-medium uppercase tracking-wider">
            {promptMode === 'rename' ? 'Rename To' : promptMode === 'createFile' ? 'New File Name' : 'New Folder Name'}
          </label>
          <input
            type="text"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-ide-bg border border-ide-border rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-ide-activeTab"
          />
          <div className="flex space-x-1 justify-end">
            <button
              type="button"
              onClick={() => setPromptMode(null)}
              className="px-2 py-0.5 rounded text-[10px] bg-ide-border text-ide-text hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-0.5 rounded text-[10px] bg-ide-selection text-white hover:bg-ide-activeTab cursor-pointer"
            >
              Submit
            </button>
          </div>
        </form>
      ) : (
        <>
          {isDirectory && (
            <>
              <button
                onClick={() => { setPromptMode('createFile'); setInputValue(''); }}
                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-ide-hover rounded cursor-pointer text-left"
              >
                <FilePlus className="w-3.5 h-3.5 text-ide-keyword" />
                <span>New File</span>
              </button>
              <button
                onClick={() => { setPromptMode('createDir'); setInputValue(''); }}
                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-ide-hover rounded cursor-pointer text-left"
              >
                <FolderPlus className="w-3.5 h-3.5 text-ide-function" />
                <span>New Folder</span>
              </button>
              <div className="h-[1px] bg-ide-border my-1" />
            </>
          )}
          <button
            onClick={() => {
              setPromptMode('rename');
              const filename = targetPath.split(/[\/\\]/).pop() || '';
              setInputValue(filename);
            }}
            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-ide-hover rounded cursor-pointer text-left"
          >
            <Edit className="w-3.5 h-3.5 text-ide-text/70" />
            <span>Rename</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-ide-hover rounded text-red-400 hover:text-red-300 cursor-pointer text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
}
