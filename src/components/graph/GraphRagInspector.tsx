import React, { useState } from 'react';
import { Search, GitBranch, ArrowUpRight, ArrowDownLeft, ShieldAlert, FileText } from 'lucide-react';
import { OxideEmbedService } from '../../services/oxideEmbed';
import type { BlastRadiusSummary } from '../../types/oxide';

export const GraphRagInspector: React.FC = () => {
  const [symbolQuery, setSymbolQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BlastRadiusSummary | null>(null);
  const [searched, setSearched] = useState(false);

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbolQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await OxideEmbedService.getImpact(symbolQuery.trim());
      setSummary(res);
    } catch (err) {
      console.error('[GraphRagInspector] Inspection error:', err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans">
      {/* Header */}
      <div className="p-3 border-b border-[#2b2d30] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-[#70a5fd]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#868a91]">
            GraphRAG & Blast Radius Inspector
          </span>
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleInspect} className="p-3 border-b border-[#2b2d30]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#868a91]" />
          <input
            type="text"
            value={symbolQuery}
            onChange={(e) => setSymbolQuery(e.target.value)}
            placeholder="Search target symbol (e.g. SurrealProjectStore)..."
            className="w-full bg-[#26282d] border border-[#35373c] focus:border-[#3574f0] rounded pl-8 pr-16 py-1.5 text-xs text-[#dfe1e5] placeholder-[#666a73] outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1.5 bg-[#3574f0] hover:bg-[#3369d6] disabled:opacity-50 text-white text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {summary ? (
          <>
            {/* Target Overview Card */}
            <div className="bg-[#26282d] border border-[#35373c] rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-[#70a5fd]">{summary.symbol}</span>
                  <span className="text-[10px] bg-[#35373c] text-[#868a91] px-1.5 py-0.5 rounded uppercase font-mono">
                    {summary.details.symbol_kind}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <ShieldAlert
                    className={`w-3.5 h-3.5 ${
                      summary.risk_level === 'high' || summary.risk_level === 'critical'
                        ? 'text-[#f75454]'
                        : 'text-[#e5c07b]'
                    }`}
                  />
                  <span className="text-xs capitalize font-medium">{summary.risk_level} Risk</span>
                </div>
              </div>

              <div className="text-xs text-[#868a91] font-mono truncate">
                File: <span className="text-[#dfe1e5]">{summary.file_path}</span>
              </div>

              {summary.details.signature && (
                <div className="bg-[#1e1f22] p-2 rounded text-[11px] font-mono text-[#a8abb2] border border-[#2b2d30] overflow-x-auto">
                  {summary.details.signature}
                </div>
              )}
            </div>

            {/* Inbound Callers (Breakage Risk) */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#f75454]">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Inbound Callers ({summary.details.callers.length})</span>
                <span className="text-[10px] text-[#868a91] font-normal">— will break on signature modification</span>
              </div>
              <div className="bg-[#26282d] border border-[#35373c] rounded-md p-2 divide-y divide-[#35373c] text-xs font-mono">
                {summary.details.callers.length > 0 ? (
                  summary.details.callers.map((c, i) => (
                    <div key={i} className="py-1.5 flex items-center space-x-2 text-[#dfe1e5]">
                      <span className="text-[#f75454]">←</span>
                      <span className="truncate">{c}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-[#868a91] text-center font-sans text-xs">No direct inbound callers detected.</div>
                )}
              </div>
            </div>

            {/* Outbound Callees */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#57a64a]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Outbound Callees ({summary.details.callees.length})</span>
                <span className="text-[10px] text-[#868a91] font-normal">— downstream functions invoked</span>
              </div>
              <div className="bg-[#26282d] border border-[#35373c] rounded-md p-2 divide-y divide-[#35373c] text-xs font-mono">
                {summary.details.callees.length > 0 ? (
                  summary.details.callees.map((c, i) => (
                    <div key={i} className="py-1.5 flex items-center space-x-2 text-[#dfe1e5]">
                      <span className="text-[#57a64a]">→</span>
                      <span className="truncate">{c}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-[#868a91] text-center font-sans text-xs">No outbound callees detected.</div>
                )}
              </div>
            </div>

            {/* Doc References */}
            {summary.details.doc_references.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#e5c07b]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Linked Documentation ({summary.details.doc_references.length})</span>
                </div>
                <div className="bg-[#26282d] border border-[#35373c] rounded-md p-2 text-xs space-y-1">
                  {summary.details.doc_references.map((doc, idx) => (
                    <div key={idx} className="text-[#a8abb2] py-1 border-b border-[#35373c] last:border-none">
                      • {doc}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : searched && !loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#868a91] space-y-2">
            <ShieldAlert className="w-8 h-8 text-[#565961]" />
            <span className="text-xs">Symbol not found in active AST graph.</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-[#868a91] space-y-2">
            <GitBranch className="w-8 h-8 text-[#565961]" />
            <span className="text-xs text-center">
              Search a symbol to calculate blast radius before making refactoring changes.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
