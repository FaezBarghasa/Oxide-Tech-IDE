import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { setupMonacoRust } from '../../services/monaco';
import { tauriCommands } from '../../services/tauri';
import { EditorTabs } from './EditorTabs';
import { AIFloatingPrompt } from '../ai/AIFloatingPrompt';
import { Activity, Play, Bug, Sparkles } from 'lucide-react';

export function CodeEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const breakpointsRef = useRef<Set<number>>(new Set());

  const { currentFile, files, updateFileContent } = useEditorStore();
  const fileData = currentFile ? files.get(currentFile) : null;
  const { workspaceRoot } = useFileSystemStore();

  const { fontSize, showMinimap, zenMode, activeOverlay, setActiveOverlay } = useSettingsStore();
  const diagnostics = useCompilationStore((state) => state.diagnostics);

  const [contextActionMenu, setContextActionMenu] = useState<{ x: number; y: number; line: number } | null>(null);

  useEffect(() => {
    setupMonacoRust();
  }, []);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current || !currentFile) return;

    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: fileData?.content || '',
        language: getLanguage(currentFile),
        theme: 'rustrover-dark',
        fontSize,
        minimap: { enabled: showMinimap },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineHeight: 22,
        renderLineHighlight: 'all',
        glyphMargin: true,
        inlayHints: {
          enabled: 'on',
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
        },
        overviewRulerBorder: true,
        overviewRulerLanes: 3,
        padding: { top: 8 },
      });

      // Handle Content Changes
      editorRef.current.onDidChangeModelContent(() => {
        const val = editorRef.current?.getValue();
        updateFileContent(currentFile, val || '');
        updateGutterDecorations();
      });

      // Handle Glyph Margin Click (Toggle Breakpoint)
      editorRef.current.onMouseDown((e) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
          const line = e.target.position?.lineNumber;
          if (line) {
            if (breakpointsRef.current.has(line)) {
              breakpointsRef.current.delete(line);
            } else {
              breakpointsRef.current.add(line);
            }
            updateGutterDecorations();
          }
        }
      });

      // Bind Alt+Enter to Context Actions Popup
      editorRef.current.addAction({
        id: 'show-context-actions',
        label: 'Show Context Actions (Alt+Enter)',
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Enter],
        run: (ed) => {
          const pos = ed.getPosition();
          if (pos) {
            const coords = ed.getScrolledVisiblePosition(pos);
            if (coords) {
              setContextActionMenu({
                x: coords.left + 40,
                y: coords.top + 50,
                line: pos.lineNumber,
              });
            }
          }
        },
      });

      // Bind Cmd+L / Ctrl+L to AI Prompt
      editorRef.current.addAction({
        id: 'open-ai-prompt',
        label: 'Open AI Prompt Overlay',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
        run: () => {
          setActiveOverlay('prompt');
        },
      });
    } else {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== fileData?.content) {
        editorRef.current.setValue(fileData?.content || '');
      }
      monaco.editor.setModelLanguage(model!, getLanguage(currentFile));
    }

    updateGutterDecorations();
  }, [currentFile]);

  // Update VCS, Breakpoints, and Run Glyphs in Left Gutter
  const updateGutterDecorations = async () => {
    if (!editorRef.current || !currentFile) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const model = editorRef.current.getModel();
    if (!model) return;

    // 1. Breakpoint Glyphs
    breakpointsRef.current.forEach((line) => {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'my-breakpoint-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
        },
      });
    });

    // 2. Run / Test Glyphs on `fn main()` and `#[test]`
    const lineCount = model.getLineCount();
    for (let l = 1; l <= lineCount; l++) {
      const lineText = model.getLineContent(l);
      if (lineText.includes('fn main()') || lineText.includes('#[test]') || lineText.includes('#[tokio::main]')) {
        decorations.push({
          range: new monaco.Range(l, 1, l, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'my-run-glyph',
            glyphMarginHoverMessage: { value: "Run / Debug target (Shift+F10 / Shift+F9)" },
          },
        });
      }
    }

    // 3. VCS Line Diffs from Git
    try {
      const diffs = await tauriCommands.vcsGetLineDiffs(currentFile, workspaceRoot);
      for (const d of diffs) {
        let marginClass = 'my-vcs-modified';
        if (d.kind === 'added') marginClass = 'my-vcs-added';
        if (d.kind === 'deleted') marginClass = 'my-vcs-deleted';

        decorations.push({
          range: new monaco.Range(d.line_number, 1, d.line_number, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: marginClass,
            overviewRuler: {
              color: d.kind === 'added' ? '#629755' : '#6897bb',
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        });
      }
    } catch {
      // Ignore if not in git repo
    }

    if (!decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editorRef.current.createDecorationsCollection(decorations);
    } else {
      decorationsCollectionRef.current.set(decorations);
    }
  };

  // Sync Diagnostics Markers
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
        severity: d.level === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      }));

    monaco.editor.setModelMarkers(model, 'compiler', markers);
  }, [diagnostics, currentFile]);

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.rs')) return 'rust';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.toml')) return 'toml';
    return 'plaintext';
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] overflow-hidden relative font-sans">
      {!zenMode && <EditorTabs />}
      {!currentFile ? (
        <div className="flex-grow flex flex-col items-center justify-center text-[#868a91] select-none">
          <Activity className="w-10 h-10 mb-3 text-[#3574f0] animate-pulse" />
          <p className="text-xs uppercase tracking-widest font-semibold text-[#dfe1e5]">No Open File</p>
          <p className="text-[11px] text-[#868a91] mt-1">Select a file from the Project tree or press Shift+Shift</p>
        </div>
      ) : (
        <div className="flex-grow min-h-0 w-full relative">
          <div ref={containerRef} className="h-full w-full" />

          {/* Alt+Enter Context Actions Popup */}
          {contextActionMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setContextActionMenu(null)}
              />
              <div
                style={{ top: `${contextActionMenu.y}px`, left: `${contextActionMenu.x}px` }}
                className="absolute z-50 bg-[#2b2d30] border border-[#393b40] rounded-md shadow-2xl p-1 w-64 text-xs font-sans animate-in fade-in zoom-in-95 duration-75"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-[#868a91] uppercase tracking-wider flex items-center justify-between border-b border-[#393b40] mb-1">
                  <span>Context Actions (Alt+Enter)</span>
                  <Sparkles className="w-3 h-3 text-[#3574f0]" />
                </div>

                <button
                  onClick={() => {
                    setContextActionMenu(null);
                    setActiveOverlay('prompt');
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-[#3574f0] text-white rounded flex items-center space-x-2 text-[11px] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#3574f0] group-hover:text-white" />
                  <span>Oxide: Fix with AI</span>
                </button>

                <button
                  onClick={() => {
                    setContextActionMenu(null);
                    useCompilationStore.getState().setBuildStatus('running');
                    tauriCommands.spawnCargoCheck('.').then((res) => {
                      const parsed = JSON.parse(res);
                      useCompilationStore.getState().setDiagnostics(parsed.diagnostics || []);
                      useCompilationStore.getState().setBuildStatus('success');
                    });
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-[#3574f0] text-[#dfe1e5] hover:text-white rounded flex items-center space-x-2 text-[11px] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-[#57a64a]" />
                  <span>Run Cargo Check on File</span>
                </button>

                <button
                  onClick={() => {
                    setContextActionMenu(null);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-[#3574f0] text-[#dfe1e5] hover:text-white rounded flex items-center space-x-2 text-[11px] cursor-pointer"
                >
                  <Bug className="w-3.5 h-3.5 text-[#61afef]" />
                  <span>Add #[derive(Debug, Clone)]</span>
                </button>
              </div>
            </>
          )}

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
