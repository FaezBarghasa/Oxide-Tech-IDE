import { Code2 } from 'lucide-react';
import { useASTStore } from '../../state/astStore';
import { useEditorStore } from '../../state/editorStore';
import { cn } from '../../utils/theme';

interface ASTNodeProps {
  node: {
    type: string;
    text?: string;
    children?: any[];
  };
  depth: number;
}

function ASTNodeItem({ node, depth }: ASTNodeProps) {
  const { selectedNode, setSelectedNode } = useASTStore();
  const isSelected = selectedNode === node;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node as any);
  };

  return (
    <div className="flex flex-col select-none">
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center text-[11px] font-mono py-0.5 px-2 hover:bg-ide-hover transition-colors text-left rounded cursor-pointer mb-[1px]",
          isSelected ? "bg-ide-selection text-white border border-ide-activeTab" : "text-ide-text"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <Code2 className="w-3.5 h-3.5 mr-1.5 text-ide-keyword" />
        <span className="font-bold">{node.type}</span>
        {node.text && <span className="text-ide-string ml-1.5">"{node.text}"</span>}
      </button>
      {node.children && (
        <div className="flex flex-col">
          {node.children.map((child, idx) => (
            <ASTNodeItem key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ASTViewer() {
  const { astRoot, setAstRoot, selectedNode } = useASTStore();
  const { currentFile } = useEditorStore();

  const handleRefactor = () => {
    if (selectedNode) {
      alert(`Refactoring AST node: ${selectedNode.type}`);
    } else {
      alert('Please select an AST node to refactor.');
    }
  };

  const handleGenerateDoc = () => {
    if (selectedNode) {
      alert(`Generating documentation for node: ${selectedNode.type}`);
    } else {
      alert('Please select an AST node.');
    }
  };

  // Populate mock AST if empty
  if (!astRoot) {
    const mockAst = {
      type: 'SourceFile',
      startPosition: { line: 1, column: 1 },
      endPosition: { line: 1, column: 1 },
      children: [
        {
          type: 'UseDeclaration',
          text: 'std::fs',
          startPosition: { line: 1, column: 1 },
          endPosition: { line: 1, column: 1 }
        },
        {
          type: 'FunctionDefinition',
          text: 'read_firmware',
          startPosition: { line: 2, column: 1 },
          endPosition: { line: 5, column: 1 },
          children: [
            {
              type: 'Attribute',
              text: '#[inline]',
              startPosition: { line: 2, column: 1 },
              endPosition: { line: 2, column: 1 }
            },
            {
              type: 'BlockExpr',
              startPosition: { line: 3, column: 1 },
              endPosition: { line: 5, column: 1 },
              children: [
                {
                  type: 'CallExpr',
                  text: 'fs::read',
                  startPosition: { line: 4, column: 5 },
                  endPosition: { line: 4, column: 15 }
                },
                {
                  type: 'MacroCall',
                  text: 'println!',
                  startPosition: { line: 4, column: 5 },
                  endPosition: { line: 4, column: 15 }
                }
              ]
            }
          ]
        }
      ]
    };
    setAstRoot(mockAst);
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg border-l border-ide-border">
      <div className="p-3 text-[10px] font-bold text-ide-text/50 uppercase tracking-wider flex justify-between items-center border-b border-ide-border shrink-0 select-none">
        <span>AST Visualization ({currentFile ? currentFile.split('/').pop() : 'No file'})</span>
      </div>

      <div className="flex-grow p-3 overflow-auto">
        {astRoot && <ASTNodeItem node={astRoot} depth={0} />}
      </div>

      <div className="p-3 border-t border-ide-border bg-ide-panel flex flex-col space-y-2 select-none shrink-0">
        <div className="text-[10px] text-ide-text/50 tracking-widest font-bold uppercase mb-1">
          Agent Inference
        </div>
        <button
          onClick={handleRefactor}
          className="w-full bg-ide-keyword hover:bg-ide-keyword/80 text-white text-[11px] uppercase tracking-widest font-bold py-2 rounded transition-colors cursor-pointer shadow-lg"
        >
          Refactor Node
        </button>
        <button
          onClick={handleGenerateDoc}
          className="w-full bg-ide-hover text-ide-text text-[11px] uppercase tracking-widest font-bold py-2 rounded border border-ide-border hover:bg-ide-activeTab hover:text-white transition-colors cursor-pointer"
        >
          Generate JSDoc
        </button>
      </div>
    </div>
  );
}
