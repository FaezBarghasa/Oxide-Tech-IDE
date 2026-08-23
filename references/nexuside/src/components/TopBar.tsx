import React, { useState } from "react";

interface TopBarProps {
  onRunBuild: () => void;
  isBuilding: boolean;
  onSearchOpen: () => void;
  envMode: string;
  setEnvMode: (m: string) => void;
}

export default function TopBar({
  onRunBuild,
  isBuilding,
  onSearchOpen,
  envMode,
  setEnvMode,
}: TopBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menus = [
    "File",
    "Edit",
    "View",
    "Navigate",
    "Code",
    "Refactor",
    "Build",
    "Run",
    "Tools",
    "Git",
    "Window",
    "Help",
  ];

  const handleMenuClick = (menu: string) => {
    if (activeMenu === menu) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menu);
    }
  };

  return (
    <header className="bg-surface-container-low text-primary font-body-md text-body-md w-full h-10 border-b border-outline-variant flex justify-between items-center px-3 shrink-0 z-50">
      <div className="flex items-center gap-3 h-full shrink-0">
        <div 
          onClick={() => alert("NexusIDE Professional Version 2026.1")}
          className="w-6 h-6 bg-surface-variant rounded flex items-center justify-center text-primary font-bold text-[12px] border border-outline-variant cursor-pointer hover:bg-surface-variant/80 transition-colors"
        >
          RR
        </div>
        
        {/* Nav Menus */}
        <div className="hidden md:flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm h-full relative">
          {menus.map((menu) => (
            <div key={menu} className="relative h-full flex items-center">
              <span
                onClick={() => handleMenuClick(menu)}
                className={`cursor-pointer hover:text-on-surface px-2 py-1 rounded transition-colors text-[12px] ${
                  activeMenu === menu ? "text-on-surface bg-surface-variant/50" : ""
                }`}
              >
                {menu}
              </span>

              {activeMenu === menu && (
                <div className="absolute top-[34px] left-0 bg-surface-container-high border border-outline-variant shadow-lg rounded-md py-1 min-w-[150px] z-[100] text-on-surface-variant">
                  <div
                    onClick={() => {
                      setActiveMenu(null);
                      alert(`Menu action: ${menu} -> Settings`);
                    }}
                    className="px-3 py-1.5 hover:bg-surface-variant hover:text-on-surface text-[12px] cursor-pointer"
                  >
                    Preferences
                  </div>
                  <div
                    onClick={() => {
                      setActiveMenu(null);
                      onSearchOpen();
                    }}
                    className="px-3 py-1.5 hover:bg-surface-variant hover:text-on-surface text-[12px] cursor-pointer flex justify-between"
                  >
                    <span>Search...</span>
                    <span className="text-[10px] text-outline">Ctrl+T</span>
                  </div>
                  <div className="border-t border-outline-variant/30 my-1"></div>
                  <div
                    onClick={() => {
                      setActiveMenu(null);
                      onRunBuild();
                    }}
                    className="px-3 py-1.5 hover:bg-surface-variant hover:text-on-surface text-[12px] cursor-pointer"
                  >
                    Force Sync Project
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Centered Search Bar */}
      <div className="flex-1 max-w-2xl mx-auto hidden lg:flex items-center justify-center">
        <div
          onClick={onSearchOpen}
          className="flex items-center bg-surface-variant/50 border border-outline-variant/50 rounded h-7 px-3 flex-1 max-w-[400px] text-on-surface-variant group hover:border-outline-variant transition-colors cursor-text"
        >
          <span className="material-symbols-outlined text-[14px] mr-2">search</span>
          <span className="text-[11px] opacity-70 flex-1">Search everywhere...</span>
          <span className="text-[10px] bg-surface border border-outline-variant/50 px-1.5 py-0.5 rounded ml-2 hidden xl:block">
            Ctrl+T
          </span>
        </div>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-2 h-full justify-end shrink-0">
        <div className="relative flex items-center gap-1 text-on-surface-variant text-[11px] mr-2">
          <select
            value={envMode}
            onChange={(e) => setEnvMode(e.target.value)}
            className="bg-transparent border-none py-1 pl-1 pr-6 cursor-pointer text-on-surface-variant focus:ring-0 outline-none hover:text-on-surface transition-colors capitalize text-[11px]"
          >
            <option value="dev" className="bg-surface-container">dev</option>
            <option value="production" className="bg-surface-container">production</option>
            <option value="test" className="bg-surface-container">test</option>
          </select>
        </div>

        <button
          onClick={onRunBuild}
          disabled={isBuilding}
          className={`h-6 px-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors rounded font-body-sm text-body-sm flex items-center gap-1 cursor-pointer active:opacity-80 border border-outline-variant/30 ${
            isBuilding ? "opacity-50 cursor-wait" : ""
          }`}
        >
          <span className={`material-symbols-outlined text-[14px] text-secondary ${isBuilding ? "animate-spin" : ""}`}>
            {isBuilding ? "sync" : "play_arrow"}
          </span>
          <span>{isBuilding ? "Running..." : "Run"}</span>
          <span className="material-symbols-outlined text-[12px]">expand_more</span>
        </button>

        <button
          onClick={() => {
            alert("Compiling project static checks...");
            onRunBuild();
          }}
          className="w-6 h-6 flex items-center justify-center text-outline hover:text-on-surface transition-colors rounded cursor-pointer active:opacity-80"
          title="Build/Hammer"
        >
          <span className="material-symbols-outlined text-[14px]">hammer</span>
        </button>

        <button
          onClick={onRunBuild}
          className="w-6 h-6 flex items-center justify-center text-secondary hover:text-secondary/80 transition-colors rounded cursor-pointer active:opacity-80"
          title="Run main.rs"
        >
          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
        </button>

        <button
          onClick={() => alert("Attaching rust debug probe...")}
          className="w-6 h-6 flex items-center justify-center text-secondary hover:text-secondary/80 transition-colors rounded cursor-pointer active:opacity-80"
          title="Debug Mode"
        >
          <span className="material-symbols-outlined text-[14px]">bug_report</span>
        </button>

        <div className="w-[1px] h-4 bg-outline-variant mx-1"></div>

        <button
          onClick={onSearchOpen}
          className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors rounded cursor-pointer active:opacity-80 lg:hidden"
        >
          <span className="material-symbols-outlined text-[14px]">search</span>
        </button>

        <button
          onClick={() => alert("IDE Settings: Workspace Theme configured to Modern Developer Pro.")}
          className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-variant transition-colors rounded cursor-pointer active:opacity-80"
          title="Settings"
        >
          <span className="material-symbols-outlined text-[14px]">settings</span>
        </button>
      </div>
    </header>
  );
}
