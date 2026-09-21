import { useEffect, useState } from 'react';
import { Code2, Box, Cpu, FileCode, Search, RefreshCw, Layers } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { tauriCommands } from '../../services/tauri';
import { AstNodeDto } from '../../types/oxide';
import { cn } from '../../utils/theme';

interface ASTNodeItemProps {
  node: AstNodeDto;
  depth: number;
  onSelect: (node: AstNodeDto) => void;
  selectedNode: AstNodeDto | null;
}

function ASTNodeItem({ node, depth, onSelect, selectedNode }: ASTNodeItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isSelected = selectedNode?.name === node.name && selectedNode?.kind === node.kind;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const getNodeIcon = (kind: string) => {
    switch (kind) {
      case 'function':
      case 'method':
        return <Code2 className="w-3.5 h-3.5 mr-1.5 text-[#3574f0]" />;
      case 'struct':
      case 'class':
        return <Box className="w-3.5 h-3.5 mr-1.5 text-[#e5c07b]" />;
      case 'enum':
        return <Layers className="w-3.5 h-3.5 mr-1.5 text-[#98c379]" />;
      case 'trait':
      case 'interface':
        return <Cpu className="w-3.5 h-3.5 mr-1.5 text-[#c678dd]" />;
      default:
        return <FileCode className="w-3.5 h-3.5 mr-1.5 text-[#868a91]" />;
    }
  };

  return (
    <div className="flex flex-col select-none">
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center text-[11px] font-mono py-1 px-2 hover:bg-[#2b2d30] transition-colors text-left rounded cursor-pointer mb-[1px] group",
          isSelected ? "bg-[#3574f0]/20 text-white border border-[#3574f0]/60" : "text-[#dfe1e5]"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="mr-1 text-[9px] text-[#868a91] hover:text-white"
          >
            {collapsed ? '▶' : '▼'}
          </span>
        )}
        {getNodeIcon(node.kind)}
        <span className="font-semibold text-white">{node.name}</span>
        <span className="text-[10px] text-[#868a91] ml-2 truncate max-w-[150px]">{node.signature}</span>
      </button>

      {hasChildren && !collapsed && (
        <div className="flex flex-col">
          {node.children.map((child, idx) => (
            <ASTNodeItem
              key={`${child.name}-${idx}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedNode={selectedNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ASTViewer() {
  const { currentFile, files } = useEditorStore();
  const fileData = currentFile ? files.get(currentFile) : null;
  const [nodes, setNodes] = useState<AstNodeDto[]>([]);
  const [selectedNode, setSelectedNode] = useState<AstNodeDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadAst = async () => {
    if (!currentFile) return;
    setLoading(true);
    try {
      const outline = await tauriCommands.getFileAstOutline(currentFile, fileData?.content);
      setNodes(outline);
    } catch (err) {
      console.error('Failed to load AST:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAst();
  }, [currentFile, fileData?.content]);

  const filteredNodes = nodes.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.kind.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopySignature = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(selectedNode.signature);
      setStatusMessage(`Copied: ${selectedNode.name}`);
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] border-l border-[#2b2d30] text-[#dfe1e5]">
      {/* Header */}
      <div className="p-2.5 text-[11px] font-semibold text-[#868a91] uppercase tracking-wider flex justify-between items-center border-b border-[#2b2d30] shrink-0 select-none">
        <div className="flex items-center space-x-1.5">
          <Code2 className="w-3.5 h-3.5 text-[#3574f0]" />
          <span>AST Outline</span>
        </div>
        <button
          onClick={loadAst}
          className="p-1 hover:bg-[#2b2d30] text-[#868a91] hover:text-white rounded transition-colors cursor-pointer"
          title="Refresh AST"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#3574f0]")} />
        </button>
      </div>

      {/* Filter Input */}
      <div className="p-2 border-b border-[#2b2d30] bg-[#26282d]">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 absolute left-2 text-[#868a91]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full bg-[#1e1f22] border border-[#393b40] rounded text-[11px] pl-7 pr-2 py-1 text-white placeholder-[#5a5d63] focus:outline-none focus:border-[#3574f0]"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-grow p-2 overflow-auto">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-[#868a91]">
            <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#3574f0]" />
            Extracting AST...
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-xs text-[#868a91] p-4">
            <Code2 className="w-6 h-6 text-[#4e5157] mb-2" />
            <span>No AST symbols match query</span>
          </div>
        ) : (
          filteredNodes.map((node, idx) => (
            <ASTNodeItem
              key={`${node.name}-${idx}`}
              node={node}
              depth={0}
              onSelect={setSelectedNode}
              selectedNode={selectedNode}
            />
          ))
        )}
      </div>

      {/* Selected Node Inspector Footer */}
      {selectedNode && (
        <div className="p-3 border-t border-[#2b2d30] bg-[#26282d] flex flex-col space-y-2 shrink-0 select-none text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white uppercase text-[10px] tracking-wider text-[#3574f0]">
              {selectedNode.kind}
            </span>
            <span className="text-[10px] text-[#868a91] font-mono">
              Line {selectedNode.line_number}
            </span>
          </div>
          <div className="font-mono text-[11px] text-[#dfe1e5] bg-[#1e1f22] p-1.5 rounded border border-[#393b40] truncate">
            {selectedNode.signature}
          </div>
          {selectedNode.doc_comment && (
            <div className="text-[10px] text-[#868a91] italic max-h-16 overflow-y-auto">
              "{selectedNode.doc_comment}"
            </div>
          )}
          <button
            onClick={handleCopySignature}
            className="w-full bg-[#3574f0] hover:bg-[#3574f0]/80 text-white text-[10px] uppercase tracking-wider font-semibold py-1.5 rounded transition-colors cursor-pointer"
          >
            {statusMessage || 'Copy Symbol Signature'}
          </button>
        </div>
      )}
    </div>
  );
}

