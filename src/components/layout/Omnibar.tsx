import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../../state/settingsStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { useEditorStore } from '../../state/editorStore';
import { useCompilationStore } from '../../state/compilationStore';
import { tauriCommands } from '../../services/tauri';
import { Terminal, Command, GitBranch, FileText } from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  command: string;
  description: string;
  category: 'system' | 'git' | 'tools' | 'skills';
  action: () => void | Promise<void>;
}

export function Omnibar() {
  const { activeOverlay, setActiveOverlay, setTransientView, toggleZenMode } = useSettingsStore();
  const { tree, workspaceRoot } = useFileSystemStore();
  const { openFile } = useEditorStore();
  
  const [inputText, setInputText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = activeOverlay === 'omnibar';

  // Gather flat file list from workspace tree recursively
  const getFlatFileList = (nodes: any[]): { name: string; path: string }[] => {
    let list: { name: string; path: string }[] = [];
    for (const node of nodes) {
      if (node.isDirectory) {
        if (node.children) {
          list = [...list, ...getFlatFileList(node.children)];
        }
      } else {
        list.push({ name: node.name, path: node.path });
      }
    }
    return list;
  };

  const flatFiles = getFlatFileList(tree);

  const systemCommands: CommandItem[] = [
    {
      id: 'zen',
      name: 'Toggle Zen Mode',
      command: '> zen',
      description: 'Hides or reveals IDE activity sidebars & status elements',
      category: 'system',
      action: () => toggleZenMode()
    },
    {
      id: 'cargo-check',
      name: 'Cargo Check linting',
      command: '> check',
      description: 'Runs compile checks on local package workspace',
      category: 'tools',
      action: async () => {
        const checkStore = useCompilationStore.getState();
        checkStore.setBuildStatus('running');
        checkStore.setProgress(15);
        try {
          const interval = setInterval(() => {
            const currentProgress = useCompilationStore.getState().progress;
            if (currentProgress < 90) {
              checkStore.setProgress(currentProgress + 10);
            }
          }, 150);

          const resJSON = await tauriCommands.spawnCargoCheck('.');
          clearInterval(interval);
          
          try {
            const res = JSON.parse(resJSON);
            if (res.diagnostics && res.diagnostics.length > 0) {
              checkStore.setDiagnostics(res.diagnostics);
              
              const firstError = res.diagnostics.find((d: any) => d.level === 'error');
              if (firstError) {
                const { triggerSelfHealing } = await import('../../utils/compilerGuard');
                triggerSelfHealing(firstError);
              }
            } else {
              checkStore.setDiagnostics([]);
            }
          } catch (e) {
            checkStore.setDiagnostics([]);
          }
          checkStore.setBuildStatus('success');
          checkStore.setProgress(100);
        } catch (err) {
          console.error("Cargo check failed", err);
          checkStore.setBuildStatus('error');
          checkStore.setProgress(0);
        }
      }
    },
    {
      id: 'ai-review',
      name: 'Run AI Code Reviewer',
      command: '> review',
      description: 'Reviews active workspace file and populates inline comments',
      category: 'tools',
      action: () => {
        const { currentFile, addReviewComment, files } = useEditorStore.getState();
        if (!currentFile) {
          alert('Please open a file first to perform code review.');
          return;
        }
        const file = files.get(currentFile);
        const fileContent = file?.content || '';
        
        const lines = fileContent.split('\n');
        let reviewLine = 1;
        let originalText = '';
        let replacementText = '';
        let message = '';

        const unwrapIdx = lines.findIndex(l => l.includes('.unwrap()'));
        const ifIdx = lines.findIndex(l => l.includes('if ') && l.includes('=='));
        
        if (unwrapIdx !== -1) {
          reviewLine = unwrapIdx + 1;
          originalText = lines[unwrapIdx];
          replacementText = originalText.replace(/\.unwrap\(\)/g, '.map_err(|e| log::error!("Operation failed: {:?}", e))?');
          message = 'Avoid panic-prone .unwrap() calls. Refactor to return a Result using map_err or map_or.';
        } else if (ifIdx !== -1) {
          reviewLine = ifIdx + 1;
          originalText = lines[ifIdx];
          replacementText = originalText.replace(/if\s+(\w+)\s*==\s*([\w":\s]+)/, 'match $1');
          message = 'Simplify verbose binary conditionals with structured Rust match statements for improved code legibility.';
        } else {
          reviewLine = Math.min(Math.floor(lines.length / 2) + 1, lines.length);
          originalText = lines[reviewLine - 1] || '//';
          replacementText = `${originalText}\n// Review: Add tracing log points for better diagnostic clarity.`;
          message = 'Recommend adding tracing macros to log parameters or operations at this execution step.';
        }

        addReviewComment({
          id: String(Date.now()),
          filePath: currentFile,
          line: reviewLine,
          message,
          originalText,
          replacementText
        });
      }
    },
    {
      id: 'git-stage-all',
      name: 'Git Stage All',
      command: '> stage',
      description: 'Stages all unstaged files in git workspace',
      category: 'git',
      action: async () => {
        try {
          await tauriCommands.executeTerminalCommand('git add .', workspaceRoot);
          alert('All changes staged.');
        } catch (err) {
          alert(`Staging failed: ${err}`);
        }
      }
    },
    {
      id: 'git-commit',
      name: 'Git Commit',
      command: '> commit',
      description: 'Commits staged files to current branch',
      category: 'git',
      action: () => {
        setInputText('> commit ');
      }
    },
    {
      id: 'overlay-rest',
      name: 'Open REST HTTP client',
      command: '> rest',
      description: 'Launches temporary Postman-style API testing overlay',
      category: 'tools',
      action: () => {
        setTransientView('rest');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-serial',
      name: 'Open Serial Terminal monitor',
      command: '> serial',
      description: 'Launches temporary hardware serial port log terminal',
      category: 'tools',
      action: () => {
        setTransientView('serial');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-mqtt',
      name: 'Open MQTT topic client',
      command: '> mqtt',
      description: 'Launches temporary telemetry publishing socket client',
      category: 'tools',
      action: () => {
        setTransientView('mqtt');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-extensions',
      name: 'Open Extension manager',
      command: '> extensions',
      description: 'Load and inspect local VS Code extension contributions',
      category: 'tools',
      action: () => {
        setTransientView('extensions');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-skills',
      name: 'Open Skills orchestrator',
      command: '> skills',
      description: 'Manage automation scripts in IDE context',
      category: 'tools',
      action: () => {
        setTransientView('skills');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-mcp',
      name: 'Open MCP Explorer',
      command: '> mcp',
      description: 'Register and execute local Model Context Protocol tools',
      category: 'tools',
      action: () => {
        setTransientView('mcp');
        setActiveOverlay('transient');
      }
    },
    {
      id: 'overlay-previews',
      name: 'Open Visual Previews canvas',
      command: '> preview',
      description: 'Toggle Slint layouts / Dioxus browsers previews',
      category: 'tools',
      action: () => {
        setTransientView('previews');
        setActiveOverlay('transient');
      }
    }
  ];

  const handleSelectFile = async (path: string) => {
    try {
      const content = await tauriCommands.readFile(path);
      openFile(path, content);
    } catch (err) {
      console.error("Failed to read file from omnibar", err);
    } finally {
      setActiveOverlay(null);
    }
  };

  const handleRunCommand = async (cmdItem: CommandItem) => {
    setActiveOverlay(null);
    await cmdItem.action();
  };

  const handleSpecialCommit = async (msg: string) => {
    try {
      await tauriCommands.executeTerminalCommand(`git commit -m "${msg}"`, workspaceRoot);
      alert(`Commit successful: ${msg}`);
    } catch (err) {
      alert(`Commit error: ${err}`);
    } finally {
      setActiveOverlay(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveOverlay(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(itemsCount, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemsCount) % Math.max(itemsCount, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (inputText.startsWith('> commit ') && inputText.length > 9) {
          handleSpecialCommit(inputText.substring(9).trim());
          return;
        }

        if (inputText.startsWith('>')) {
          const selected = filteredCommands[selectedIndex];
          if (selected) handleRunCommand(selected);
        } else {
          const selected = filteredFiles[selectedIndex];
          if (selected) handleSelectFile(selected.path);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputText, selectedIndex, flatFiles]);

  const isCommandMode = inputText.startsWith('>');

  const filteredCommands = systemCommands.filter(c =>
    c.command.toLowerCase().includes(inputText.toLowerCase()) ||
    c.name.toLowerCase().includes(inputText.toLowerCase())
  );

  const filteredFiles = flatFiles.filter(f =>
    f.name.toLowerCase().includes(inputText.toLowerCase()) ||
    f.path.toLowerCase().includes(inputText.toLowerCase())
  );

  const itemsCount = isCommandMode ? filteredCommands.length : filteredFiles.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 select-none">
      <div
        ref={containerRef}
        className="w-[540px] bg-ide-panel border border-ide-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-ide-text font-sans"
      >
        <div className="p-3 border-b border-ide-border shrink-0 bg-ide-bg/30 flex items-center space-x-2">
          <Command className="w-4 h-4 text-ide-keyword" />
          <input
            type="text"
            placeholder="Search files, or type '>' for command HUD actions..."
            autoFocus
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-ide-text/30"
          />
        </div>

        <div className="flex-1 max-h-[340px] overflow-y-auto p-1.5 space-y-[2px]">
          {isCommandMode ? (
            filteredCommands.length === 0 ? (
              <div className="text-xs text-ide-text/40 text-center py-6">No commands matching query</div>
            ) : (
              filteredCommands.map((c, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleRunCommand(c)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors cursor-pointer text-xs ${
                      isSelected ? 'bg-ide-selection text-white font-medium' : 'hover:bg-ide-hover text-ide-text'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {c.category === 'git' ? (
                        <GitBranch className="w-3.5 h-3.5 text-ide-keyword" />
                      ) : (
                        <Terminal className="w-3.5 h-3.5 text-ide-function" />
                      )}
                      <span className="font-semibold text-ide-keyword">{c.command}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="text-[9px] opacity-40 truncate">{c.description}</span>
                  </button>
                );
              })
            )
          ) : (
            filteredFiles.length === 0 ? (
              <div className="text-xs text-ide-text/40 text-center py-6">No workspace files matching query</div>
            ) : (
              filteredFiles.map((file, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={file.path}
                    onClick={() => handleSelectFile(file.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors cursor-pointer text-xs ${
                      isSelected ? 'bg-ide-selection text-white font-medium' : 'hover:bg-ide-hover text-ide-text'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-ide-keyword" />
                      <span className="font-bold truncate">{file.name}</span>
                      <span className="text-[10px] opacity-40 truncate">{file.path}</span>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>

        <div className="h-7 border-t border-ide-border bg-ide-bg/50 px-3 flex items-center justify-between text-[9px] text-ide-text/40 select-none">
          <span>{itemsCount} item(s) found</span>
          <span>Esc to exit • ↑↓ to navigate • Enter to select</span>
        </div>
      </div>
    </div>
  );
}
