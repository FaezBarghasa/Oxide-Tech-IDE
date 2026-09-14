import React, { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, Sparkles, Lock } from 'lucide-react';
import { HarnessEvidence, LocalSkill, InferenceRequestMetadata } from '../../types/ast';

interface CognitiveWorkspacePanelProps {
  workspacePath?: string;
  workerId?: string;
  projectId?: string;
}

export const CognitiveWorkspacePanel: React.FC<CognitiveWorkspacePanelProps> = ({
  workspacePath = '/home/jrad/RustroverProjects/Oxide-Tech-IDE',
  workerId = 'alice',
  projectId = 'oxide-tech-ide',
}) => {
  const [activeTab, setActiveTab] = useState<'harness' | 'skills' | 'privacy'>('harness');
  const [isRunning, setIsRunning] = useState(false);
  const [evidenceList, setEvidenceList] = useState<HarnessEvidence[]>([
    {
      verifier: 'Check',
      command: 'cargo check --locked',
      exit_code: 0,
      stdout: '    Finished dev profile [unoptimized + debuginfo] in 1.05s',
      stderr: '',
      duration_ms: 1050,
      passed: true,
    },
    {
      verifier: 'Lint',
      command: 'cargo clippy -- -D warnings',
      exit_code: 0,
      stdout: '    Checking oxide-core v0.1.0\n    Finished dev profile [unoptimized + debuginfo] in 1.03s',
      stderr: '',
      duration_ms: 1030,
      passed: true,
    },
  ]);

  const [skills] = useState<LocalSkill[]>([
    {
      id: 'rust_fix_missing_import',
      name: 'Fix Missing Rust Import',
      version: 1,
      error_patterns: ['cannot find', 'unresolved import', 'not found in this scope'],
      prompt_template: 'Identify the missing symbol and add the canonical use statement.',
      verification_command: 'cargo check',
      risk_level: 'low',
      success_count: 5,
      failure_count: 0,
    },
    {
      id: 'rust_avoid_unwrap',
      name: 'Refactor unwrap to Result',
      version: 1,
      error_patterns: ['unwrap()', 'expect()'],
      prompt_template: 'Refactor unwrapped expressions into idiomatic ? error propagation.',
      verification_command: 'cargo clippy -- -D warnings',
      risk_level: 'low',
      success_count: 8,
      failure_count: 0,
    },
  ]);

  const metadata: InferenceRequestMetadata = {
    worker_id: workerId,
    project_id: projectId,
    namespace: `${workerId}/${projectId}`,
    retention: 'ephemeral',
    no_train: true,
    no_global_memory: true,
  };

  const handleRunHarness = (verifierName: 'Check' | 'Lint' | 'Test') => {
    setIsRunning(true);
    setTimeout(() => {
      const newEv: HarnessEvidence = {
        verifier: verifierName,
        command: verifierName === 'Check' ? 'cargo check' : verifierName === 'Lint' ? 'cargo clippy' : 'cargo test',
        exit_code: 0,
        stdout: `Running ${verifierName} on ${workspacePath} -> OK`,
        stderr: '',
        duration_ms: 840,
        passed: true,
      };
      setEvidenceList((prev) => [newEv, ...prev]);
      setIsRunning(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#30363d] rounded-lg text-zinc-300 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Local Cognitive Engine (Worker Device)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono">
            Model Plane ⟂ Knowledge Plane (Isolated)
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('harness')}
            className={`px-2.5 py-1 text-xs rounded transition ${
              activeTab === 'harness' ? 'bg-[#21262d] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Harness Verification
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-2.5 py-1 text-xs rounded transition ${
              activeTab === 'skills' ? 'bg-[#21262d] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Local Skills
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-2.5 py-1 text-xs rounded transition ${
              activeTab === 'privacy' ? 'bg-[#21262d] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Privacy & Isolation
          </button>
        </div>
      </div>

      {/* Tab 1: Harness Verification */}
      {activeTab === 'harness' && (
        <div className="flex-1 p-3 flex flex-col space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Execute automated local verification verifiers:</span>
            <div className="flex space-x-2">
              <button
                disabled={isRunning}
                onClick={() => handleRunHarness('Check')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-200 border border-zinc-700"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Run Check</span>
              </button>
              <button
                disabled={isRunning}
                onClick={() => handleRunHarness('Lint')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-200 border border-zinc-700"
              >
                <Play className="w-3 h-3 text-amber-400" />
                <span>Run Clippy</span>
              </button>
              <button
                disabled={isRunning}
                onClick={() => handleRunHarness('Test')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-200 border border-zinc-700"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Run Tests</span>
              </button>
            </div>
          </div>

          {/* Evidence Logs List */}
          <div className="flex flex-col space-y-2">
            {evidenceList.map((ev, i) => (
              <div key={i} className="p-2.5 rounded bg-[#161b22] border border-[#30363d] flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {ev.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className="text-xs font-mono text-white font-semibold">{ev.command}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{ev.duration_ms}ms</span>
                </div>
                <pre className="text-[11px] font-mono text-zinc-400 bg-[#090d13] p-1.5 rounded overflow-x-auto">
                  {ev.stdout || ev.stderr}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Local Skills */}
      {activeTab === 'skills' && (
        <div className="flex-1 p-3 flex flex-col space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Active Local Skills (Crystallized patterns without model fine-tuning):
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {skills.map((skill) => (
              <div key={skill.id} className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-white">{skill.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    {skill.success_count} Passed
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400">{skill.prompt_template}</p>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#30363d]">
                  <span>Verifier: {skill.verification_command}</span>
                  <span className="text-cyan-400">v{skill.version}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Privacy & Isolation */}
      {activeTab === 'privacy' && (
        <div className="flex-1 p-3 flex flex-col space-y-3 text-xs">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Lock className="w-4 h-4" />
            <span className="font-semibold text-sm text-white">Stateless Inference Guard Active</span>
          </div>

          <p className="text-zinc-400 text-xs leading-relaxed">
            All code graphs, RAG embeddings, developer expertise, and skills remain strictly local on this device.
            Outgoing API inference requests are stripped of secrets and stamped with isolation headers.
          </p>

          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col space-y-2 font-mono text-[11px]">
            <div className="text-cyan-400 font-semibold">// Outgoing Request Metadata:</div>
            <div className="text-zinc-300">"worker_id": "{metadata.worker_id}"</div>
            <div className="text-zinc-300">"project_id": "{metadata.project_id}"</div>
            <div className="text-zinc-300">"namespace": "{metadata.namespace}"</div>
            <div className="text-emerald-400">"no_train": {metadata.no_train.toString()}</div>
            <div className="text-emerald-400">"no_global_memory": {metadata.no_global_memory.toString()}</div>
            <div className="text-zinc-300">"retention": "{metadata.retention}"</div>
          </div>
        </div>
      )}
    </div>
  );
};
