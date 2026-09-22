import React, { useState, useEffect } from 'react';
import { ParallelAgentInfo, AgentTask } from '../../types/agent';
import { tauriCommands } from '../../services/tauri';
import {
  Users,
  Play,
  XCircle,
  Container,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
} from 'lucide-react';

interface AgentsWindowProps {
  workspacePath: string;
}

export const AgentsWindow: React.FC<AgentsWindowProps> = ({ workspacePath }) => {
  const [agents, setAgents] = useState<ParallelAgentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [runtime, setRuntime] = useState<'InProcess' | 'DockerContainer' | 'SSHRemote'>('InProcess');
  const [showSpawnModal, setShowSpawnModal] = useState(false);

  const fetchAgents = async () => {
    try {
      const list = await tauriCommands.agentListParallel();
      setAgents(list);
    } catch (e) {
      console.error('Failed to list parallel agents:', e);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSpawn = async () => {
    if (!newPrompt.trim() || loading) return;
    setLoading(true);
    try {
      const task: AgentTask = {
        id: `agent_${Date.now()}`,
        title: newTitle.trim() || newPrompt.slice(0, 30),
        prompt: newPrompt,
        mode: 'Plan',
        workspace_path: workspacePath,
        target_files: [],
        max_iterations: 15,
        max_budget_tokens: 50000,
      };

      await tauriCommands.agentSpawnParallel(task, runtime);
      setNewPrompt('');
      setNewTitle('');
      setShowSpawnModal(false);
      await fetchAgents();
    } catch (e) {
      console.error('Failed to spawn agent:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (agentId: string) => {
    try {
      await tauriCommands.agentCancelParallel(agentId);
      await fetchAgents();
    } catch (e) {
      console.error('Failed to cancel agent:', e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] text-zinc-200 text-xs font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-200">Parallel Agent Swarm</span>
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]">
            {agents.length} active
          </span>
        </div>
        <button
          onClick={() => setShowSpawnModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Spawn Agent
        </button>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.length === 0 ? (
          <div className="text-zinc-600 text-center py-12 space-y-2">
            <Cpu className="w-8 h-8 mx-auto text-zinc-700 opacity-60" />
            <div>No background agents currently running.</div>
            <div className="text-[11px] text-zinc-600">
              Spawn parallel agents to execute refactors, tests, and hardfault fixes concurrently.
            </div>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.agent_id}
              className="p-3 bg-[#1e1e1e] border border-zinc-800 rounded-lg space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-200">{agent.title}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({agent.agent_id})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      agent.status === 'Executing'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                        : agent.status === 'Completed'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : agent.status === 'WaitingApproval'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {agent.status}
                  </span>
                  {agent.status === 'Executing' && (
                    <button
                      onClick={() => handleCancel(agent.agent_id)}
                      className="p-1 hover:bg-red-900/40 text-red-400 rounded transition-colors"
                      title="Cancel Agent"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Badges & Metrics */}
              <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1">
                  {agent.runtime === 'DockerContainer' && <Container className="w-3 h-3 text-blue-400" />}
                  {agent.runtime === 'InProcess' && <Cpu className="w-3 h-3 text-purple-400" />}
                  {agent.runtime === 'SSHRemote' && <Terminal className="w-3 h-3 text-emerald-400" />}
                  <span>{agent.runtime}</span>
                </div>
                <span>•</span>
                <span>Mode: {agent.mode}</span>
                <span>•</span>
                <span>Tokens: {agent.tokens_used.toLocaleString()}</span>
                <span>•</span>
                <span>Time: {(agent.elapsed_ms / 1000).toFixed(1)}s</span>
              </div>

              {/* Locked Files (GraphLock) */}
              {agent.locked_files.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/40">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Locked: {agent.locked_files.join(', ')}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Spawn Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#202020] border border-zinc-700 rounded-lg w-full max-w-md p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-semibold text-zinc-200 text-sm">Spawn Parallel Agent</span>
              <button
                onClick={() => setShowSpawnModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Task Title (Optional)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Optimize SurrealDB queries"
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-zinc-800 rounded text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Instruction / Prompt</label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Describe the task for this autonomous agent..."
                  className="w-full h-24 p-2 bg-[#141414] border border-zinc-800 rounded text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Runtime Environment</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['InProcess', 'DockerContainer', 'SSHRemote'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRuntime(r)}
                      className={`py-1.5 px-2 rounded text-[11px] border font-medium text-center transition-colors ${
                        runtime === r
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                          : 'bg-[#181818] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r === 'DockerContainer' ? 'Docker' : r === 'InProcess' ? 'In-Process' : 'SSH'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowSpawnModal(false)}
                className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSpawn}
                disabled={loading || !newPrompt.trim()}
                className={`px-4 py-1.5 rounded text-xs font-medium text-white flex items-center gap-1.5 ${
                  loading || !newPrompt.trim()
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
              >
                {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Launch Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
