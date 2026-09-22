import React, { useState, useEffect, useRef } from 'react';
import { Search, Code2, Box, Cpu, FileText, ArrowRight } from 'lucide-react';
import { OxideEmbedService } from '../../services/oxideEmbed';
import { StairHit } from '../../types/oxide';

interface StairSymbolPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (hit: StairHit) => void;
}

export const StairSymbolPalette: React.FC<StairSymbolPaletteProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<StairHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setHits([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await OxideEmbedService.stairSearch(query, 15);
        setHits(results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Failed to search STAIR symbols:', err);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (hits.length > 0 ? (prev + 1) % hits.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (hits.length > 0 ? (prev - 1 + hits.length) % hits.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[selectedIndex]) {
        onSelectSymbol(hits[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-xs">
      <div className="w-[640px] bg-[#1e1f22] border border-[#393b40] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-[#2b2d30] bg-[#25272a]">
          <Search className="w-4 h-4 text-[#3574f0] mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm text-[#dfe1e5] focus:outline-hidden placeholder-[#868a91] font-mono"
            placeholder="Search AST Symbols (STAIR Hierarchical Code-ToC)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-[#3574f0] border-t-transparent rounded-full animate-spin ml-2 shrink-0" />
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#2b2d30]/40">
          {hits.length === 0 ? (
            <div className="p-8 text-center text-[#868a91] text-xs font-mono">
              {query ? 'No matching AST symbols found' : 'Type a symbol name, peripheral, or function to jump...'}
            </div>
          ) : (
            hits.map((hit, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${hit.file_path}-${hit.start_line}-${hit.leaf_symbol}-${idx}`}
                  onClick={() => {
                    onSelectSymbol(hit);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-[#2b2d30] text-white' : 'text-[#868a91] hover:bg-[#25272a]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    {hit.macro_parent ? (
                      <Box className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                    ) : hit.file_path.endsWith('.svd') || hit.file_path.endsWith('.ld') ? (
                      <Cpu className="w-3.5 h-3.5 text-[#98c379] shrink-0" />
                    ) : hit.file_path.endsWith('.md') ? (
                      <FileText className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5 text-[#3574f0] shrink-0" />
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-1.5 font-mono text-[12px] truncate">
                        <span className="font-semibold text-white">{hit.leaf_symbol}</span>
                        {hit.signature && (
                          <span className="text-[#868a91] text-[11px] truncate">{hit.signature}</span>
                        )}
                      </div>
                      {hit.breadcrumbs.length > 1 && (
                        <div className="text-[10px] text-[#868a91]/70 font-mono truncate">
                          {hit.breadcrumbs.slice(0, -1).join(' > ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 text-[10px] font-mono text-[#868a91]">
                    <span>{hit.file_path}:{hit.start_line}</span>
                    {isSelected && <ArrowRight className="w-3 h-3 text-[#3574f0]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-3 py-1.5 bg-[#18191b] border-t border-[#2b2d30] flex items-center justify-between text-[10px] text-[#868a91] font-mono">
          <span>↑↓ Navigate</span>
          <span>↵ Jump to Definition</span>
          <span>ESC Dismiss</span>
        </div>
      </div>
    </div>
  );
};
