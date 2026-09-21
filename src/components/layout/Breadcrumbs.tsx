import React from 'react';
import { ChevronRight, Folder, FileCode, Box, Shield, Cpu } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';

export const Breadcrumbs: React.FC = () => {
  const currentFile = useEditorStore((state) => state.currentFile);

  if (!currentFile) {
    return null;
  }

  const parts = currentFile.split('/').filter(Boolean);

  const getSegmentIcon = (segment: string, isLast: boolean) => {
    if (isLast) {
      if (segment.endsWith('.rs')) return <span className="text-[#e05d44] font-bold text-[9px] mr-1">RS</span>;
      if (segment.endsWith('.ts') || segment.endsWith('.tsx')) return <span className="text-[#3178c6] font-bold text-[9px] mr-1">TS</span>;
      if (segment.endsWith('.toml')) return <Box className="w-3 h-3 text-[#cc7832] mr-1" />;
      return <FileCode className="w-3 h-3 text-[#868a91] mr-1" />;
    }
    if (segment === 'src-tauri' || segment === 'src') return <Folder className="w-3 h-3 text-[#3574f0] mr-1" />;
    if (segment === 'handlers' || segment === 'drivers') return <Cpu className="w-3 h-3 text-[#57a64a] mr-1" />;
    if (segment === 'security' || segment === 'auth') return <Shield className="w-3 h-3 text-[#e5c07b] mr-1" />;
    return <Folder className="w-3 h-3 text-[#868a91] mr-1" />;
  };

  return (
    <div className="h-6 bg-[#26282d] border-b border-[#2b2d30] px-3 flex items-center space-x-1 text-[11px] font-mono text-[#868a91] select-none shrink-0 overflow-x-auto">
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={index}>
            <div className={`flex items-center px-1 py-0.5 rounded hover:bg-[#35373c] cursor-pointer transition-colors ${isLast ? 'text-[#dfe1e5] font-semibold' : 'text-[#868a91]'}`}>
              {getSegmentIcon(part, isLast)}
              <span className="truncate max-w-[140px]">{part}</span>
            </div>
            {!isLast && <ChevronRight className="w-3 h-3 text-[#4e5157] shrink-0" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
