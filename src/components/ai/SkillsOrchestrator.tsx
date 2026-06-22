import { useState } from 'react';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { Play, Plus, Terminal, Trash2, Cpu, Wrench } from 'lucide-react';

interface AutomationSkill {
  id: string;
  name: string;
  command: string;
  description: string;
}

export function SkillsOrchestrator() {
  const { workspaceRoot } = useFileSystemStore();
  const [skills, setSkills] = useState<AutomationSkill[]>([
    {
      id: '1',
      name: 'Cargo Format',
      command: 'cargo fmt',
      description: 'Formats codebase according to rustfmt style guidelines'
    },
    {
      id: '2',
      name: 'Clean Build Artifacts',
      command: 'cargo clean',
      description: 'Removes target directories containing build cache'
    },
    {
      id: '3',
      name: 'Slint Design Linting',
      command: 'slint-viewer --check',
      description: 'Runs compile checks on local slint layout schemas'
    }
  ]);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCmd, setNewSkillCmd] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillCmd.trim()) return;

    const skill: AutomationSkill = {
      id: String(Date.now()),
      name: newSkillName.trim(),
      command: newSkillCmd.trim(),
      description: newSkillDesc.trim() || 'Custom orchestration workflow.'
    };

    setSkills(prev => [...prev, skill]);
    setNewSkillName('');
    setNewSkillCmd('');
    setNewSkillDesc('');
  };

  const handleExecute = async (skill: AutomationSkill) => {
    setExecutingId(skill.id);
    setExecutionLog(`[Orchestration] Spawning script: "${skill.command}"...\n`);

    try {
      const output = await tauriCommands.executeTerminalCommand(skill.command, workspaceRoot);
      setExecutionLog(prev => `${prev}\x1b[32m[Success]\x1b[0m\n${output}`);
    } catch (err) {
      setExecutionLog(prev => `${prev}\x1b[31m[Failure] ${err}\x1b[0m`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Wrench className="w-4 h-4 text-ide-keyword" />
          <span>Skills Orchestrator</span>
        </span>
        <p className="text-[10px] text-ide-text/60 mt-1">
          Register and automate custom terminal commands & build scripts inside the local workspace.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Register Skill Form */}
        <form onSubmit={handleRegister} className="bg-ide-panel border border-ide-border/50 rounded p-2.5 flex flex-col space-y-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Register Skill</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Name (e.g. Format)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
            />
            <input
              type="text"
              placeholder="Command (e.g. cargo fmt)"
              value={newSkillCmd}
              onChange={(e) => setNewSkillCmd(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
            />
          </div>
          <input
            type="text"
            placeholder="Brief description"
            value={newSkillDesc}
            onChange={(e) => setNewSkillDesc(e.target.value)}
            className="w-full bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
          />
          <button
            type="submit"
            className="bg-ide-selection hover:bg-ide-activeTab text-white text-xs py-1 rounded font-medium flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Automation Skill</span>
          </button>
        </form>

        {/* List of Skills */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Registered Skills ({skills.length})</span>
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="bg-ide-panel border border-ide-border/40 rounded p-2 flex flex-col space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-ide-keyword" />
                  <span className="text-xs font-bold text-white">{skill.name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={executingId !== null}
                    onClick={() => handleExecute(skill)}
                    className="text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-ide-text/50">{skill.description}</p>
              <code className="text-[10px] font-mono bg-ide-bg/60 p-1 rounded text-ide-function select-all border border-ide-border/20 truncate">
                {skill.command}
              </code>
            </div>
          ))}
        </div>

        {/* Logs */}
        {executionLog && (
          <div className="flex flex-col space-y-1.5 bg-ide-bg border border-ide-border rounded p-2.5 min-h-[100px]">
            <span className="text-[9px] uppercase font-bold text-white/50 flex items-center space-x-1">
              <Terminal className="w-3 h-3 text-ide-keyword" />
              <span>Skill Run Log</span>
            </span>
            <pre className="text-[10px] font-mono whitespace-pre-wrap select-all leading-normal text-ide-text flex-1 overflow-auto max-h-[160px]">
              {executionLog}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
