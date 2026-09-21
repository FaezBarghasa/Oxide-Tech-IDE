import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, FileText, ChevronRight, ChevronDown, 
  CaseSensitive, WholeWord, Regex as RegexIcon, Replace,
  CornerDownLeft, X, Loader2
} from 'lucide-react';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { useEditorStore } from '../../state/editorStore';
import { tauriCommands } from '../../services/tauri';
import { SearchFileGroup, SearchMatch, SearchOptions } from '../../types/oxide';

interface FindInFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FindInFilesModal({ isOpen, onClose }: FindInFilesModalProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [fileMask, setFileMask] = useState('');
  
  const [groups, setGroups] = useState<SearchFileGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [selectedMatch, setSelectedMatch] = useState<{ file: string; line: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const { workspaceRoot } = useFileSystemStore();
  const { openFile } = useEditorStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeSearch = useCallback(async () => {
    if (!query.trim()) {
      setGroups([]);
      return;
    }

    setIsSearching(true);
    try {
      const options: SearchOptions = {
        case_sensitive: caseSensitive,
        whole_word: wholeWord,
        use_regex: useRegex,
        include_glob: fileMask.trim() ? fileMask.trim() : undefined,
      };

      const results = await tauriCommands.searchWorkspaceText(
        workspaceRoot || '.',
        query,
        options
      );

      setGroups(results);
      if (results.length > 0 && results[0].matches.length > 0) {
        setSelectedMatch({
          file: results[0].file_path,
          line: results[0].matches[0].line_number
        });
      }
    } catch (err) {
      console.error('Find in files search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, caseSensitive, wholeWord, useRegex, fileMask, workspaceRoot]);

  // Debounced search when query or flags change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      executeSearch();
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, query, caseSensitive, wholeWord, useRegex, fileMask, executeSearch]);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  const handleMatchClick = async (match: SearchMatch) => {
    setSelectedMatch({ file: match.file_path, line: match.line_number });
    await openFile(match.file_path);
  };

  const handleReplaceAllInFile = async (filePath: string) => {
    if (!query) return;
    try {
      await tauriCommands.searchReplaceInFile(
        filePath,
        query,
        replaceText,
        useRegex,
        caseSensitive
      );
      executeSearch();
    } catch (err) {
      console.error('Replace failed in file:', filePath, err);
    }
  };

  const totalMatchesCount = groups.reduce((acc, g) => acc + g.matches.length, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-100 select-none font-sans">
      <div 
        className="w-[780px] h-[580px] bg-[#1e1f22] border border-[#393b40] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-[#26282d] border-b border-[#2b2d30] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-[#3574f0]" />
            <span className="text-xs font-semibold text-[#dfe1e5]">
              {showReplace ? 'Find and Replace in Files' : 'Find in Files'}
            </span>
            <span className="text-[11px] text-[#6f737a] font-mono">
              (Ctrl+Shift+F)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReplace(!showReplace)}
              className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                showReplace 
                  ? 'bg-[#3574f0]/20 border-[#3574f0] text-blue-300' 
                  : 'bg-[#2b2d30] border-[#393b40] text-[#868a91] hover:text-[#dfe1e5]'
              }`}
            >
              <Replace className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#868a91] hover:text-white rounded hover:bg-[#2b2d30] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Rows */}
        <div className="p-3 bg-[#1e1f22] border-b border-[#2b2d30] flex flex-col space-y-2">
          {/* Find Input */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-[#868a91] absolute left-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across workspace..."
                className="w-full bg-[#141517] border border-[#393b40] focus:border-[#3574f0] text-xs text-[#dfe1e5] pl-8 pr-3 py-1.5 rounded focus:outline-none placeholder-[#6f737a]"
              />
            </div>

            {/* Toggle Flags */}
            <div className="flex items-center space-x-1 bg-[#26282d] p-0.5 rounded border border-[#393b40]">
              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                title="Match Case (Alt+C)"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  caseSensitive ? 'bg-[#3574f0] text-white' : 'text-[#868a91] hover:text-white'
                }`}
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setWholeWord(!wholeWord)}
                title="Match Whole Word (Alt+W)"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  wholeWord ? 'bg-[#3574f0] text-white' : 'text-[#868a91] hover:text-white'
                }`}
              >
                <WholeWord className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setUseRegex(!useRegex)}
                title="Use Regular Expression (Alt+X)"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  useRegex ? 'bg-[#3574f0] text-white' : 'text-[#868a91] hover:text-white'
                }`}
              >
                <RegexIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* File mask */}
            <input
              type="text"
              value={fileMask}
              onChange={(e) => setFileMask(e.target.value)}
              placeholder="*.rs, src/**"
              title="File mask filter (e.g. *.rs)"
              className="w-28 bg-[#141517] border border-[#393b40] focus:border-[#3574f0] text-xs text-[#dfe1e5] px-2.5 py-1.5 rounded focus:outline-none placeholder-[#6f737a]"
            />
          </div>

          {/* Replace Input Row */}
          {showReplace && (
            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative flex-1 flex items-center">
                <Replace className="w-3.5 h-3.5 text-[#868a91] absolute left-2.5" />
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full bg-[#141517] border border-[#393b40] focus:border-[#3574f0] text-xs text-[#dfe1e5] pl-8 pr-3 py-1.5 rounded focus:outline-none placeholder-[#6f737a]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto bg-[#1e1f22] divide-y divide-[#2b2d30]/60">
          {isSearching ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-[#868a91]">
              <Loader2 className="w-6 h-6 animate-spin text-[#3574f0]" />
              <span className="text-xs">Searching workspace files...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-1 text-[#6f737a]">
              {query.trim() ? (
                <>
                  <span className="text-xs">No matches found for <strong className="text-[#dfe1e5]">"{query}"</strong></span>
                  <span className="text-[11px]">Try adjusting case sensitivity or file masks.</span>
                </>
              ) : (
                <span className="text-xs">Type a search query above to find matches across your project</span>
              )}
            </div>
          ) : (
            groups.map((group) => {
              const isCollapsed = !!collapsedFiles[group.file_path];
              return (
                <div key={group.file_path} className="flex flex-col">
                  {/* File Header */}
                  <div 
                    onClick={() => toggleFileCollapse(group.file_path)}
                    className="px-3 py-1.5 bg-[#26282d]/80 hover:bg-[#2b2d30] flex items-center justify-between cursor-pointer border-b border-[#2b2d30]/40 transition-colors"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-[#868a91]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#868a91]" />
                      )}
                      <FileText className="w-3.5 h-3.5 text-[#3574f0]" />
                      <span className="text-xs font-medium text-[#dfe1e5] truncate">{group.file_path}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#3574f0]/20 text-blue-300 rounded font-mono">
                        {group.matches.length}
                      </span>
                    </div>

                    {showReplace && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplaceAllInFile(group.file_path);
                        }}
                        className="px-2 py-0.5 text-[10px] bg-[#2b2d30] hover:bg-[#3574f0] text-[#dfe1e5] hover:text-white rounded border border-[#393b40] transition-colors"
                      >
                        Replace all in file
                      </button>
                    )}
                  </div>

                  {/* Match Lines */}
                  {!isCollapsed && (
                    <div className="flex flex-col">
                      {group.matches.map((match, mIdx) => {
                        const isSelected = selectedMatch?.file === match.file_path && selectedMatch?.line === match.line_number;
                        return (
                          <div
                            key={`${match.file_path}-${match.line_number}-${mIdx}`}
                            onClick={() => handleMatchClick(match)}
                            className={`px-6 py-1 flex items-center justify-between cursor-pointer text-xs font-mono transition-colors ${
                              isSelected ? 'bg-[#2e436e] text-white' : 'hover:bg-[#2b2d30] text-[#dfe1e5]'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className="text-[11px] text-[#6f737a] w-8 shrink-0 text-right">
                                {match.line_number}
                              </span>
                              <span className="truncate">
                                {match.line_text}
                              </span>
                            </div>

                            <CornerDownLeft className="w-3 h-3 text-[#6f737a] shrink-0 ml-2 opacity-0 group-hover:opacity-100" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="h-7 px-3 bg-[#1a1b1d] border-t border-[#2b2d30] flex items-center justify-between text-[11px] text-[#6f737a]">
          <div className="flex items-center space-x-3">
            <span>
              <strong className="text-[#868a91]">{totalMatchesCount}</strong> matches in <strong className="text-[#868a91]">{groups.length}</strong> files
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span><strong className="text-[#868a91]">Esc</strong> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
