import { Bot, Network, Zap, Workflow, Play } from 'lucide-react';

export function MultiAgentCoordinator() {
  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none text-xs">
      <div className="p-3 border-b border-ide-border bg-ide-panel/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 font-medium text-white">
            <Network className="w-4 h-4 text-blue-400" />
            <span>Opengravity / Antigravity Agents</span>
          </div>
          <button className="flex items-center space-x-1 bg-ide-keyword/20 text-ide-keyword hover:bg-ide-keyword/30 px-2 py-1 rounded transition-colors">
            <Play className="w-3 h-3 fill-current" />
            <span>Spawn Agent</span>
          </button>
        </div>
        <p className="text-ide-text/80 text-[10px] leading-tight">
          Coordinate local (vLLM/Ollama) and cloud AI agents to autonomously solve complex tasks.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Agent 1 */}
        <div className="bg-ide-panel border border-ide-border rounded p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-white">Planner Agent</span>
            </div>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Active</span>
          </div>
          <p className="text-ide-text/80 text-[10px] mb-2">Working on: "Refactoring UI to IntelliJ layout"</p>
          <div className="w-full bg-ide-bg rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        {/* Agent 2 */}
        <div className="bg-ide-panel border border-ide-border rounded p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-white">Reviewer Agent</span>
            </div>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Idle</span>
          </div>
          <p className="text-ide-text/80 text-[10px]">Waiting for PR to be opened...</p>
        </div>

        {/* Agent 3 */}
        <div className="bg-ide-panel border border-ide-border rounded p-2 opacity-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Workflow className="w-4 h-4 text-ide-text" />
              <span className="font-semibold text-white">QA Subagent</span>
            </div>
            <span className="text-[10px] bg-ide-border text-ide-text px-1.5 py-0.5 rounded">Stopped</span>
          </div>
          <p className="text-[10px]">Tests passed.</p>
        </div>
      </div>
    </div>
  );
}
