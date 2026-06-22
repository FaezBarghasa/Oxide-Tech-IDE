import { Activity, Network, FileCode2 } from 'lucide-react';

export function ASTVisualizer() {
  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none text-xs">
      <div className="p-3 border-b border-ide-border bg-ide-panel/50">
        <div className="flex items-center space-x-2 font-medium text-white mb-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span>CortexIDE Deep Comprehension</span>
        </div>
        <p className="text-ide-text/80 text-[10px] leading-tight">
          Structural AST analysis and neural embeddings for advanced semantic search and context assembly.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 py-1 px-2 hover:bg-ide-panel rounded cursor-pointer">
            <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
            <span>src/components/layout/MainLayout.tsx</span>
          </div>
          <div className="ml-5 border-l border-ide-border pl-2 space-y-1">
            <div className="flex items-center space-x-2 py-1 px-2 hover:bg-ide-panel rounded cursor-pointer">
              <Network className="w-3.5 h-3.5 text-yellow-400" />
              <span>FunctionDeclaration: MainLayout</span>
            </div>
            <div className="ml-5 border-l border-ide-border pl-2 space-y-1">
              <div className="flex items-center space-x-2 py-1 px-2 hover:bg-ide-panel rounded cursor-pointer">
                <span className="w-3.5 h-3.5 inline-block text-center text-[10px] bg-ide-panel rounded text-ide-keyword">V</span>
                <span>VariableDeclaration: centerArea</span>
              </div>
              <div className="flex items-center space-x-2 py-1 px-2 hover:bg-ide-panel rounded cursor-pointer">
                <span className="w-3.5 h-3.5 inline-block text-center text-[10px] bg-ide-panel rounded text-ide-keyword">I</span>
                <span>IfStatement: activeRightWindow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
