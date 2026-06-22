import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../../state/settingsStore';
import { X, Cpu, Radio, Network, Puzzle, Play, ShieldAlert, MonitorPlay } from 'lucide-react';

import { BackendTester } from '../previews/BackendTester';
import { SerialTerminal } from '../hardware/SerialTerminal';
import { MQTT5Client } from '../hardware/MQTT5Client';
import { ExtensionManager } from '../extensions/ExtensionManager';
import { SkillsOrchestrator } from '../ai/SkillsOrchestrator';
import { MCPExplorer } from '../mcp/MCPExplorer';
import { PreviewContainer } from '../previews/PreviewContainer';

export function TransientOverlay() {
  const { activeOverlay, setActiveOverlay, transientView, setTransientView } = useSettingsStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const isOpen = activeOverlay === 'transient';

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveOverlay(null);
        setTransientView(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !transientView) return null;

  const getHeaderIcon = () => {
    switch (transientView) {
      case 'rest':
        return <Network className="w-4.5 h-4.5 text-ide-keyword" />;
      case 'serial':
        return <Cpu className="w-4.5 h-4.5 text-ide-function" />;
      case 'mqtt':
        return <Radio className="w-4.5 h-4.5 text-green-400" />;
      case 'extensions':
        return <Puzzle className="w-4.5 h-4.5 text-ide-keyword animate-pulse" />;
      case 'skills':
        return <Play className="w-4.5 h-4.5 text-ide-function" />;
      case 'mcp':
        return <ShieldAlert className="w-4.5 h-4.5 text-yellow-400" />;
      case 'previews':
        return <MonitorPlay className="w-4.5 h-4.5 text-purple-400" />;
      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch (transientView) {
      case 'rest':
        return 'Ephemeral API REST Tester';
      case 'serial':
        return 'Hardware Serial Interface Logs';
      case 'mqtt':
        return 'MQTT v5 Telemetry Publisher';
      case 'extensions':
        return 'Extension Contributions Manager';
      case 'skills':
        return 'IDE Automation Skills Orchestrator';
      case 'mcp':
        return 'Model Context Protocol (MCP) Explorer';
      case 'previews':
        return 'Spatial Visual Previews Canvas';
      default:
        return 'Transient Tool View';
    }
  };

  const renderActiveView = () => {
    switch (transientView) {
      case 'rest':
        return <BackendTester />;
      case 'serial':
        return <SerialTerminal />;
      case 'mqtt':
        return <MQTT5Client />;
      case 'extensions':
        return <ExtensionManager />;
      case 'skills':
        return <SkillsOrchestrator />;
      case 'mcp':
        return <MCPExplorer />;
      case 'previews':
        return <PreviewContainer />;
      default:
        return <div className="p-8 text-center text-xs opacity-50">Invalid transient view selected.</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-45 flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div
        ref={overlayRef}
        className="w-full max-w-5xl h-[80vh] bg-ide-panel/95 border border-ide-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-ide-text"
      >
        {/* Header toolbar */}
        <div className="h-11 border-b border-ide-border px-4 flex items-center justify-between shrink-0 bg-ide-bg/40 select-none">
          <div className="flex items-center space-x-2.5">
            {getHeaderIcon()}
            <span className="text-xs font-bold text-white uppercase tracking-widest">{getHeaderTitle()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-[10px] text-ide-text/30 font-mono">Press Escape to Close</span>
            <button
              onClick={() => {
                setActiveOverlay(null);
                setTransientView(null);
              }}
              className="p-1 hover:bg-ide-hover rounded transition-colors text-ide-text/40 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Tool Content Container */}
        <div className="flex-1 overflow-hidden min-h-0 bg-ide-bg/10">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}
