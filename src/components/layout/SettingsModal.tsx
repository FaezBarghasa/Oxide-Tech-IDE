import { useState } from 'react';
import { useSettingsStore, ApiProviderType } from '../../state/settingsStore';
import { X, Keyboard, Eye, EyeOff, Sliders, Type, Globe } from 'lucide-react';
import { cn } from '../../utils/theme';

export function SettingsModal() {
  const { 
    fontSize, setFontSize, 
    showMinimap, toggleMinimap, 
    vimMode, toggleVimMode, 
    apiKey, setApiKey, 
    apiProvider, setApiProvider,
    apiEndpoint, setApiEndpoint,
    apiModel, setApiModel,
    setActiveOverlay 
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'vim'>('general');
  
  // Local state for AI configurations
  const [provider, setProvider] = useState<ApiProviderType>(apiProvider);
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [endpoint, setEndpoint] = useState(apiEndpoint || '');
  const [model, setModel] = useState(apiModel || '');
  const [showKey, setShowKey] = useState(false);

  const getEndpointPlaceholder = (p: ApiProviderType) => {
    switch (p) {
      case 'gemini': return 'https://generativelanguage.googleapis.com';
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      case 'custom': return 'http://localhost:11434/v1';
    }
  };

  const getModelPlaceholder = (p: ApiProviderType) => {
    switch (p) {
      case 'gemini': return 'gemini-1.5-flash';
      case 'openai': return 'gpt-4o';
      case 'anthropic': return 'claude-3-5-sonnet';
      case 'custom': return 'llama3';
    }
  };

  const handleSave = () => {
    setApiProvider(provider);
    setApiKey(inputKey.trim() || null);
    setApiEndpoint(endpoint.trim() || null);
    setApiModel(model.trim() || null);
    setActiveOverlay(null);
  };

  const handleClose = () => {
    setActiveOverlay(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 select-none">
      <div className="bg-ide-panel w-[550px] h-[390px] border border-ide-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-ide-text">
        
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
              <Globe className="w-3.5 h-3.5" />
              <span>AI Models BYOK</span>
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
          <div className="flex-1 p-4 overflow-y-auto font-sans text-xs flex flex-col">
            
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4 flex-1">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Font Size (Editor)</label>
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
                    <div className="text-[10px] font-bold text-white/85">Show Minimap</div>
                    <div className="text-[10px] text-ide-text/50 font-light">Display the visual code overview on the right.</div>
                  </div>
                  <button 
                    onClick={toggleMinimap}
                    className={cn(
                      "w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer flex shrink-0",
                      showMinimap ? "bg-ide-keyword justify-end" : "bg-ide-bg justify-start border border-ide-border"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Models Tab (Multi-provider BYOK) */}
            {activeTab === 'ai' && (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-white/85 uppercase tracking-wider">API Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const val = e.target.value as ApiProviderType;
                      setProvider(val);
                    }}
                    className="w-full bg-ide-bg border border-ide-border rounded px-2 py-1 text-white focus:outline-none focus:border-ide-keyword"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI (or Compatible)</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="custom">Custom Endpoint (Ollama / Local LLM)</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-white/85 uppercase tracking-wider">API Key</label>
                  <div className="relative">
                    <input 
                      type={showKey ? "text" : "password"} 
                      placeholder="Enter provider API key..." 
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-ide-bg border border-ide-border rounded pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-ide-keyword font-mono"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-2 text-ide-text/55 hover:text-white cursor-pointer"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-white/85 uppercase tracking-wider">Model Name</label>
                    <input 
                      type="text" 
                      placeholder={getModelPlaceholder(provider)} 
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-white focus:outline-none focus:border-ide-keyword font-mono"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-white/85 uppercase tracking-wider">Endpoint URL (Optional)</label>
                    <input 
                      type="text" 
                      placeholder={getEndpointPlaceholder(provider)} 
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-white focus:outline-none focus:border-ide-keyword font-mono"
                    />
                  </div>
                </div>

                <p className="text-[9px] text-ide-text/60 leading-normal border-t border-ide-border/30 pt-1.5 mt-1">
                  Provider key enables full generative code assistance, reviews, and healing. Offline simulation is active if key is empty.
                </p>
              </div>
            )}

            {/* Vim Tab */}
            {activeTab === 'vim' && (
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-[10px] font-bold text-white/85">Vim Editor Emulation</div>
                    <div className="text-[10px] text-ide-text/50 font-light">Enable Vim keybindings (Insert/Normal mode, hjkl).</div>
                  </div>
                  <button 
                    onClick={toggleVimMode}
                    className={cn(
                      "w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer flex shrink-0",
                      vimMode ? "bg-ide-keyword justify-end" : "bg-ide-bg justify-start border border-ide-border"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                {vimMode && (
                  <div className="bg-[#cc7832]/10 border border-[#cc7832]/25 p-2 rounded text-[10px] text-[#cc7832] font-mono leading-relaxed">
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
