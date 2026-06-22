import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { RefreshCw } from 'lucide-react';

interface DiffViewerProps {
  filePath: string;
  onClose?: () => void;
}

export function DiffViewer({ filePath, onClose }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const { workspaceRoot } = useFileSystemStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let originalModel: monaco.editor.ITextModel | null = null;
    let modifiedModel: monaco.editor.ITextModel | null = null;

    const loadDiffData = async () => {
      setLoading(true);
      try {
        const basename = filePath.replace(workspaceRoot + '/', '');
        // Fetch git HEAD version
        let originalContent = '';
        try {
          originalContent = await tauriCommands.executeTerminalCommand(`git show HEAD:"${basename}"`, workspaceRoot);
        } catch {
          // If file is untracked, original is empty
          originalContent = '';
        }

        // Fetch current version
        const modifiedContent = await tauriCommands.readFile(filePath);

        // Get or create models
        originalModel = monaco.editor.createModel(originalContent, 'rust');
        modifiedModel = monaco.editor.createModel(modifiedContent, 'rust');

        // Create Monaco diff editor
        const diffEditor = monaco.editor.createDiffEditor(containerRef.current!, {
          theme: 'vs-dark',
          readOnly: true,
          originalEditable: false,
          automaticLayout: true,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12
        });

        diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel
        });

        diffEditorRef.current = diffEditor;
      } catch (err) {
        console.error("Failed to load diff content:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDiffData();

    return () => {
      diffEditorRef.current?.dispose();
      originalModel?.dispose();
      modifiedModel?.dispose();
    };
  }, [filePath, workspaceRoot]);

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      <div className="h-8 border-b border-ide-border px-4 flex items-center justify-between bg-ide-panel/30 text-xs shrink-0 select-none">
        <span className="font-bold text-white flex items-center space-x-1.5">
          <span>Diff Viewer: {filePath.split(/[\/\\]/).pop()}</span>
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-ide-text hover:text-white transition-colors cursor-pointer"
          >
            Close Diff
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-ide-bg/80">
            <RefreshCw className="w-5 h-5 animate-spin text-ide-keyword" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
