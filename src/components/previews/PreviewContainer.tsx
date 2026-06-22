import { useState } from 'react';
import { Globe, Layout, AlignLeft, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/theme';

export function PreviewContainer() {
  const [activePreview, setActivePreview] = useState<'slint' | 'dioxus' | 'markdown' | 'mermaid'>('markdown');
  const mermaidGraph = `graph TD
    A[RTOS Loop] -->|Read Sensor| B(I2C Read)
    B -->|Filter| C{Data Valid?}
    C -->|Yes| D[MQTT Publish]
    C -->|No| E[Log Error]`;

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="h-9 border-b border-ide-border flex items-center px-3 space-x-5 text-[10px] font-bold uppercase tracking-widest text-ide-text bg-ide-panel shrink-0 select-none">
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activePreview === 'markdown' ? "text-white border-b-2 border-ide-keyword" : "hover:text-white"
          )}
          onClick={() => setActivePreview('markdown')}
        >
          <AlignLeft className="w-3.5 h-3.5 mr-1.5" />
          Markdown
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activePreview === 'mermaid' ? "text-white border-b-2 border-ide-keyword" : "hover:text-white"
          )}
          onClick={() => setActivePreview('mermaid')}
        >
          <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
          Mermaid
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activePreview === 'slint' ? "text-white border-b-2 border-ide-keyword" : "hover:text-white"
          )}
          onClick={() => setActivePreview('slint')}
        >
          <Layout className="w-3.5 h-3.5 mr-1.5" />
          Slint UI
        </button>
        <button
          className={cn(
            "h-full flex items-center transition-colors cursor-pointer",
            activePreview === 'dioxus' ? "text-white border-b-2 border-ide-keyword" : "hover:text-white"
          )}
          onClick={() => setActivePreview('dioxus')}
        >
          <Globe className="w-3.5 h-3.5 mr-1.5" />
          Dioxus Browser
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 relative min-h-0 bg-ide-bg">
        {activePreview === 'markdown' && (
          <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3">
            <h1 className="text-white text-lg font-bold border-b border-ide-border pb-1">Firmware Preview Center</h1>
            <p className="text-ide-text/80">Select a tab above to render target layout states.</p>
            <div className="bg-ide-panel/30 border border-ide-border rounded p-3 text-[11px] font-mono text-ide-text">
              <h3 className="text-white font-bold mb-1">Configuration Overview</h3>
              <p>• Serial Baud: 115200</p>
              <p>• MQTT Protocol Version: MQTT v5.0</p>
              <p>• Local Workspace: active</p>
            </div>
          </div>
        )}

        {activePreview === 'mermaid' && (
          <div className="flex flex-col space-y-3 h-full">
            <div className="bg-ide-panel p-3.5 rounded border border-ide-border/40 font-mono text-xs text-white">
              <pre className="text-ide-function select-all leading-normal">{mermaidGraph}</pre>
            </div>
            {/* Mock layout graphic rendering of graph */}
            <div className="flex-1 bg-ide-panel/20 border border-ide-border/30 rounded p-4 flex flex-col items-center justify-center space-y-4">
              <div className="border border-ide-keyword/30 bg-ide-keyword/5 rounded-lg px-4 py-2 text-center text-xs font-bold text-ide-keyword">
                RTOS Loop
              </div>
              <div className="w-[1px] h-6 bg-ide-border" />
              <div className="border border-ide-function/30 bg-ide-function/5 rounded-lg px-4 py-2 text-center text-xs font-bold text-ide-function">
                I2C Read (Read Sensor)
              </div>
              <div className="w-[1px] h-6 bg-ide-border" />
              <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-full w-24 h-12 flex items-center justify-center text-xs font-bold text-yellow-400">
                Data Valid?
              </div>
              <div className="flex space-x-6 mt-2">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-green-400">Yes</div>
                  <div className="border border-green-500/30 bg-green-500/5 rounded-lg px-3 py-1.5 text-xs text-green-400">
                    MQTT Publish
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-red-400">No</div>
                  <div className="border border-red-500/30 bg-red-500/5 rounded-lg px-3 py-1.5 text-xs text-red-400">
                    Log Error
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePreview === 'slint' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/50">Slint Live Preview (Simulated Window)</span>
              <button className="bg-ide-selection hover:bg-ide-activeTab text-white text-[10px] px-2 py-0.5 rounded flex items-center space-x-1 cursor-pointer">
                <RefreshCw className="w-3 h-3" />
                <span>Reload</span>
              </button>
            </div>
            {/* Visual Slint Mock Renderer */}
            <div className="flex-1 bg-[#151515] border border-ide-border rounded flex flex-col select-none">
              <div className="h-7 border-b border-[#2d2d2d] bg-[#222222] px-3 flex items-center justify-between text-[11px] text-white/70">
                <span>Slint Window Frame</span>
                <div className="flex space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-4">
                <h2 className="text-white text-md font-medium">Device Controller UI</h2>
                <div className="bg-[#2d2d2d] rounded p-4 flex flex-col space-y-3 min-w-[200px]">
                  <div className="flex justify-between items-center text-xs">
                    <span>Power Status:</span>
                    <span className="text-green-400 font-bold">ON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Target Temp:</span>
                    <span>24°C</span>
                  </div>
                  <button className="bg-[#cc7832] text-white text-xs py-1 rounded">Toggle Power</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePreview === 'dioxus' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/50">Dioxus Embedded Browser (Localhost port)</span>
              <span className="text-[10px] text-ide-text/40 font-mono">127.0.0.1:8080</span>
            </div>
            <div className="flex-1 bg-white border border-ide-border rounded flex flex-col text-slate-800">
              <div className="h-7 border-b border-slate-200 bg-slate-50 px-3 flex items-center justify-between text-xs text-slate-500">
                <span>http://localhost:8080</span>
                <RefreshCw className="w-3.5 h-3.5 cursor-pointer text-slate-400" />
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-3">
                <span className="text-slate-700 font-bold">Dioxus App Rendered View</span>
                <span className="text-[11px] text-slate-500">Connecting to hot-reloading dev server...</span>
                <div className="h-[2px] w-24 bg-blue-500 rounded animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
