import { useEffect, useState } from 'react';
import { History, RotateCcw, Clock, FileCode, Eye } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { tauriCommands } from '../../services/tauri';
import { LocalHistoryRevision } from '../../types/oxide';

export function LocalHistoryToolWindow() {
  const currentFile = useEditorStore((s) => s.currentFile);
  const updateFileContent = useEditorStore((s) => s.updateFileContent);
  const [revisions, setRevisions] = useState<LocalHistoryRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<LocalHistoryRevision | null>(null);
  const [revisionContent, setRevisionContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  useEffect(() => {
    if (!currentFile) {
      setRevisions([]);
      setSelectedRevision(null);
      setRevisionContent('');
      return;
    }

    async function loadHistory() {
      if (!currentFile) return;
      setIsLoading(true);
      try {
        const revs = await tauriCommands.localHistoryGetRevisions(currentFile);
        setRevisions(revs);
        if (revs.length > 0) {
          setSelectedRevision(revs[0]);
          setRevisionContent(revs[0].content);
        } else {
          setSelectedRevision(null);
          setRevisionContent('');
        }
      } catch (err) {
        console.error('Failed to load local history revisions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [currentFile]);

  const handleSelectRevision = async (rev: LocalHistoryRevision) => {
    setSelectedRevision(rev);
    try {
      if (currentFile) {
        const content = await tauriCommands.localHistoryGetRevisionContent(currentFile, rev.id);
        setRevisionContent(content);
      }
    } catch {
      setRevisionContent(rev.content);
    }
  };

  const handleRestoreRevision = async () => {
    if (!currentFile || !selectedRevision) return;
    setIsRestoring(true);
    try {
      updateFileContent(currentFile, revisionContent);
      // Take snapshot of restore action
      await tauriCommands.localHistoryRecordSnapshot(currentFile, revisionContent, `revert-to-${selectedRevision.id.slice(0, 7)}`);
      // Reload revisions
      const revs = await tauriCommands.localHistoryGetRevisions(currentFile);
      setRevisions(revs);
    } catch (err) {
      console.error('Failed to restore revision:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatTimestamp = (ts: string | number) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <div className="flex h-full w-full bg-[#1e1f22] text-[#bcbec4] select-none text-xs font-sans">
      {/* Left panel: Revision timeline list */}
      <div className="w-72 flex flex-col border-r border-[#2b2d30] bg-[#18191b]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b2d30] bg-[#1e1f22]">
          <div className="flex items-center gap-1.5 font-medium text-[#dfe1e5]">
            <History size={14} className="text-[#3574f0]" />
            <span>Local History</span>
          </div>
          <span className="text-[10px] text-[#707278] bg-[#2b2d30] px-1.5 py-0.5 rounded">
            {revisions.length} revs
          </span>
        </div>

        {!currentFile ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[#707278]">
            <FileCode size={24} className="mb-2 opacity-40" />
            <p>No active file in editor</p>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center text-[#707278]">
            <span>Loading revisions...</span>
          </div>
        ) : revisions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[#707278]">
            <Clock size={24} className="mb-2 opacity-40" />
            <p>No local revisions recorded for this file yet.</p>
            <p className="text-[10px] mt-1 text-[#56585c]">Save or edit to create snapshots.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-[#232529]">
            {revisions.map((rev) => {
              const isSelected = selectedRevision?.id === rev.id;
              return (
                <button
                  key={rev.id}
                  onClick={() => handleSelectRevision(rev)}
                  className={`w-full text-left p-2.5 flex flex-col gap-1 transition-colors ${
                    isSelected
                      ? 'bg-[#2e436e] text-[#ffffff]'
                      : 'hover:bg-[#26282e] text-[#bcbec4]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3574f0]" />
                      {rev.trigger_tag || 'manual-save'}
                    </span>
                    <span className="text-[10px] text-[#868a91] font-mono">
                      {rev.id.slice(0, 7)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#707278]">
                    <span>{formatTimestamp(rev.timestamp)}</span>
                    <span>{rev.byte_size} B</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right panel: Revision preview & Restore */}
      <div className="flex-1 flex flex-col bg-[#1e1f22]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b2d30] bg-[#1e1f22]">
          <div className="flex items-center gap-2">
            <Eye size={13} className="text-[#6c707e]" />
            <span className="text-[#dfe1e5] font-mono text-[11px]">
              {selectedRevision ? `Revision: ${selectedRevision.id.slice(0, 12)} (${selectedRevision.trigger_tag})` : 'Preview'}
            </span>
          </div>
          {selectedRevision && (
            <button
              onClick={handleRestoreRevision}
              disabled={isRestoring}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#3574f0] hover:bg-[#3064d0] text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} />
              <span>Restore this Version</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 font-mono text-xs text-[#dcdcdc] bg-[#18191b] leading-relaxed select-text">
          {selectedRevision ? (
            <pre className="whitespace-pre">{revisionContent}</pre>
          ) : (
            <div className="h-full flex items-center justify-center text-[#707278]">
              <span>Select a revision from the left to view contents</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
