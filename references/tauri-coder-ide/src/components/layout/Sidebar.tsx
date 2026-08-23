import React from 'react';
import { FolderOpen, FileCode2, Package, FileText } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';

/**
 * Sidebar layout displaying File Tree and Quick Actions
 * @returns React Component for internal workspace Sidebar
 */
export function Sidebar() {
  const setCurrentFile = useEditorStore(state => state.setCurrentFile);
  const currentFile = useEditorStore(state => state.currentFile);

  const mockFiles = [
    { name: 'src/main.rs', type: 'rust' },
    { name: 'src/hardware.rs', type: 'rust' },
    { name: 'Cargo.toml', type: 'toml' },
    { name: 'build.rs', type: 'rust' },
    { name: 'README.md', type: 'md' }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'rust': return <FileCode2 className="w-3.5 h-3.5 text-orange-400" />;
      case 'toml': return <Package className="w-3.5 h-3.5 text-amber-500" />;
      case 'md': return <FileText className="w-3.5 h-3.5 text-blue-300" />;
      default: return <FileText className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div className="w-64 h-full bg-[#1e1f22] border-r border-[#393b40] flex flex-col text-[#a9b7c6] font-sans shrink-0">
      <div className="h-9 px-3 flex items-center border-b border-[#393b40] shrink-0 font-medium text-xs text-gray-300 select-none">
        <FolderOpen className="w-3.5 h-3.5 mr-2" />
        Project Explorer
      </div>
      <div className="flex-1 overflow-y-auto p-2 select-none">
        {mockFiles.map(file => (
          <div 
            key={file.name}
            onClick={() => setCurrentFile(file.name)}
            className={`flex items-center gap-2 px-2 py-1 text-[11px] cursor-pointer rounded transition-colors ${currentFile === file.name ? 'bg-[#2e436e] text-white font-medium' : 'hover:bg-[#2b2d30]'}`}
          >
            {getIcon(file.type)}
            <span>{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
