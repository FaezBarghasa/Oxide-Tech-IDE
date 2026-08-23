import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCompilationStore } from '../../state/compilationStore';

interface CodeEditorProps {
  height: number;
}

/**
 * Represents the main code editing space powered by Monaco editor.
 * Includes direct subscription to Zustand stores to handle file changes, theme updates, and diagnostics.
 * @param height The height of the editor pane in pixels
 * @returns Editor React Component
 */
export function CodeEditor({ height }: CodeEditorProps) {
  const currentFile = useEditorStore(state => state.currentFile);
  const files = useEditorStore(state => state.files);
  const updateFileContent = useEditorStore(state => state.updateFileContent);
  const theme = useSettingsStore(state => state.theme);
  const showMinimap = useSettingsStore(state => state.showMinimap);
  const diagnostics = useCompilationStore(state => state.diagnostics);
  
  const fileState = currentFile ? files.get(currentFile) : null;
  const content = fileState?.content || '';
  const breakpoints = fileState?.breakpoints || [];

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const updateDecorations = (editor: any, monaco: Monaco, currentBreakpoints: number[]) => {
    const newDecorations = currentBreakpoints.map(line => {
      return {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'breakpoint-glyph'
        }
      };
    });
    
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorRef.current, monacoRef.current, breakpoints);
    }
  }, [breakpoints, currentFile]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const line = e.target.position?.lineNumber;
        const currentFilePath = useEditorStore.getState().currentFile;
        if (line && currentFilePath) {
          useEditorStore.getState().toggleBreakpoint(currentFilePath, line);
        }
      }
    });

    updateDecorations(editor, monaco, breakpoints);
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1f22] text-gray-500 italic" style={{ height }}>
        <span className="text-sm">Select a file to edit</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#1e1f22] relative w-full" style={{ height }}>
      <Editor
        height={height}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        path={currentFile}
        defaultLanguage="rust"
        value={content}
        onChange={(newValue) => {
          if (newValue !== undefined) updateFileContent(currentFile, newValue);
        }}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: showMinimap },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'all',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          glyphMargin: true,
        }}
      />
    </div>
  );
}
