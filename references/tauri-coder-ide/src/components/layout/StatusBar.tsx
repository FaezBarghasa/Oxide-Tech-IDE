import React, { useState, useEffect } from 'react';
import { Cpu, Server, Activity, GitBranch } from 'lucide-react';

/**
 * Global Status bar, displaying layout metrics and system stats
 * @returns React Component for Status Bar
 */
export function StatusBar() {
  const [cpuLoad, setCpuLoad] = useState(0);
  const [ramUsed, setRamUsed] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * 15) + 2);
      setRamUsed(Math.floor(Math.random() * 200) + 600); // 600-800MB
    }, 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="h-6 bg-[#2b2d30] border-t border-[#1e1f22] flex items-center justify-between px-3 text-[10px] text-gray-400 font-sans shrink-0 cursor-default select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-gray-200 cursor-pointer">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Backend: ws://127.0.0.1:8080</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" title="CPU Usage">
          <Cpu className="w-3 h-3 text-purple-400" />
          <span>{cpuLoad}%</span>
        </div>
        <div className="flex items-center gap-1.5" title="Language Server">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>rust-analyzer (Idle)</span>
        </div>
        <div className="flex items-center gap-1" title="Memory Usage">
          <Server className="w-3 h-3 text-blue-400" />
          <span>{ramUsed} MB</span>
        </div>
        <span className="cursor-pointer hover:text-gray-200">UTF-8</span>
        <span className="cursor-pointer hover:text-gray-200">LF</span>
        <span className="cursor-pointer hover:text-gray-200 text-[#cc7832] font-semibold">Rust</span>
      </div>
    </div>
  );
}
