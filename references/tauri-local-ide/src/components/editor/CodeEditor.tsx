import React from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';
import { EditorToolbar } from './EditorToolbar';
import { TerminalPanel } from '../terminal/TerminalPanel'; // Keep for structure
import { Activity } from 'lucide-react';

export function CodeEditor() {
  const currentFile = useEditorStore(state => state.currentFile);
  const fileData = useEditorStore(state => currentFile ? state.files.get(currentFile) : null);
  const updateFileContent = useEditorStore(state => state.updateFileContent);
  const theme = useSettingsStore(state => state.theme);
  const fontSize = useSettingsStore(state => state.fontSize);
  const showMinimap = useSettingsStore(state => state.showMinimap);
  
  const diagnostics = useCompilationStore(state => state.diagnostics);

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.rs')) return 'rust';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.toml')) return 'toml';
    return 'plaintext';
  };

  const markers = diagnostics
    .filter(d => d.filePath === currentFile)
    .map(d => ({
      startLineNumber: d.line,
      startColumn: d.column,
      endLineNumber: d.line,
      endColumn: d.column + 10, // Approximate span
      message: d.message,
      severity: d.level === 'error' ? 8 : 4, // 8 is Error, 4 is Warning in Monaco
    }));

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <EditorToolbar />
      
      {!currentFile ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col">
          <Activity className="w-12 h-12 mb-4 text-zinc-700 opacity-50" />
          <p className="text-[11px] uppercase tracking-widest font-bold">Select a file from the explorer</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <Editor
            height="100%"
            language={getLanguage(currentFile)}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={fileData?.content || ''}
            onChange={(val) => updateFileContent(currentFile, val || '')}
            options={{
              fontSize: 13,
              minimap: { enabled: showMinimap },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              renderLineHighlight: 'all',
              padding: { top: 16 },
              lineHeight: 24,
            }}
          />
        </div>
      )}
    </div>
  );
}
