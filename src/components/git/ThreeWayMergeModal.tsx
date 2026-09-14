import { useState } from 'react';
import { GitMerge, Check, X, Split } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { tauriCommands } from '../../services/tauri';

interface ThreeWayMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  baseContent: string;
  oursContent: string;
  theirsContent: string;
}

export function ThreeWayMergeModal({
  isOpen,
  onClose,
  filePath,
  baseContent,
  oursContent,
  theirsContent,
}: ThreeWayMergeModalProps) {
  const updateFileContent = useEditorStore((s) => s.updateFileContent);
  const [mergedContent, setMergedContent] = useState<string>(oursContent);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAcceptOurs = () => {
    setMergedContent(oursContent);
  };

  const handleAcceptTheirs = () => {
    setMergedContent(theirsContent);
  };

  const handleAcceptBase = () => {
    setMergedContent(baseContent);
  };

  const handleApplyAndSave = async () => {
    setIsApplying(true);
    try {
      updateFileContent(filePath, mergedContent);
      await tauriCommands.writeFile(filePath, mergedContent);
      await tauriCommands.localHistoryRecordSnapshot(filePath, mergedContent, '3-way-merge-resolved');
      onClose();
    } catch (err) {
      console.error('Failed to apply merge resolution:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 select-none font-sans text-xs">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-lg shadow-2xl flex flex-col w-[95vw] h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#26282e] border-b border-[#393b40]">
          <div className="flex items-center gap-2">
            <GitMerge size={16} className="text-[#3574f0]" />
            <span className="font-semibold text-sm text-[#dfe1e5]">
              Resolve Conflicts: <span className="font-mono text-xs text-[#a8adbd]">{filePath}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#868a91] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 3-Pane Diff Comparison */}
        <div className="flex-1 grid grid-cols-3 divide-x divide-[#393b40] bg-[#18191b] overflow-hidden">
          {/* Ours (Local Working Tree) */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#212327] border-b border-[#393b40]">
              <span className="font-semibold text-[#59a869] flex items-center gap-1.5">
                <span>Current Changes (Ours)</span>
              </span>
              <button
                onClick={handleAcceptOurs}
                className="px-2 py-0.5 bg-[#2e436e] hover:bg-[#3574f0] text-white rounded text-[11px] transition-colors"
              >
                Accept All Ours
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-[#bcbec4] bg-[#18191b] whitespace-pre select-text leading-relaxed">
              {oursContent}
            </div>
          </div>

          {/* Base (Ancestor) */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#212327] border-b border-[#393b40]">
              <span className="font-semibold text-[#868a91]">Base (Common Ancestor)</span>
              <button
                onClick={handleAcceptBase}
                className="px-2 py-0.5 bg-[#2b2d30] hover:bg-[#393b40] text-[#dfe1e5] rounded text-[11px] transition-colors"
              >
                Revert to Base
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-[#707278] bg-[#141517] whitespace-pre select-text leading-relaxed">
              {baseContent}
            </div>
          </div>

          {/* Theirs (Incoming Branch) */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#212327] border-b border-[#393b40]">
              <span className="font-semibold text-[#3574f0]">Incoming (Theirs)</span>
              <button
                onClick={handleAcceptTheirs}
                className="px-2 py-0.5 bg-[#2e436e] hover:bg-[#3574f0] text-white rounded text-[11px] transition-colors"
              >
                Accept All Theirs
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-[#bcbec4] bg-[#18191b] whitespace-pre select-text leading-relaxed">
              {theirsContent}
            </div>
          </div>
        </div>

        {/* Bottom Panel: Interactive Merged Result Editor */}
        <div className="h-64 flex flex-col border-t border-[#393b40] bg-[#1e1f22]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#26282e] border-b border-[#393b40]">
            <span className="font-semibold text-[#dfe1e5] flex items-center gap-1.5">
              <Split size={14} className="text-[#e5a00d]" />
              <span>Resolved Output (Interactive Result)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 bg-[#2b2d30] hover:bg-[#393b40] text-[#dfe1e5] rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAndSave}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#3574f0] hover:bg-[#3064d0] text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Check size={13} />
                <span>Apply Resolution & Save</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-2 bg-[#18191b] overflow-hidden">
            <textarea
              value={mergedContent}
              onChange={(e) => setMergedContent(e.target.value)}
              className="w-full h-full bg-transparent font-mono text-xs text-[#dcdcdc] p-2 focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
