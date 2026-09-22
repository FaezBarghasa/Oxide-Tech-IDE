import React, { useEffect, useState } from 'react';
import { Brain, AlertTriangle, Plus, Search, Tag, Check, RefreshCw, Layers } from 'lucide-react';
import { OxideEmbedService } from '../../services/oxideEmbed';
import type { MemoryRecordItem, MemoryConflictItem, MemoryKindType } from '../../types/oxide';

export const MemantoMemoryDrawer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'memories' | 'conflicts' | 'add'>('memories');
  const [memories, setMemories] = useState<MemoryRecordItem[]>([]);
  const [conflicts, setConflicts] = useState<MemoryConflictItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<MemoryKindType | ''>('');
  const [loading, setLoading] = useState(false);

  // New Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newKind, setNewKind] = useState<MemoryKindType>('instruction');
  const [newTags, setNewTags] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await OxideEmbedService.recallMemories(
        searchQuery,
        selectedKind ? (selectedKind as MemoryKindType) : undefined,
        20
      );
      setMemories(res);
    } catch (err) {
      console.error('[Memanto] Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await OxideEmbedService.getMemoryConflicts();
      setConflicts(res);
    } catch (err) {
      console.error('[Memanto] Error fetching conflicts:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'memories') {
      fetchMemories();
    } else if (activeTab === 'conflicts') {
      fetchConflicts();
    }
  }, [activeTab, selectedKind]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      const tagsList = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await OxideEmbedService.rememberMemory(
        newContent,
        newKind,
        newTitle || 'Rule',
        tagsList,
        newSymbol || undefined
      );

      // Reset form & reload
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setNewSymbol('');
      setActiveTab('memories');
      fetchMemories();
    } catch (err) {
      console.error('[Memanto] Error creating memory:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans">
      {/* Drawer Header */}
      <div className="p-3 border-b border-[#2b2d30] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-[#70a5fd]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#868a91]">
            Memanto Cognitive Memory Fabric
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#26282d] p-0.5 rounded border border-[#35373c] text-[11px]">
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'memories' ? 'bg-[#3574f0] text-white font-medium' : 'text-[#868a91] hover:text-[#dfe1e5]'
            }`}
          >
            Memories ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
              activeTab === 'conflicts'
                ? 'bg-[#e5c07b] text-black font-medium'
                : 'text-[#868a91] hover:text-[#dfe1e5]'
            }`}
          >
            {conflicts.length > 0 && <AlertTriangle className="w-3 h-3 text-[#f75454]" />}
            <span>Conflicts ({conflicts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
              activeTab === 'add' ? 'bg-[#3574f0] text-white font-medium' : 'text-[#868a91] hover:text-[#dfe1e5]'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'memories' && (
          <div className="space-y-3">
            {/* Search and Filters */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#868a91]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMemories()}
                  placeholder="Recall memories (e.g. no_std, STM32, RTIC)..."
                  className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded pl-8 pr-3 py-1.5 text-xs text-[#dfe1e5] placeholder-[#666a73] outline-none"
                />
              </div>

              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value as MemoryKindType | '')}
                className="bg-[#26282d] border border-[#35373c] rounded px-2 py-1.5 text-xs text-[#dfe1e5] outline-none"
              >
                <option value="">All Categories</option>
                <option value="instruction">Instruction</option>
                <option value="decision">Decision</option>
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
                <option value="learning">Learning</option>
              </select>

              <button
                onClick={fetchMemories}
                disabled={loading}
                className="p-1.5 bg-[#26282d] border border-[#35373c] rounded hover:bg-[#35373c] text-[#868a91] hover:text-[#dfe1e5]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3574f0]' : ''}`} />
              </button>
            </div>

            {/* Memories List */}
            <div className="space-y-2">
              {memories.map((mem) => (
                <div key={mem.id} className="bg-[#26282d] border border-[#35373c] rounded-md p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-[#dfe1e5]">{mem.title}</span>
                      <span className="text-[9px] bg-[#35373c] text-[#70a5fd] px-1.5 py-0.5 rounded uppercase font-mono">
                        {mem.kind}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#868a91]">
                      {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#a8abb2] leading-relaxed whitespace-pre-wrap">{mem.content}</p>

                  {/* Tags and Metadata */}
                  <div className="flex items-center space-x-2 pt-1">
                    {mem.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="flex items-center text-[10px] bg-[#1e1f22] text-[#868a91] px-1.5 py-0.5 rounded border border-[#2b2d30]"
                      >
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {t}
                      </span>
                    ))}
                    {mem.symbol_ref && (
                      <span className="text-[10px] text-[#70a5fd] font-mono truncate">
                        governs: {mem.symbol_ref}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {memories.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-40 text-[#868a91] space-y-2">
                  <Layers className="w-8 h-8 text-[#565961]" />
                  <span className="text-xs">No active memory records found.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="space-y-3">
            <div className="text-xs text-[#868a91]">
              Memanto conflict detection analyzes semantic contradictions across stored architectural decisions.
            </div>

            {conflicts.map((c, idx) => (
              <div key={idx} className="bg-[#26282d] border border-[#f75454]/40 rounded-md p-3 space-y-2">
                <div className="flex items-center space-x-2 text-[#f75454] font-medium text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Contradiction Detected ({(c.similarity_score * 100).toFixed(0)}% semantic overlap)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1e1f22] p-2 rounded border border-[#35373c] space-y-1">
                    <div className="font-semibold text-[#dfe1e5]">{c.record_a.title}</div>
                    <div className="text-[#a8abb2] text-[11px]">{c.record_a.content}</div>
                  </div>
                  <div className="bg-[#1e1f22] p-2 rounded border border-[#35373c] space-y-1">
                    <div className="font-semibold text-[#dfe1e5]">{c.record_b.title}</div>
                    <div className="text-[#a8abb2] text-[11px]">{c.record_b.content}</div>
                  </div>
                </div>
              </div>
            ))}

            {conflicts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-[#868a91] space-y-2">
                <Check className="w-8 h-8 text-[#57a64a]" />
                <span className="text-xs text-[#57a64a] font-medium">Zero rule conflicts detected across codebase.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={handleCreateMemory} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] text-[#868a91] font-medium">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Bare-Metal STM32 Rules"
                className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded px-2.5 py-1.5 text-xs text-[#dfe1e5] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#868a91] font-medium">Category</label>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as MemoryKindType)}
                className="w-full bg-[#26282d] border border-[#35373c] rounded px-2.5 py-1.5 text-xs text-[#dfe1e5] outline-none"
              >
                <option value="instruction">Instruction (Hard Rule)</option>
                <option value="decision">Architectural Decision</option>
                <option value="preference">User Preference</option>
                <option value="fact">System Fact</option>
                <option value="learning">Learning / Post-Mortem</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#868a91] font-medium">Content</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                placeholder="Specify rule or decision to persist in cognitive memory fabric..."
                className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded px-2.5 py-1.5 text-xs text-[#dfe1e5] outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#868a91] font-medium">Tags (comma-separated)</label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="embedded, no_std, stm32, safety"
                className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded px-2.5 py-1.5 text-xs text-[#dfe1e5] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#868a91] font-medium">Governed Symbol (optional)</label>
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="e.g. stm32_spi_init"
                className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded px-2.5 py-1.5 text-xs text-[#dfe1e5] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="w-full bg-[#3574f0] hover:bg-[#3369d6] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded transition-colors"
            >
              {submitting ? 'Persisting...' : 'Remember in Memanto Fabric'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
