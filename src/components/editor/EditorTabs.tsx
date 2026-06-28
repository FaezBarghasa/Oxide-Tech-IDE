import { useEditorStore } from '../../state/editorStore';
import { X, FileCode2, FileText, Box, Braces } from 'lucide-react';
import { cn } from '../../utils/theme';
import { EditorToolbar } from './EditorToolbar';

const RustIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#e05d44] fill-none shrink-0" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="7" />
    <path d="M12 9v6M9 12h6" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);

const TSIcon = () => (
  <div className="w-3.5 h-3.5 bg-[#3178c6] text-white flex items-center justify-center font-bold text-[8px] rounded-sm select-none font-mono shrink-0">
    TS
  </div>
);

const TSXIcon = () => (
  <div className="w-3.5 h-3.5 bg-[#2f74c0] text-white flex items-center justify-center font-bold text-[7px] rounded-sm select-none font-mono px-0.5 shrink-0">
    TSX
  </div>
);

export function EditorTabs() {
  const { currentFile, openTabs, setCurrentFile, closeTab, files } = useEditorStore();

  if (openTabs.length === 0) {
    return null;
  }

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.rs')) return <RustIcon />;
    if (filename.endsWith('Cargo.toml')) return <Box className="w-3.5 h-3.5 text-[#cc7832] shrink-0" />;
    if (filename.endsWith('.tsx')) return <TSXIcon />;
    if (filename.endsWith('.ts')) return <TSIcon />;
    if (filename.endsWith('.json')) return <Braces className="w-3.5 h-3.5 text-[#d0a33c] shrink-0" />;
    if (filename.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-[#4ea1f7] shrink-0" />;
    return <FileCode2 className="w-3.5 h-3.5 text-ide-text/70 shrink-0" />;
  };

  const handleTabClick = (path: string) => {
    setCurrentFile(path);
  };

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    closeTab(path);
  };

  const handleAuxClick = (e: React.MouseEvent, path: string) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      closeTab(path);
    }
  };

  return (
    <div className="h-9 flex bg-ide-panel border-b border-ide-border select-none overflow-x-auto overflow-y-hidden scrollbar-none items-end shrink-0">
      <div className="flex flex-row items-end flex-1 min-w-0 pr-10">
        {openTabs.map((tabPath) => {
          const isActive = currentFile === tabPath;
          const fileData = files.get(tabPath);
          const filename = tabPath.split('/').pop() || tabPath;

          return (
            <div
              key={tabPath}
              onClick={() => handleTabClick(tabPath)}
              onAuxClick={(e) => handleAuxClick(e, tabPath)}
              className={cn(
                "group relative h-[30px] flex items-center space-x-2 px-3 border-r border-ide-border cursor-pointer transition-colors max-w-[180px] min-w-[90px] shrink-0 text-xs font-normal",
                isActive 
                  ? "bg-ide-bg text-white border-t border-t-ide-keyword/40" 
                  : "bg-ide-panel/85 text-ide-text/70 hover:bg-ide-hover/60 hover:text-ide-text"
              )}
            >
              {/* File Icon */}
              {getFileIcon(filename)}

              {/* Tab Title */}
              <span className={cn(
                "truncate flex-1 font-mono text-[11px]",
                isActive ? "font-medium" : ""
              )}>
                {filename}
              </span>

              {/* Indicator (Unsaved dot vs Close button) */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {fileData?.unsaved ? (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full bg-ide-keyword group-hover:hidden",
                    isActive ? "bg-ide-keyword" : "bg-ide-text/40"
                  )} />
                ) : null}
                
                <button
                  onClick={(e) => handleClose(e, tabPath)}
                  className={cn(
                    "p-0.5 rounded hover:bg-ide-hover/80 text-ide-text/40 hover:text-white transition-colors cursor-pointer",
                    isActive ? "flex" : "hidden group-hover:flex"
                  )}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Active Tab Blue Bottom Indicator Line (RustRover style) */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3574f0]" />
              )}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 h-full border-l border-ide-border flex items-center bg-ide-panel">
        <EditorToolbar />
      </div>
    </div>
  );
}
