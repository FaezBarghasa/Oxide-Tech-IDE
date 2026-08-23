import React from 'react';
import { useGitStore } from '../../state/gitStore';
import { GitBranch, GitCommit, RefreshCcw } from 'lucide-react';

export function GitPanel() {
  const { files, branch, refreshStatus } = useGitStore();

  return (
    <div className="flex flex-col h-full bg-darcula-toolwindow text-darcula-text border-r border-darcula-border">
      <div className="p-3 border-b border-darcula-border flex items-center justify-between font-bold text-xs uppercase tracking-widest text-darcula-text/70">
        <div className="flex items-center">
            <GitBranch className="w-4 h-4 mr-2 text-darcula-accent" /> Source Control
        </div>
        <button onClick={refreshStatus}><RefreshCcw className="w-3 h-3"/></button>
      </div>
      <div className="p-2 text-xs font-mono">Current branch: {branch}</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map(file => (
          <div key={file.path} className="flex justify-between items-center p-1 hover:bg-darcula-selection rounded">
            <span>{file.path}</span>
            <span className="text-[10px] text-darcula-text/50">{file.status}</span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-darcula-border">
          <button className="w-full flex items-center justify-center p-2 bg-darcula-accent rounded text-white text-xs">
              <GitCommit className="w-4 h-4 mr-2" /> Commit
          </button>
      </div>
    </div>
  );
}
