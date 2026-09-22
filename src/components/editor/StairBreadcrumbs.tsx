import React, { useEffect, useState } from 'react';
import { ChevronRight, Folder, FileCode, Box, Shield, Cpu, Code2, Layers } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { OxideEmbedService } from '../../services/oxideEmbed';
import type { AstNodeDto } from '../../types/oxide';

interface StairBreadcrumbsProps {
  currentLine?: number;
  onSelectNode?: (startLine: number) => void;
}

export const StairBreadcrumbs: React.FC<StairBreadcrumbsProps> = ({ currentLine = 1, onSelectNode }) => {
  const currentFile = useEditorStore((state) => state.currentFile);
  const files = useEditorStore((state) => state.files);
  const fileData = currentFile ? files.get(currentFile) : null;

  const [astNodes, setAstNodes] = useState<AstNodeDto[]>([]);
  const [activeEnclosing, setActiveEnclosing] = useState<AstNodeDto[]>([]);

  useEffect(() => {
    if (!currentFile) {
      setAstNodes([]);
      return;
    }

    let isMounted = true;
    OxideEmbedService.getFileAstOutline(currentFile, fileData?.content)
      .then((nodes) => {
        if (isMounted) {
          setAstNodes(nodes);
        }
      })
      .catch((err) => console.error('[StairBreadcrumbs] Failed to load AST nodes:', err));

    return () => {
      isMounted = false;
    };
  }, [currentFile, fileData?.content]);

  // Find enclosing AST path for current line
  useEffect(() => {
    if (!astNodes.length) {
      setActiveEnclosing([]);
      return;
    }

    const path: AstNodeDto[] = [];
    const findPath = (nodes: AstNodeDto[]) => {
      for (const node of nodes) {
        if (currentLine >= node.line_number && currentLine <= node.end_line_number) {
          path.push(node);
          if (node.children && node.children.length > 0) {
            findPath(node.children);
          }
          break;
        }
      }
    };

    findPath(astNodes);
    setActiveEnclosing(path);
  }, [currentLine, astNodes]);

  if (!currentFile) {
    return null;
  }

  const parts = currentFile.split('/').filter(Boolean);

  const getSegmentIcon = (segment: string, isLast: boolean) => {
    if (isLast) {
      if (segment.endsWith('.rs')) return <span className="text-[#e05d44] font-bold text-[9px] mr-1">RS</span>;
      if (segment.endsWith('.ts') || segment.endsWith('.tsx')) return <span className="text-[#3178c6] font-bold text-[9px] mr-1">TS</span>;
      if (segment.endsWith('.c') || segment.endsWith('.h')) return <span className="text-[#555555] font-bold text-[9px] mr-1">C</span>;
      if (segment.endsWith('.cpp') || segment.endsWith('.hpp')) return <span className="text-[#f34b7d] font-bold text-[9px] mr-1">C++</span>;
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
      {/* File Path Path Segments */}
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

      {/* AST Structure Enclosing Context */}
      {activeEnclosing.length > 0 && (
        <>
          <ChevronRight className="w-3 h-3 text-[#565961] shrink-0" />
          <div className="flex items-center space-x-1">
            {activeEnclosing.map((astNode, idx) => {
              const isLeaf = idx === activeEnclosing.length - 1;
              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => onSelectNode && onSelectNode(astNode.line_number)}
                    className={`flex items-center px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isLeaf
                        ? 'bg-[#2d3139] text-[#70a5fd] border border-[#3c424f] font-semibold'
                        : 'text-[#9aa0a6] hover:bg-[#35373c]'
                    }`}
                    title={`L${astNode.line_number}-L${astNode.end_line_number}: ${astNode.signature}`}
                  >
                    {isLeaf ? <Code2 className="w-3 h-3 mr-1 text-[#70a5fd]" /> : <Layers className="w-3 h-3 mr-1 text-[#868a91]" />}
                    <span className="truncate max-w-[160px]">{astNode.name}</span>
                  </div>
                  {!isLeaf && <ChevronRight className="w-2.5 h-2.5 text-[#4e5157] shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
