import { useState } from 'react';
import { useSettingsStore } from '../../state/settingsStore';
import { X, Key, Keyboard, Eye, EyeOff, Sliders, Type, Check } from 'lucide-react';
import { cn } from '../../utils/theme';

export function SettingsModal() {
  const { 
    fontSize, setFontSize, 
    showMinimap, toggleMinimap, 
    vimMode, toggleVimMode, 
    apiKey, setApiKey, 
    setActiveOverlay 
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'vim'>('general');
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setApiKey(inputKey.trim() || null);
    setActiveOverlay(null);
  };

  const handleClose = () => {
    setActiveOverlay(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 select-none">
      <div className="bg-ide-panel w-[520px] h-[360px] border border-ide-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-ide-text">
        
        {/* Header */}
        <div className="h-11 border-b border-ide-border flex items-center justify-between px-4 bg-ide-bg shrink-0">
          <div className="flex items-center space-x-2 font-sans font-bold text-xs uppercase tracking-wider text-white">
            <Sliders className="w-4 h-4 text-ide-keyword" />
            <span>IDE Settings</span>
          </div>
          <button 
            onClick={handleClose}
            className="text-ide-text/50 hover:text-white p-0.5 hover:bg-ide-hover rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0">
          
          {/* Tabs Sidebar */}
          <div className="w-40 border-r border-ide-border bg-ide-bg/40 flex flex-col py-2 shrink-0 font-sans text-xs">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "px-4 py-2 text-left flex items-center space-x-2 transition-colors cursor-pointer",
                activeTab === 'general' ? "bg-ide-selection text-white font-medium" : "hover:bg-ide-hover/50 hover:text-white"
              )}
            >
              <Type className="w-3.5 h-3.5" />
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-4 py-2 text-left flex items-center space-x-2 transition-colors cursor-pointer",
                activeTab === 'ai' ? "bg-ide-selection text-white font-medium" : "hover:bg-ide-hover/50 hover:text-white"
              )}
            >
              <Key className="w-3.5 h-3.5" />
              <span>AI BYOK</span>
            </button>
            <button
              onClick={() => setActiveTab('vim')}
              className={cn(
                "px-4 py-2 text-left flex items-center space-x-2 transition-colors cursor-pointer",
                activeTab === 'vim' ? "bg-ide-selection text-white font-medium" : "hover:bg-ide-hover/50 hover:text-white"
              )}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Vim Bindings</span>
            </button>
          </div>

          {/* Tab Panel */}
          <div className="flex-1 p-5 overflow-y-auto font-sans text-xs flex flex-col">
            
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4 flex-1">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Font Size (Editor)</label>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="number" 
                      min="10" 
                      max="24" 
                      value={fontSize} 
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20 bg-ide-bg border border-ide-border rounded px-2 py-1 text-white focus:outline-none focus:border-ide-keyword"
                    />
                    <span className="text-[10px] text-ide-text/50">px (Default: 14px)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 border-t border-ide-border/30">
                  <div>
                    <div className="text-[11px] font-bold text-white/85">Show Minimap</div>
                    <div className="text-[10px] text-ide-text/50">Display the visual code overview on the right.</div>
                  </div>
                  <button 
                    onClick={toggleMinimap}
                    className={cn(
                      "w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer flex",
                      showMinimap ? "bg-ide-keyword justify-end" : "bg-ide-bg justify-start border border-ide-border"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Tab (Gemini BYOK) */}
            {activeTab === 'ai' && (
              <div className="space-y-3.5 flex-1 flex flex-col">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center space-x-1">
                    <span>Gemini API Key</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={showKey ? "text" : "password"} 
                      placeholder="AI_KEY_..." 
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-ide-bg border border-ide-border rounded pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-ide-keyword"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-2 text-ide-text/55 hover:text-white cursor-pointer"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-ide-text/60 leading-normal">
                    Provide your Gemini API key to activate full generative features (AI Chat Panel, Floating AI Prompts, and Auto-Healing). Leave blank to use offline simulation mocks.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 bg-ide-bg/50 border border-ide-border/50 p-2 rounded text-[10px] text-ide-text/80 leading-normal">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>Your key is saved locally in your settings profile and is never sent to third-party servers.</span>
                </div>
              </div>
            )}

            {/* Vim Tab */}
            {activeTab === 'vim' && (
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-[11px] font-bold text-white/85">Vim Editor Emulation</div>
                    <div className="text-[10px] text-ide-text/50 font-sans">Enable Vim keybindings (Insert/Normal mode, hjkl).</div>
                  </div>
                  <button 
                    onClick={toggleVimMode}
                    className={cn(
                      "w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer flex",
                      vimMode ? "bg-ide-keyword justify-end" : "bg-ide-bg justify-start border border-ide-border"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                {vimMode && (
                  <div className="bg-[#cc7832]/10 border border-[#cc7832]/25 p-2 rounded.5 text-[10px] text-[#cc7832] font-mono leading-relaxed">
                    Vim mode status bar will appear at the bottom-right corner of the editor.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="h-12 border-t border-ide-border flex items-center justify-end px-4 space-x-2.5 bg-ide-bg shrink-0">
          <button 
            onClick={handleClose}
            className="px-3.5 py-1.5 bg-ide-hover border border-ide-border hover:bg-ide-activeTab hover:text-white rounded cursor-pointer transition-colors text-xs font-semibold"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-1.5 bg-ide-keyword hover:bg-ide-keyword/85 text-white rounded cursor-pointer transition-colors text-xs font-bold shadow-lg"
          >
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
}
