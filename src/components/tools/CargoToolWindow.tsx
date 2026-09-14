import { useEffect, useState } from 'react';
import { tauriCommands } from '../../services/tauri';
import { CargoWorkspaceMetadata, CargoCrateInfo } from '../../types/rustrover';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { useCompilationStore } from '../../state/compilationStore';
import {
  RefreshCw, Play, Plus, Package, Box,
  Layers, ChevronRight, ChevronDown, Search
} from 'lucide-react';

export function CargoToolWindow() {
  const { workspaceRoot } = useFileSystemStore();
  const { setBuildStatus, setDiagnostics } = useCompilationStore();

  const [metadata, setMetadata] = useState<CargoWorkspaceMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['root', 'crates']);
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [newDepName, setNewDepName] = useState('');
  const [newDepVersion, setNewDepVersion] = useState('');
  const [addDepLoading, setAddDepLoading] = useState(false);

  const loadMetadata = async () => {
    setLoading(true);
    try {
      const data = await tauriCommands.cargoGetWorkspaceMetadata(workspaceRoot);
      setMetadata(data);
    } catch (err) {
      console.warn('Failed to load Cargo workspace metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [workspaceRoot]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleRunTarget = async (crateName: string, targetName: string, kind: string) => {
    setBuildStatus('running');
    try {
      let cmd = '';
      if (kind === 'test') {
        cmd = `cargo test --package ${crateName} --test ${targetName}`;
      } else if (kind === 'bin') {
        cmd = `cargo run --package ${crateName} --bin ${targetName}`;
      } else {
        cmd = `cargo check --package ${crateName}`;
      }

      await tauriCommands.executeTerminalCommand(cmd, workspaceRoot);
      setBuildStatus('success');
    } catch (err) {
      console.error('Failed to run cargo target', err);
      setBuildStatus('error');
    }
  };

  const handleQuickCommand = async (command: string) => {
    setBuildStatus('running');
    try {
      if (command === 'check') {
        const resJSON = await tauriCommands.spawnCargoCheck(workspaceRoot);
        const res = JSON.parse(resJSON);
        setDiagnostics(res.diagnostics || []);
      } else if (command === 'clippy') {
        const resJSON = await tauriCommands.spawnCargoClippy(workspaceRoot);
        const res = JSON.parse(resJSON);
        setDiagnostics(res.diagnostics || []);
      } else {
        await tauriCommands.executeTerminalCommand(`cargo ${command}`, workspaceRoot);
      }
      setBuildStatus('success');
    } catch {
      setBuildStatus('error');
    }
  };

  const handleAddDependency = async () => {
    if (!newDepName.trim()) return;
    setAddDepLoading(true);
    try {
      await tauriCommands.cargoAddDependency(newDepName.trim(), newDepVersion.trim() || undefined, workspaceRoot);
      setShowAddDepModal(false);
      setNewDepName('');
      setNewDepVersion('');
      await loadMetadata();
    } catch (err) {
      console.error('Failed to add dependency', err);
    } finally {
      setAddDepLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] select-none font-sans text-xs">
      {/* Cargo Toolbar */}
      <div className="h-7 px-2 border-b border-[#2b2d30] flex items-center justify-between shrink-0 bg-[#2b2d30]/50">
        <span className="text-[11px] font-semibold text-white/90 flex items-center space-x-1">
          <Package className="w-3.5 h-3.5 text-[#e06c75]" />
          <span>Cargo Workspace</span>
        </span>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAddDepModal(true)}
            title="Add Dependency (cargo add)"
            className="p-1 hover:bg-[#393b40] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadMetadata}
            disabled={loading}
            title="Reload All Cargo Projects"
            className="p-1 hover:bg-[#393b40] rounded text-[#868a91] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cargo Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Workspace Root Node */}
        <div>
          <div
            onClick={() => toggleNode('root')}
            className="flex items-center space-x-1.5 py-1 px-1.5 hover:bg-[#2b2d30] rounded cursor-pointer text-white font-medium"
          >
            <span className="text-[#868a91]">
              {expandedNodes.includes('root') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
            <Layers className="w-3.5 h-3.5 text-[#3574f0]" />
            <span className="text-[11px] truncate">
              {metadata ? metadata.workspace_root.split('/').pop() : 'Workspace'}
            </span>
          </div>

          {expandedNodes.includes('root') && metadata && (
            <div className="pl-4 space-y-1 mt-0.5">
              {metadata.packages.map((pkg: CargoCrateInfo) => {
                const pkgKey = `pkg-${pkg.name}`;
                const isPkgExpanded = expandedNodes.includes(pkgKey);

                return (
                  <div key={pkg.name}>
                    <div
                      onClick={() => toggleNode(pkgKey)}
                      className="flex items-center space-x-1.5 py-1 px-1.5 hover:bg-[#2b2d30] rounded cursor-pointer text-[#dfe1e5]"
                    >
                      <span className="text-[#868a91]">
                        {isPkgExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </span>
                      <Package className="w-3.5 h-3.5 text-[#e06c75]" />
                      <span className="text-[11px] font-medium text-white">{pkg.name}</span>
                      <span className="text-[10px] text-[#868a91]">v{pkg.version}</span>
                    </div>

                    {isPkgExpanded && (
                      <div className="pl-4 space-y-0.5 mt-0.5">
                        {/* Targets section */}
                        <div className="text-[10px] uppercase font-bold text-[#868a91] tracking-wider py-0.5">Targets</div>
                        {pkg.targets.map((tgt) => (
                          <div
                            key={tgt.name}
                            className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#2b2d30] rounded group text-[11px]"
                          >
                            <div className="flex items-center space-x-1.5">
                              <Box className="w-3 h-3 text-[#e5c07b]" />
                              <span>{tgt.name}</span>
                              <span className="text-[9px] text-[#868a91] font-mono">({tgt.kind})</span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRunTarget(pkg.name, tgt.name, tgt.kind)}
                                title="Run Target"
                                className="p-0.5 hover:bg-[#393b40] rounded text-green-400"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Dependencies section */}
                        {pkg.dependencies.length > 0 && (
                          <div className="mt-1">
                            <div className="text-[10px] uppercase font-bold text-[#868a91] tracking-wider py-0.5">
                              Dependencies ({pkg.dependencies.length})
                            </div>
                            <div className="max-h-28 overflow-y-auto space-y-0.5 pl-1">
                              {pkg.dependencies.map((dep) => (
                                <div key={dep} className="text-[10px] text-[#abb2bf] flex items-center space-x-1">
                                  <span className="w-1 h-1 rounded-full bg-[#868a91]" />
                                  <span>{dep}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Cargo Commands Palette */}
        <div className="mt-4 pt-2 border-t border-[#2b2d30]">
          <div className="text-[10px] uppercase font-bold text-[#868a91] tracking-wider px-1 mb-1">
            Cargo Tasks
          </div>
          <div className="grid grid-cols-2 gap-1 px-1">
            {[
              { id: 'check', label: 'check' },
              { id: 'clippy', label: 'clippy' },
              { id: 'test', label: 'test' },
              { id: 'fmt', label: 'fmt' },
              { id: 'doc', label: 'doc' },
              { id: 'clean', label: 'clean' },
            ].map((task) => (
              <button
                key={task.id}
                onClick={() => handleQuickCommand(task.id)}
                className="px-2 py-1 bg-[#2b2d30]/60 hover:bg-[#3574f0] hover:text-white border border-[#393b40]/50 rounded text-left text-[11px] font-mono transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>cargo {task.label}</span>
                <Play className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Dependency Modal */}
      {showAddDepModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-100">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl p-4 w-96 font-sans">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <Package className="w-4 h-4 text-[#e06c75]" />
              <span>Add Cargo Dependency</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#868a91] mb-1">Crate Name (from crates.io)</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#868a91]" />
                  <input
                    type="text"
                    value={newDepName}
                    onChange={(e) => setNewDepName(e.target.value)}
                    placeholder="e.g. serde, tokio, axum"
                    className="w-full bg-[#1e1f22] border border-[#393b40] rounded pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#3574f0] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#868a91] mb-1">Version (optional)</label>
                <input
                  type="text"
                  value={newDepVersion}
                  onChange={(e) => setNewDepVersion(e.target.value)}
                  placeholder="e.g. 1.0, 1.0.40"
                  className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-3 py-1.5 text-xs text-white focus:border-[#3574f0] focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddDepModal(false)}
                  className="px-3 py-1.5 text-xs text-[#868a91] hover:text-white hover:bg-[#393b40] rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDependency}
                  disabled={addDepLoading || !newDepName.trim()}
                  className="px-3 py-1.5 text-xs bg-[#3574f0] hover:bg-[#437ef7] text-white rounded font-medium disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {addDepLoading ? 'Adding...' : 'Add Crate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
