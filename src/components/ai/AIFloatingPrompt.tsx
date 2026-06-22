import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '../../state/editorStore';
import { useSettingsStore } from '../../state/settingsStore';
import { Sparkles, CornerDownLeft, X } from 'lucide-react';

interface AIFloatingPromptProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onClose: () => void;
}

export function AIFloatingPrompt({ editor, onClose }: AIFloatingPromptProps) {
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  });
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { currentFile, addReviewComment } = useEditorStore();
  const { setActiveOverlay } = useSettingsStore();

  useEffect(() => {
    if (!editor) return;

    // Try to position the widget near the editor's cursor
    const position = editor.getPosition();
    if (position) {
      const coords = editor.getScrolledVisiblePosition(position);
      const editorDom = editor.getDomNode();
      if (coords && editorDom) {
        const rect = editorDom.getBoundingClientRect();
        // Calculate absolute position within the editor container
        // Place it 35px below the current line to not cover the text
        const top = Math.min(coords.top + 35, rect.height - 120);
        const left = Math.min(coords.left, rect.width - 340);
        setPositionStyle({
          top: `${top}px`,
          left: `${Math.max(20, left)}px`,
          transform: 'none'
        });
      }
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || isGenerating || !editor || !currentFile) return;

    setIsGenerating(true);
    const selection = editor.getSelection();
    const position = editor.getPosition();
    const targetLine = position ? position.lineNumber : 1;

    // Get selected text or the current line text
    let originalText = '';
    let startLine = targetLine;
    
    const model = editor.getModel();
    if (model) {
      if (selection && !selection.isEmpty()) {
        originalText = model.getValueInRange(selection);
        startLine = selection.startLineNumber;
      } else {
        originalText = model.getLineContent(targetLine);
      }
    }

    // Simulate model inference and generate code diff
    setTimeout(() => {
      let replacementText = originalText;
      let message = 'Suggested refactoring';

      const promptLower = promptText.toLowerCase();
      if (promptLower.includes('match') || promptLower.includes('refactor')) {
        if (originalText.includes('if ') || originalText.includes('else if')) {
          message = 'Refactored conditional statements to a structured Match pattern.';
          replacementText = originalText
            .replace(/if\s+(\w+)\s*==\s*([\w":\s]+)\s*\{([\s\S]*?)\}/, 'match $1 {\n    $2 => {$3}')
            .replace(/else\s+if\s+(\w+)\s*==\s*([\w":\s]+)\s*\{([\s\S]*?)\}/g, '    $2 => {$3}')
            .replace(/else\s*\{([\s\S]*?)\}/, '    _ => {$1\n}');
        } else {
          message = 'Wrapped code segment in matching handler block.';
          replacementText = `match state {\n    Active => {\n        ${originalText.trim()}\n    }\n    _ => {}\n}`;
        }
      } else if (promptLower.includes('unwrap') || promptLower.includes('error')) {
        message = 'Safe error handling replacing risky unwraps.';
        replacementText = originalText.replace(/\.unwrap\(\)/g, '.map_err(|e| log::error!("Error: {:?}", e))?');
      } else if (promptLower.includes('doc') || promptLower.includes('comment')) {
        message = 'Added structured Rust documentation block.';
        replacementText = `/// TODO: Verify correct application state behavior.\n/// Invoked during local firmware compilation diagnostics loop.\n${originalText}`;
      } else {
        message = `AI edit: "${promptText}"`;
        replacementText = `${originalText}\n// Added by AI: Verified logic sequence`;
      }

      addReviewComment({
        id: String(Date.now()),
        filePath: currentFile,
        line: startLine,
        message,
        originalText,
        replacementText
      });

      setIsGenerating(false);
      setActiveOverlay(null);
      onClose();
    }, 1000);
  };

  return (
    <div
      style={positionStyle}
      className="absolute w-[360px] bg-ide-panel/95 backdrop-blur-md border border-ide-border rounded-lg shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 select-none text-ide-text"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-ide-keyword animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">Floating AI Prompt</span>
        </div>
        <button
          onClick={onClose}
          className="text-ide-text/40 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask AI to modify selection... (e.g. 'use match')"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          disabled={isGenerating}
          className="w-full bg-ide-bg border border-ide-border rounded px-2.5 py-1.5 pr-8 text-xs text-white placeholder-ide-text/30 focus:outline-none focus:border-ide-keyword"
        />
        <button
          type="submit"
          disabled={isGenerating || !promptText.trim()}
          className="absolute right-1.5 top-1.5 p-1 bg-ide-selection hover:bg-ide-activeTab disabled:opacity-40 disabled:hover:bg-ide-selection text-white rounded cursor-pointer transition-colors"
        >
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </form>

      <div className="mt-2.5 flex items-center justify-between text-[9px] text-ide-text/40">
        <span>{isGenerating ? 'Analyzing code context...' : 'Press Enter to run AI command'}</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}
