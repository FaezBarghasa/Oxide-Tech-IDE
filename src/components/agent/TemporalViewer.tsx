import React, { useState } from 'react';
import { EvolutionEvent, BugIntroductionCandidate } from '../../types/agent';
import { tauriCommands } from '../../services/tauri';
import {
  History,
  GitCommit,
  Bug,
  Search,
  RotateCw,
  GitBranch,
} from 'lucide-react';

interface TemporalViewerProps {
  workspacePath: string;
}

export const TemporalViewer: React.FC<TemporalViewerProps> = ({ workspacePath }) => {
  const [activeMode, setActiveMode] = useState<'evolution' | 'bisect'>('evolution');
  const [modulePath, setModulePath] = useState('crates/agent/src/engine.rs');
  const [events, setEvents] = useState<EvolutionEvent[]>([]);
  const [goodCommit, setGoodCommit] = useState('HEAD~10');
  const [badCommit, setBadCommit] = useState('HEAD');
  const [testCmd, setTestCmd] = useState('cargo test');
  const [candidates, setCandidates] = useState<BugIntroductionCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetchEvolution = async () => {
    setLoading(true);
    try {
      const res = await tauriCommands.agentTemporalModuleEvolution(workspacePath, modulePath, 20);
      setEvents(res);
    } catch (e) {
      console.error('Failed to get module evolution:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBisect = async () => {
    setLoading(true);
    try {
      const res = await tauriCommands.agentTemporalFindCommit(workspacePath, testCmd, goodCommit, badCommit);
      setCandidates(res);
    } catch (e) {
      console.error('Failed to run temporal bisect:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] text-zinc-200 text-xs font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-zinc-200">Temporal Code Intelligence</span>
        </div>
        <div className="flex items-center bg-[#141414] rounded border border-zinc-800 p-0.5">
          <button
            onClick={() => setActiveMode('evolution')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMode === 'evolution' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Module Timeline
          </button>
          <button
            onClick={() => setActiveMode('bisect')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMode === 'bisect' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bug Bisect
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeMode === 'evolution' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={modulePath}
                onChange={(e) => setModulePath(e.target.value)}
                placeholder="Relative file / module path (e.g. src/lib.rs)"
                className="flex-1 px-2.5 py-1.5 bg-[#141414] border border-zinc-800 rounded font-mono text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleFetchEvolution}
                disabled={loading}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium flex items-center gap-1.5 transition-colors"
              >
                {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Explore Evolution
              </button>
            </div>

            <div className="space-y-2">
              {events.length === 0 && !loading && (
                <div className="text-zinc-600 text-center py-8">
                  Enter a file or module path to view its evolution and architectural changes across git commits.
                </div>
              )}
              {events.map((ev, i) => (
                <div key={i} className="p-3 bg-[#1e1e1e] border border-zinc-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-purple-400 font-semibold">
                      <GitCommit className="w-3.5 h-3.5" />
                      <span>{ev.commit_hash.slice(0, 7)}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(ev.timestamp * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="text-zinc-200 font-medium">{ev.message}</div>
                  <div className="text-zinc-400 text-[11px]">{ev.summary}</div>
                  <div className="text-[10px] text-zinc-500">By {ev.author} • {ev.files_changed.length} file(s) modified</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'bisect' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-3 bg-[#202020] border border-zinc-800 rounded-lg space-y-3">
              <div className="font-semibold text-zinc-200 flex items-center gap-2">
                <Bug className="w-4 h-4 text-red-400" /> Automated Bug-Introducing Commit Bisect
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Good Commit / Tag</label>
                  <input
                    type="text"
                    value={goodCommit}
                    onChange={(e) => setGoodCommit(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Bad Commit / Tag</label>
                  <input
                    type="text"
                    value={badCommit}
                    onChange={(e) => setBadCommit(e.target.value)}
                    className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1 font-mono">Test Command</label>
                <input
                  type="text"
                  value={testCmd}
                  onChange={(e) => setTestCmd(e.target.value)}
                  className="w-full px-2 py-1 bg-[#141414] border border-zinc-800 rounded text-zinc-200 focus:outline-none font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleBisect}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Run Bisect Engine
                </button>
              </div>
            </div>

            {candidates.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-zinc-200">Suspect Commits Identified</div>
                {candidates.map((c, i) => (
                  <div key={i} className="p-3 bg-[#1e1e1e] border border-red-950/60 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-red-400 font-semibold">{c.commit_hash.slice(0, 7)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        Confidence: {(c.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-zinc-300 text-[11px]">{c.reason}</div>
                    <div className="text-[10px] text-zinc-500">Author: {c.author} • {c.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
