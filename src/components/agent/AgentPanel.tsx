import React, { useState, useEffect } from 'react';
import { AgentTask, AgentResult, AgentEvent, AgentMode } from '../../types/agent';
import { tauriCommands } from '../../services/tauri';
import { DiffReview } from './DiffReview';
import {
  Bot,
  Play,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  RotateCw,
  Terminal,
} from 'lucide-react';

interface AgentPanelProps {
  workspacePath: string;
  onOpenFile?: (filePath: string) => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  workspacePath,
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<AgentMode>('Plan');
  const [running, setRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'diffs' | 'plan'>('stream');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (running && currentTaskId) {
      interval = setInterval(async () => {
        try {
          const newEvents = await tauriCommands.agentGetEvents(currentTaskId);
          setEvents(newEvents);
        } catch {
          // Ignore polling errors
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running, currentTaskId]);

  const handleExecute = async () => {
    if (!prompt.trim() || running) return;

    const taskId = `task_${Date.now()}`;
    setCurrentTaskId(taskId);
    setRunning(true);
    setEvents([]);
    setLastResult(null);

    const task: AgentTask = {
      id: taskId,
      title: prompt.slice(0, 40),
      prompt,
      mode,
      workspace_path: workspacePath,
      target_files: [],
      max_iterations: 10,
      max_budget_tokens: 50000,
    };

    try {
      const result = await tauriCommands.agentExecuteTask(task);
      setLastResult(result);
      if (result.diffs.length > 0) {
        setActiveTab('diffs');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastResult({
        task_id: taskId,
        status: 'Failed',
        summary: `Execution failed: ${msg}`,
        diffs: [],
        actions_taken: [],
        tokens_used: 0,
        execution_time_ms: 0,
        error: msg,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!currentTaskId) return;
    try {
      setRunning(true);
      const result = await tauriCommands.agentApprovePlan(currentTaskId);
      setLastResult(result);
      if (result.diffs.length > 0) {
        setActiveTab('diffs');
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!currentTaskId) return;
    try {
      const result = await tauriCommands.agentRejectPlan(currentTaskId, 'Plan rejected by user');
      setLastResult(result);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] text-zinc-200 text-xs font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-zinc-200">Oxide Agent Engine</span>
        </div>
        <div className="flex items-center bg-[#141414] rounded border border-zinc-800 p-0.5">
          {(['Plan', 'Yolo', 'Ask'] as AgentMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                mode === m
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="p-3 border-b border-zinc-800 bg-[#1e1e1e]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your coding or architectural task (e.g. 'Implement hardfault handler for STM32F4' or 'Heal compiler errors')..."
          className="w-full h-20 p-2 text-xs bg-[#141414] border border-zinc-800 rounded focus:border-purple-500 focus:outline-none resize-none text-zinc-200 font-mono"
          disabled={running}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Budget: 50k tokens</span>
            <span>•</span>
            <span>SurrealDB Graph RAG Active</span>
          </div>
          <button
            onClick={handleExecute}
            disabled={running || !prompt.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-xs transition-colors ${
              running || !prompt.trim()
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {running ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Thinking...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Execute
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-3 border-b border-zinc-800 bg-[#1b1b1b] gap-2">
        <button
          onClick={() => setActiveTab('stream')}
          className={`py-2 px-2 text-[11px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'stream'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> Event Stream
        </button>
        <button
          onClick={() => setActiveTab('diffs')}
          className={`py-2 px-2 text-[11px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'diffs'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Diffs ({lastResult?.diffs?.length || 0})
        </button>
        {lastResult?.status === 'WaitingApproval' && (
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-2 px-2 text-[11px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'plan'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" /> Plan Approval
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'stream' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
            {events.length === 0 && !lastResult && (
              <div className="text-zinc-600 text-center py-8">
                Ready for task input. SurrealDB AST graph & tool registry initialized.
              </div>
            )}
            {events.map((ev, i) => (
              <div
                key={i}
                className="p-2 rounded bg-[#1f1f1f] border border-zinc-800/80 flex items-start gap-2"
              >
                {ev.event_type === 'Thought' && <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />}
                {ev.event_type === 'ToolCall' && <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />}
                {ev.event_type === 'ToolResult' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                {ev.event_type === 'DiffStaged' && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                {ev.event_type === 'Error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-zinc-500 font-semibold">{ev.event_type}</div>
                  <div className="text-zinc-300 break-words mt-0.5">
                    {String(ev.payload.thought || ev.payload.tool || ev.payload.summary || JSON.stringify(ev.payload))}
                  </div>
                </div>
              </div>
            ))}
            {lastResult && (
              <div className="p-3 rounded bg-[#222] border border-zinc-700 mt-3">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Result Summary
                </div>
                <div className="text-zinc-300 mt-1 whitespace-pre-wrap">{lastResult.summary}</div>
                <div className="mt-2 text-[10px] text-zinc-500 flex gap-3">
                  <span>Tokens: {lastResult.tokens_used}</span>
                  <span>Time: {lastResult.execution_time_ms}ms</span>
                  <span>Status: {lastResult.status}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diffs' && (
          <DiffReview
            diffs={lastResult?.diffs || []}
            onAcceptAll={() => {
              if (lastResult) {
                lastResult.diffs.forEach(d => { d.applied = true; });
                setLastResult({ ...lastResult });
              }
            }}
            onRejectAll={() => {
              if (lastResult) {
                setLastResult({ ...lastResult, diffs: [] });
              }
            }}
          />
        )}

        {activeTab === 'plan' && lastResult?.status === 'WaitingApproval' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Layers className="w-4 h-4" /> Agent Proposed Plan
              </div>
              <div className="p-3 bg-[#131313] border border-zinc-800 rounded text-zinc-300 whitespace-pre-wrap font-mono">
                {lastResult.summary}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                onClick={handleRejectPlan}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 rounded text-red-300 font-medium flex items-center gap-1"
              >
                <StopCircle className="w-3.5 h-3.5" /> Reject Plan
              </button>
              <button
                onClick={handleApprovePlan}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Execute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
