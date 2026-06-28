import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { setupMonacoRust } from '../../services/monaco';
import { EditorTabs } from './EditorTabs';
import { AIFloatingPrompt } from '../ai/AIFloatingPrompt';
import { Activity } from 'lucide-react';

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function CodeEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const zoneIdsRef = useRef<string[]>([]);
  
  const { currentFile, files, updateFileContent, reviewComments } = useEditorStore();
  const fileData = currentFile ? files.get(currentFile) : null;
  
  const { theme, fontSize, showMinimap, zenMode, activeOverlay, setActiveOverlay } = useSettingsStore();
  const diagnostics = useCompilationStore((state) => state.diagnostics);

  useEffect(() => {
    setupMonacoRust();
  }, []);

  // Register Monaco Inline Completions Provider (Ghost Text predictions)
  useEffect(() => {
    const provider = monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const precedingText = lineContent.substring(0, position.column - 1).trim();
        const isRust = model.getLanguageId() === 'rust';

        let insertText = '';
        if (isRust) {
          if (precedingText === 'fn main()') {
            insertText = ' {\n    println!("Hello from Oxide Tech!");\n}';
          } else if (precedingText.startsWith('let mut')) {
            insertText = ' buffer = Vec::new();';
          } else if (precedingText === 'match result') {
            insertText = ' {\n        Ok(val) => {\n            log::info!("Success: {:?}", val);\n        }\n        Err(err) => {\n            log::error!("Failure: {:?}", err);\n        }\n    }';
          } else if (precedingText.endsWith('struct Device')) {
            insertText = ' {\n    id: String,\n    port: String,\n    baud: u32,\n}';
          }
        } else {
          if (precedingText === 'const handleOpen = () =>') {
            insertText = ' {\n  setIsVisible(true);\n};';
          } else if (precedingText === 'interface Props') {
            insertText = ' {\n  label: string;\n  value: number;\n}';
          }
        }

        if (!insertText) return undefined;

        return {
          items: [
            {
              insertText,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              )
            }
          ]
        };
      },
      freeInlineCompletions: () => {}
    });

    return () => {
      provider.dispose();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !currentFile) return;

    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: fileData?.content || '',
        language: getLanguage(currentFile),
        theme: theme === 'dark' ? 'oxide-dark' : 'vs',
        fontSize,
        minimap: { enabled: showMinimap },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineHeight: 22,
        renderLineHighlight: 'all',
        padding: { top: 12 }
      });

      editorRef.current.onDidChangeModelContent(() => {
        const val = editorRef.current?.getValue();
        updateFileContent(currentFile, val || '');
      });

      // Bind Cmd+L to spawn AI Prompt
      editorRef.current.addAction({
        id: 'open-ai-prompt',
        label: 'Open AI Prompt Overlay',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
        run: () => {
          setActiveOverlay('prompt');
        }
      });

      // Bind Cmd+Enter to Accept review fix
      editorRef.current.addAction({
        id: 'accept-review-fix',
        label: 'Accept Inline Review Fix',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          const comments = useEditorStore.getState().reviewComments.filter(c => c.filePath === currentFile);
          if (comments.length > 0) {
            useEditorStore.getState().acceptReviewComment(comments[0].id);
          }
        }
      });

    } else {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== fileData?.content) {
        editorRef.current.setValue(fileData?.content || '');
      }
      monaco.editor.setModelLanguage(model!, getLanguage(currentFile));
    }
  }, [currentFile]);

  // Handle Dynamic Review Comments View Zones
  useEffect(() => {
    if (!editorRef.current || !currentFile) return;
    const editor = editorRef.current;

    // Clear previous zones
    editor.changeViewZones((accessor) => {
      for (const zoneId of zoneIdsRef.current) {
        accessor.removeZone(zoneId);
      }
      zoneIdsRef.current = [];
    });

    const fileComments = reviewComments.filter(c => c.filePath === currentFile);
    if (fileComments.length === 0) return;

    editor.changeViewZones((accessor) => {
      for (const comment of fileComments) {
        const container = document.createElement('div');
        container.className = 'bg-ide-panel/95 border border-ide-border rounded p-2.5 mx-8 my-1 flex flex-col space-y-2 select-none shadow-lg';
        
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between text-[10px] text-ide-text/40';
        header.innerHTML = `<span class="font-bold text-ide-keyword uppercase tracking-wider">AI Inline Code Review</span><span>Line ${comment.line}</span>`;
        container.appendChild(header);

        const message = document.createElement('div');
        message.className = 'text-xs text-white leading-normal font-sans';
        message.innerText = comment.message;
        container.appendChild(message);

        const diffContainer = document.createElement('div');
        diffContainer.className = 'bg-ide-bg rounded border border-ide-border/40 p-2 font-mono text-[10px] leading-relaxed flex flex-col space-y-1';
        
        const oldLine = document.createElement('div');
        oldLine.className = 'text-red-400 bg-red-500/10 px-1 rounded flex items-center';
        oldLine.innerHTML = `<span class="opacity-30 mr-2 font-bold">-</span><span class="line-through">${escapeHtml(comment.originalText.trim())}</span>`;
        
        const newLine = document.createElement('div');
        newLine.className = 'text-green-400 bg-green-500/10 px-1 rounded flex items-center';
        newLine.innerHTML = `<span class="opacity-30 mr-2 font-bold">+</span><span>${escapeHtml(comment.replacementText.trim())}</span>`;
        
        diffContainer.appendChild(oldLine);
        diffContainer.appendChild(newLine);
        container.appendChild(diffContainer);

        const actions = document.createElement('div');
        actions.className = 'flex items-center space-x-2';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'bg-ide-selection hover:bg-ide-activeTab text-white text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition-colors';
        acceptBtn.innerText = 'Accept Fix (Cmd+Enter)';
        acceptBtn.onclick = () => {
          useEditorStore.getState().acceptReviewComment(comment.id);
        };

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'bg-ide-bg border border-ide-border hover:bg-ide-hover text-ide-text text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors';
        dismissBtn.innerText = 'Dismiss';
        dismissBtn.onclick = () => {
          useEditorStore.getState().dismissReviewComment(comment.id);
        };

        actions.appendChild(acceptBtn);
        actions.appendChild(dismissBtn);
        container.appendChild(actions);

        const zoneId = accessor.addZone({
          afterLineNumber: comment.line,
          heightInLines: 7,
          domNode: container
        });
        zoneIdsRef.current.push(zoneId);
      }
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.changeViewZones((accessor) => {
          for (const zoneId of zoneIdsRef.current) {
            accessor.removeZone(zoneId);
          }
          zoneIdsRef.current = [];
        });
      }
    };
  }, [reviewComments, currentFile]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize,
        minimap: { enabled: showMinimap }
      });
      monaco.editor.setTheme(theme === 'dark' ? 'oxide-dark' : 'vs');
    }
  }, [fontSize, showMinimap, theme]);

  // Set diagnostics markers
  useEffect(() => {
    if (!editorRef.current || !currentFile) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = diagnostics
      .filter((d) => d.filePath === currentFile)
      .map((d) => ({
        startLineNumber: d.line,
        startColumn: d.column,
        endLineNumber: d.line,
        endColumn: d.column + 5,
        message: d.message,
        severity: d.level === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
      }));

    monaco.editor.setModelMarkers(model, 'owner', markers);
  }, [diagnostics, currentFile]);

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.rs')) return 'rust';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.toml')) return 'toml';
    return 'plaintext';
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg overflow-hidden relative">
      {!zenMode && <EditorTabs />}
      {!currentFile ? (
        <div className="flex-grow flex flex-col items-center justify-center text-ide-text select-none">
          <Activity className="w-12 h-12 mb-4 text-ide-hover animate-pulse" />
          <p className="text-xs uppercase tracking-widest font-bold">Select a file from the explorer</p>
        </div>
      ) : (
        <div className="flex-grow min-h-0 w-full relative">
          <div ref={containerRef} className="h-full w-full" />
          {activeOverlay === 'prompt' && (
            <AIFloatingPrompt
              editor={editorRef.current}
              onClose={() => setActiveOverlay(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
