import React from 'react';
import { Package, Hash, Braces, ChevronRight, Binary } from 'lucide-react';

/**
 * Tree-sitter AST visualization pane
 * @returns React Component for the AST tab
 */
export function ASTViewer() {
  const dummyAst = {
    type: 'source_file',
    children: [
       { type: 'use_declaration', text: 'use std::io;' },
       { 
         type: 'function_item', 
         text: 'fn main()',
         children: [
           { type: 'identifier', text: 'main' },
           { type: 'parameters', text: '()' },
           { type: 'block', text: '{ ... }', children: [
             { type: 'expression_statement', text: 'println!("Hello, Tauri Coder IDE!");' }
           ]}
         ]
       }
    ]
  };

  const renderNode = (node: any, depth = 0) => (
    <div key={node.type + depth} className="flex flex-col">
       <div className="flex items-center gap-1.5 py-1 px-2 hover:bg-[#35373c] cursor-pointer rounded" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          <Binary className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-mono text-[#a9b7c6]">{node.type}</span>
          <span className="text-[10px] text-gray-500 truncate ml-2">{node.text}</span>
       </div>
       {node.children && node.children.map((c: any) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="w-64 h-full bg-[#1e1f22] border-l border-[#393b40] flex flex-col text-[#a9b7c6] font-sans shrink-0">
      <div className="h-9 px-3 flex items-center border-b border-[#393b40] shrink-0 font-medium text-xs text-gray-300 select-none">
        <Braces className="w-3.5 h-3.5 mr-2" />
        AST Inspector
      </div>
      <div className="flex-1 overflow-y-auto p-1 py-2 select-none">
        {renderNode(dummyAst)}
      </div>
    </div>
  );
}
