import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { tauriCommands } from '../../services/tauri';
import { FileCode, FileText } from 'lucide-react';

export function HarpoonBuffers() {
  const { recentFiles, openFile } = useEditorStore();
  const { activeOverlay, setActiveOverlay } = useSettingsStore();
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = activeOverlay === 'harpoon';

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveOverlay(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredFiles.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % Math.max(filteredFiles.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredFiles[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filterText, selectedIndex, recentFiles]);

  const filteredFiles = recentFiles.filter(path => {
    const filename = path.split(/[\/\\]/).pop() || '';
    return filename.toLowerCase().includes(filterText.toLowerCase()) || path.toLowerCase().includes(filterText.toLowerCase());
  });

  const handleSelect = async (path: string) => {
    try {
      const content = await tauriCommands.readFile(path);
      openFile(path, content);
    } catch (err) {
      console.error("Failed to load file from harpoon switcher:", err);
    } finally {
      setActiveOverlay(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 select-none">
      <div
        ref={containerRef}
        className="w-[480px] bg-ide-panel border border-ide-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-ide-text"
      >
        <div className="p-3 border-b border-ide-border shrink-0 bg-ide-bg/30">
          <input
            type="text"
            placeholder="Type filename to search recent buffers..."
            autoFocus
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-ide-bg border border-ide-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30 font-sans"
          />
        </div>
        <div className="flex-1 max-h-[300px] overflow-y-auto p-1.5 space-y-[2px]">
          {filteredFiles.length === 0 ? (
            <div className="text-xs text-ide-text/40 text-center py-6 select-none font-sans">
              No recent file buffers matching query
            </div>
          ) : (
            filteredFiles.map((path, idx) => {
              const basename = path.split(/[\/\\]/).pop() || '';
              const dir = path.substring(0, path.length - basename.length);
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={path}
                  onClick={() => handleSelect(path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors cursor-pointer text-xs ${
                    isSelected ? 'bg-ide-selection text-white' : 'hover:bg-ide-hover text-ide-text'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {path.endsWith('.rs') ? (
                      <FileCode className="w-3.5 h-3.5 text-ide-keyword" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-ide-function" />
                    )}
                    <span className="font-bold truncate">{basename}</span>
                    <span className="text-[10px] opacity-40 truncate">{dir}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="h-7 border-t border-ide-border bg-ide-bg/50 px-3 flex items-center justify-between text-[9px] text-ide-text/40 select-none">
          <span>{filteredFiles.length} buffer(s) found</span>
          <span>Esc to close • ↑↓ to navigate • Enter to open</span>
        </div>
      </div>
    </div>
  );
}
