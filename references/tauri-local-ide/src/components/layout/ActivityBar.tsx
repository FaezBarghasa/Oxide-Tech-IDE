import React from 'react';
import { Files, Search, GitBranch, PlayCircle, Settings, Layers, Bot } from 'lucide-react';

export function ActivityBar() {
  return (
    <aside className="w-12 bg-darcula-toolwindow border-r border-darcula-border flex flex-col items-center py-4 space-y-6 flex-shrink-0">
      <button className="text-darcula-accent" title="Explorer">
        <Files className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
      <button className="text-darcula-text hover:text-white transition-colors relative" title="Agents">
        <Bot className="w-[22px] h-[22px] stroke-[1.5]" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-darcula-accent rounded-full" />
      </button>
      <button className="text-darcula-text hover:text-white transition-colors" title="Search">
        <Search className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
      <button className="text-darcula-text hover:text-white transition-colors" title="Source Control">
        <GitBranch className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
      <button className="text-darcula-text hover:text-white transition-colors" title="Run & Debug">
        <PlayCircle className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
      <button className="text-darcula-text hover:text-white transition-colors" title="Extensions">
        <Layers className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
      <div className="flex-1"></div>
      <button className="text-darcula-text hover:text-white transition-colors mb-2" title="Settings">
        <Settings className="w-[22px] h-[22px] stroke-[1.5]" />
      </button>
    </aside>
  );
}
