import React, { useState } from 'react';
import { Check, X, Edit3, ShieldAlert } from 'lucide-react';

interface HitlInterruptModalProps {
  isOpen: boolean;
  title: string;
  reason: string;
  diffContent: string;
  onApprove: (modifiedDiff?: string) => void;
  onReject: () => void;
}

export const HitlInterruptModal: React.FC<HitlInterruptModalProps> = ({
  isOpen,
  title,
  reason,
  diffContent,
  onApprove,
  onReject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableDiff, setEditableDiff] = useState(diffContent);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border-2 border-rose-500/80 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-rose-950/40 border-b border-rose-500/30">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span className="font-semibold text-white text-sm">Human-in-the-Loop (HITL) Interrupt</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-900/60 text-rose-300 border border-rose-700">
            Action Required
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col space-y-3 text-zinc-300">
          <div className="flex flex-col space-y-1">
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-xs text-zinc-400">{reason}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
            <span className="font-mono text-cyan-300">Proposed Code / Action Diff:</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'View Diff' : 'Edit Code Directly'}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={editableDiff}
              onChange={(e) => setEditableDiff(e.target.value)}
              className="w-full h-48 p-3 font-mono text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          ) : (
            <pre className="w-full max-h-48 p-3 font-mono text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-zinc-300 overflow-auto">
              <code>{editableDiff}</code>
            </pre>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end space-x-2 px-4 py-3 bg-[#0d1117] border-t border-[#30363d]">
          <button
            onClick={onReject}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Reject & Rollback</span>
          </button>
          <button
            onClick={() => onApprove(isEditing ? editableDiff : undefined)}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
          >
            <Check className="w-4 h-4" />
            <span>Approve & Continue Execution</span>
          </button>
        </div>
      </div>
    </div>
  );
};
