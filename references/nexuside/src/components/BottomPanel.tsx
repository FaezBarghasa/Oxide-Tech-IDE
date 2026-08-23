import React from "react";
import { BuildStep } from "../types";

interface BottomPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  buildStatus: "error" | "success" | "pending";
  buildLogs: string;
  buildSteps: BuildStep[];
  selectedStepId: string;
  setSelectedStepId: (id: string) => void;
  terminalLogs: string[];
}

export default function BottomPanel({
  activeTab,
  setActiveTab,
  buildStatus,
  buildLogs,
  buildSteps,
  selectedStepId,
  setSelectedStepId,
  terminalLogs,
}: BottomPanelProps) {
  
  const bottomTabs = [
    "Build",
    "Sync",
    "Terminal",
    "Output",
    "Debug Console",
    "Problems",
    "Serial Monitor",
    "MQTT Monitor",
  ];

  // Recursively render build list items
  const renderBuildStep = (step: BuildStep, level: number = 0) => {
    const isSelected = selectedStepId === step.id;
    return (
      <div key={step.id}>
        <div
          onClick={() => setSelectedStepId(step.id)}
          style={{ paddingLeft: `${Math.max(4, level * 10)}px` }}
          className={`flex items-center gap-1.5 py-1 px-1 cursor-pointer hover:bg-surface-variant/30 rounded text-on-surface text-[11.5px] transition-colors ${
            isSelected ? "bg-surface-variant/60" : ""
          }`}
        >
          {step.children && step.children.length > 0 ? (
            <span className="material-symbols-outlined text-[12px] text-outline">
              expand_more
            </span>
          ) : (
            <span className="w-[12px]"></span>
          )}

          <span className="material-symbols-outlined text-[13px] font-bold shrink-0">
            {step.status === "error"
              ? "error"
              : step.status === "success"
              ? "check_circle"
              : "sync"}
          </span>

          <span
            className={`${
              step.status === "error"
                ? "text-error font-medium"
                : step.status === "success"
                ? "text-secondary"
                : "text-amber-400 font-medium"
            }`}
          >
            {step.name}
          </span>

          {step.time && (
            <span className="text-outline-variant text-[9.5px] truncate">
              {step.time}
            </span>
          )}

          {step.duration && (
            <span className="ml-auto text-outline-variant text-[9px] shrink-0">
              {step.duration}
            </span>
          )}
        </div>

        {step.children &&
          step.children.map((child) => renderBuildStep(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-64 border-t border-outline-variant bg-surface flex flex-col shrink-0 overflow-hidden">
      {/* Tab headers */}
      <div className="h-8 flex bg-surface border-b border-outline-variant overflow-x-auto shrink-0 select-none">
        {bottomTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 flex items-center gap-1.5 h-full font-body-sm text-[12px] cursor-pointer transition-colors relative ${
                isActive
                  ? "text-on-surface border-b-2 border-primary bg-surface-variant/10 font-semibold"
                  : "text-on-surface-variant border-b-2 border-transparent hover:bg-surface-variant/30 hover:text-on-surface"
              } ${tab === "Sync" ? "border-r border-outline-variant" : ""}`}
            >
              <span>{tab}</span>
              {tab === "Sync" && (
                <span className="material-symbols-outlined text-[11px] hover:text-error rounded-full hover:bg-surface-variant/50 p-0.5">
                  close
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab panel body content */}
      <div className="flex-1 flex overflow-hidden font-code-md text-[12px] text-on-surface">
        {activeTab === "Build" && (
          <>
            {/* Left Column: Build tree hierarchy */}
            <div className="w-[320px] border-r border-outline-variant/30 overflow-y-auto bg-surface flex flex-col shrink-0 select-none">
              <div className="flex items-center justify-between px-2 py-1 border-b border-outline-variant/30 text-outline-variant bg-surface-container-lowest shrink-0">
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={() => alert("Re-syncing project build steps...")}
                    className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface"
                    title="Rerun Sync"
                  >
                    sync
                  </span>
                  <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface">
                    arrow_drop_down
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface">
                    push_pin
                  </span>
                  <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface">
                    visibility
                  </span>
                </div>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto">
                {buildSteps.map((step) => renderBuildStep(step, 0))}
              </div>
            </div>

            {/* Right Column: Build terminal logs */}
            <div className="flex-1 overflow-auto p-3 leading-[18px] relative bg-surface-container-lowest font-mono select-text selection:bg-primary/20">
              <div className="absolute right-2 top-2 flex flex-col gap-1 text-outline-variant select-none">
                <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface">
                  sort
                </span>
                <span
                  onClick={() => alert("Logs cleared.")}
                  className="material-symbols-outlined text-[14px] cursor-pointer hover:text-on-surface"
                >
                  delete
                </span>
              </div>

              {buildStatus === "error" ? (
                <div className="text-red-400 whitespace-pre">
                  {buildLogs}
                </div>
              ) : (
                <div className="text-secondary whitespace-pre font-mono">
                  {buildLogs}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "Sync" && (
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[12px] bg-surface-container-lowest leading-[20px]">
            <span className="text-secondary"># Sync Report for Workspace Member oxide-plugin-intellij</span>
            <div className="mt-2 text-outline">Detected platform: x86_64-unknown-linux-gnu</div>
            <div className="text-outline">Cargo tool version: rustc 1.76.0 (07d475490 2024-01-28)</div>
            <div className="mt-2 border-t border-outline-variant/20 pt-2 text-error">
              {buildStatus === "error"
                ? "Workspace contains unresolved missing dependencies. Run static check or attach Cargo.toml references."
                : "Sync complete! Cargo binary workspace synchronized successfully."}
            </div>
          </div>
        )}

        {activeTab === "Terminal" && (
          <div className="flex-1 p-3 bg-surface-container-lowest font-mono text-[12.5px] overflow-y-auto flex flex-col select-text leading-[19px]">
            <div className="text-outline">jrad@Oxide-tech-plugins-workspace:~/oxide-plugin-intellij$ cargo check</div>
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{log}</div>
            ))}
            <div className="flex items-center gap-1.5 text-on-surface mt-1 border-t border-outline-variant/10 pt-1">
              <span className="text-primary font-bold">jrad@workspace:~$</span>
              <input
                type="text"
                placeholder="Type terminal commands..."
                className="bg-transparent border-none outline-none flex-1 text-on-surface focus:ring-0 p-0 text-[12.5px] font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    alert(`Command execution simulated: ${(e.target as HTMLInputElement).value}`);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>
        )}

        {bottomTabs.slice(3).map((tab) => {
          if (activeTab !== tab) return null;
          return (
            <div key={tab} className="flex-1 p-4 bg-surface-container-lowest flex items-center justify-center text-outline">
              <div className="text-center font-sans">
                <span className="material-symbols-outlined text-outline/40 text-[24px] mb-1">
                  monitoring
                </span>
                <p className="text-[12px] capitalize">{tab} is idle.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
