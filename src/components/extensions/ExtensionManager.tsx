import { useState } from 'react';
import { useExtensionStore } from '../../state/extensionStore';
import { extensionLoader } from '../../services/extensionLoader';
import { ToggleLeft, ToggleRight, Trash2, FolderOpen, Puzzle } from 'lucide-react';

export function ExtensionManager() {
  const { extensions, toggleExtension, removeExtension } = useExtensionStore();
  const [extensionPath, setExtensionPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!extensionPath.trim()) return;

    try {
      const manifest = await extensionLoader.loadExtension(extensionPath);
      setSuccessMsg(`Successfully loaded ${manifest.displayName || manifest.name}!`);
      setExtensionPath('');
    } catch (err: any) {
      setErrorMsg(`Failed to load: ${err.message || err}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Puzzle className="w-4 h-4 text-ide-keyword" />
          <span>VS Code Extensions Layer</span>
        </span>
        <p className="text-[10px] text-ide-text/60 mt-1">
          Map extension contribution points (commands, themes) directly into the UI.
        </p>
      </div>

      <div className="p-3 border-b border-ide-border shrink-0">
        <form onSubmit={handleLoad} className="flex flex-col space-y-2">
          <label className="text-[10px] uppercase font-bold text-white/70">Load Local Extension</label>
          <div className="flex space-x-1.5">
            <input
              type="text"
              placeholder="/absolute/path/to/extension-folder"
              value={extensionPath}
              onChange={(e) => setExtensionPath(e.target.value)}
              className="flex-1 bg-ide-panel border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
            />
            <button
              type="submit"
              className="bg-ide-selection hover:bg-ide-activeTab text-white px-3 py-1 text-xs rounded font-medium cursor-pointer transition-colors flex items-center space-x-1"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Load</span>
            </button>
          </div>
          {errorMsg && <p className="text-[10px] text-red-400">{errorMsg}</p>}
          {successMsg && <p className="text-[10px] text-green-400">{successMsg}</p>}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <span className="text-[10px] uppercase font-bold text-white/50 block">Installed Extensions ({extensions.length})</span>
        {extensions.length === 0 ? (
          <div className="text-xs text-ide-text/40 text-center py-6">
            No custom extensions loaded. Try loading a VS Code extension directory containing a package.json.
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            {extensions.map((ext) => (
              <div
                key={ext.manifest.name}
                className="bg-ide-panel border border-ide-border/50 rounded p-2.5 flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                      {ext.manifest.displayName || ext.manifest.name}
                    </h4>
                    <p className="text-[10px] text-ide-text/50">v{ext.manifest.version} • {ext.manifest.publisher || 'local'}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => toggleExtension(ext.manifest.name)}
                      className="text-ide-text hover:text-white transition-colors cursor-pointer"
                    >
                      {ext.isActive ? (
                        <ToggleRight className="w-5 h-5 text-ide-keyword" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-ide-text/40" />
                      )}
                    </button>
                    <button
                      onClick={() => removeExtension(ext.manifest.name)}
                      className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-ide-text/70 line-clamp-2">
                  {ext.manifest.description || 'No description provided.'}
                </p>

                {ext.manifest.contributes && (
                  <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-ide-border/30">
                    {ext.manifest.contributes.commands && (
                      <span className="text-[9px] bg-ide-bg text-ide-text/75 px-1.5 py-0.5 rounded">
                        {ext.manifest.contributes.commands.length} Commands
                      </span>
                    )}
                    {ext.manifest.contributes.themes && (
                      <span className="text-[9px] bg-ide-bg text-ide-text/75 px-1.5 py-0.5 rounded">
                        {ext.manifest.contributes.themes.length} Themes
                      </span>
                    )}
                    {ext.manifest.contributes.snippets && (
                      <span className="text-[9px] bg-ide-bg text-ide-text/75 px-1.5 py-0.5 rounded">
                        {ext.manifest.contributes.snippets.length} Snippets
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
