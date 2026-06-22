import React, { useState } from 'react';
import { Inbox, CheckCircle2, Loader2, MessageSquare, Plus, ArrowRight } from 'lucide-react';

export function AgentInbox() {
  // Task 3.2.1: Background Task Sidebar
  const [tasks] = useState([
    { id: '1', title: 'Implement Vector RAG Indexer', status: 'running', time: 'Just now' },
    { id: '2', title: 'Refactor AST Parser logic', status: 'complete', time: '2m ago' }
  ]);

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full hidden xl:flex">
      <div className="h-9 border-b border-zinc-800 flex items-center px-4 bg-zinc-900 justify-between">
        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
           Agents
        </div>
        <div className="flex items-center space-x-2">
           <span className="bg-orange-500/20 text-orange-500 rounded px-1.5 py-0.5 text-[9px] font-bold">1 ACTIVE</span>
           <button className="text-zinc-500 hover:text-white transition-colors"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Task 3.2.2: Non-Blocking Diff Inbox */}
        {tasks.map(task => (
           <div key={task.id} className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 cursor-pointer transition-all group shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-zinc-200 font-medium leading-snug pr-2">{task.title}</span>
                {task.status === 'running' ? (
                  <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center justify-between mt-3 text-[10px]">
                 <span className="text-zinc-600 font-mono tracking-wider">{task.time}</span>
                 {task.status === 'complete' && (
                   <span className="text-orange-500 font-bold uppercase tracking-wider flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                     View Diff <ArrowRight className="w-3 h-3 ml-1" />
                   </span>
                 )}
              </div>
           </div>
        ))}
      </div>
      
      {/* Universal Command Input */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950">
        <div className="relative">
          <textarea 
            placeholder="Type / to assign an agent..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-xs text-zinc-100 resize-none h-20 focus:outline-none focus:border-orange-500/50 shadow-inner" 
          />
          {/* Task 3.1.2: Context Parser Hook overlay */}
          <div className="absolute right-2 bottom-2 text-[9px] text-zinc-600 font-mono tracking-widest flex items-center">
             <kbd className="bg-zinc-800 px-1 py-0.5 rounded mr-1">⌘</kbd> + <kbd className="bg-zinc-800 px-1 py-0.5 rounded ml-1">↵</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
