import { useState } from 'react';
import { tauriCommands } from '../../services/tauri';
import { useEditorStore } from '../../state/editorStore';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { Code2, Play, ArrowRight, CheckCircle2 } from 'lucide-react';

export function MacroViewerToolWindow() {
  const { currentFile, files } = useEditorStore();
  const { workspaceRoot } = useFileSystemStore();

  const fileData = currentFile ? files.get(currentFile) : null;
  const initialSource = fileData?.content || `#[derive(Debug, Clone, Serialize)]
struct DevicePacket {
    id: u32,
    payload: Vec<u8>,
}

macro_rules! packet {
    ($id:expr, $payload:expr) => {
        DevicePacket {
            id: $id,
            payload: $payload.to_vec(),
        }
    };
}

fn main() {
    let p = packet!(42, b"hello");
}`;

  const [inputCode, setInputCode] = useState(initialSource);
  const [expandedCode, setExpandedCode] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);

  const handleExpand = async () => {
    setIsExpanding(true);
    try {
      const res = await tauriCommands.rustExpandMacro(inputCode, undefined, workspaceRoot);
      setExpandedCode(res.expanded);
      setSteps(res.steps);
    } catch (err) {
      setExpandedCode(`// Expansion error:\n${String(err)}`);
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans select-none text-xs">
      {/* Toolbar */}
      <div className="h-7 px-3 border-b border-[#2b2d30] flex items-center justify-between shrink-0 bg-[#2b2d30]/50">
        <div className="flex items-center space-x-1.5 font-semibold text-white">
          <Code2 className="w-3.5 h-3.5 text-[#e06c75]" />
          <span>Interactive Macro Expansion Viewer (Rust 2026.2)</span>
        </div>

        <button
          onClick={handleExpand}
          disabled={isExpanding}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#3574f0] hover:bg-[#437ef7] text-white rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isExpanding ? 'Expanding...' : 'Expand Macro'}</span>
        </button>
      </div>

      {/* Split Viewer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Macro Input */}
        <div className="flex-1 flex flex-col border-r border-[#2b2d30]">
          <div className="px-3 py-1 bg-[#2b2d30]/40 border-b border-[#2b2d30] text-[10px] font-bold text-[#868a91] uppercase tracking-wider flex items-center justify-between">
            <span>Original Rust Code / Invocation</span>
            <span className="font-mono text-[9px]">syn AST input</span>
          </div>
          <textarea
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 p-3 bg-[#1e1f22] text-[#dfe1e5] font-mono text-[11px] leading-relaxed resize-none focus:outline-none border-none"
            spellCheck={false}
          />
        </div>

        {/* Right Side: Expanded Rust Code */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1 bg-[#2b2d30]/40 border-b border-[#2b2d30] text-[10px] font-bold text-[#868a91] uppercase tracking-wider flex items-center justify-between">
            <span>Expanded Syntax / Compiler Output</span>
            <div className="flex items-center space-x-1 text-[#57a64a]">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-mono text-[9px]">Clean Syntax</span>
            </div>
          </div>
          <textarea
            readOnly
            value={expandedCode || '// Click "Expand Macro" to generate step-by-step expanded AST tokens'}
            className="flex-1 p-3 bg-[#18191c] text-[#98c379] font-mono text-[11px] leading-relaxed resize-none focus:outline-none border-none select-text"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Expansion Stepper */}
      {steps.length > 0 && (
        <div className="h-10 border-t border-[#2b2d30] bg-[#2b2d30]/30 px-3 flex items-center space-x-3 overflow-x-auto text-[10px] shrink-0 font-mono">
          <span className="text-[#868a91] uppercase font-bold tracking-wider shrink-0 font-sans">Pipeline:</span>
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center space-x-1.5 shrink-0 text-[#61afef]">
              <span>{step}</span>
              {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-[#868a91]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
