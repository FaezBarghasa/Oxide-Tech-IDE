import { useState } from 'react';
import { useSettingsStore, ApiProviderType } from '../../state/settingsStore';
import { 
  X, Keyboard, Sliders, Type, Globe, Search, Cpu, Terminal, 
  Palette, Eye, EyeOff, Save
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';

type SettingsCategory = 
  | 'appearance' 
  | 'editor' 
  | 'rust' 
  | 'cargo' 
  | 'keymap' 
  | 'ai' 
  | 'terminal' 
  | 'version_control';

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

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [searchFilter, setSearchFilter] = useState('');

  // Local state for AI configurations
  const [provider, setProvider] = useState<ApiProviderType>(apiProvider);
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [endpoint, setEndpoint] = useState(apiEndpoint || '');
  const [model, setModel] = useState(apiModel || '');
  const [showKey, setShowKey] = useState(false);

  // Rust / Toolchain specific state
  const [rustToolchain, setRustToolchain] = useState('stable-x86_64-unknown-linux-gnu (default)');
  const [clippyOnSave, setClippyOnSave] = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(true);
  const [inlayHintsEnabled, setInlayHintsEnabled] = useState(true);
  const [inlayHintsParameterNames, setInlayHintsParameterNames] = useState(true);
  const [inlayHintsChaining, setInlayHintsChaining] = useState(true);

  // Keymaps
  const [keymapScheme, setKeymapScheme] = useState<'Default (IntelliJ)' | 'VS Code' | 'Emacs' | 'Sublime Text'>('Default (IntelliJ)');

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

  const handleSave = async () => {
    setApiProvider(provider);
    setApiKey(inputKey.trim() || null);
    setApiEndpoint(endpoint.trim() || null);
    setApiModel(model.trim() || null);

    // Save keymap scheme to backend
    try {
      await tauriCommands.saveUserKeymap(JSON.stringify({ scheme: keymapScheme }));
    } catch (e) {
      console.warn("Failed to persist user keymap:", e);
    }

    setActiveOverlay(null);
  };

  const handleClose = () => {
    setActiveOverlay(null);
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-150 select-none font-sans">
      <div className="bg-[#1e1f22] w-[880px] h-[580px] border border-[#393b40] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#dfe1e5]">
        
        {/* Top Header Bar */}
        <div className="h-10 border-b border-[#2b2d30] flex items-center justify-between px-4 bg-[#26282d] shrink-0">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white tracking-wide">
            <Sliders className="w-4 h-4 text-[#3574f0]" />
            <span>Settings</span>
          </div>
          <button 
            onClick={handleClose}
            className="text-[#868a91] hover:text-white p-1 hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Navigation Tree */}
          <div className="w-56 border-r border-[#2b2d30] bg-[#1a1b1d] flex flex-col shrink-0 text-xs">
            {/* Search Settings Input */}
            <div className="p-2 border-b border-[#2b2d30]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2 text-[#6f737a]" />
                <input 
                  type="text"
                  placeholder="Search settings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#2b2d30] text-[#dfe1e5] placeholder-[#6f737a] text-[11px] rounded pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3574f0]"
                />
              </div>
            </div>

            {/* Tree Categories */}
            <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
              {[
                { id: 'appearance', label: 'Appearance & Behavior', icon: Palette },
                { id: 'keymap', label: 'Keymap', icon: Keyboard },
                { id: 'editor', label: 'Editor', icon: Type },
                { id: 'rust', label: 'Rust & Cargo', icon: Cpu },
                { id: 'ai', label: 'Oxide AI Assistant', icon: Globe },
                { id: 'terminal', label: 'Terminal', icon: Terminal },
                { id: 'version_control', label: 'Version Control (Git)', icon: Sliders },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as SettingsCategory)}
                    className={`w-full px-3.5 py-1.5 text-left flex items-center space-x-2.5 transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-[#2e436e] text-white font-medium' 
                        : 'text-[#868a91] hover:text-[#dfe1e5] hover:bg-[#2b2d30]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#3574f0]' : 'text-[#6f737a]'}`} />
                    <span className="text-[11.5px] truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Setting Detail Panel */}
          <div className="flex-1 p-6 overflow-y-auto text-xs bg-[#1e1f22]">
            
            {/* 1. Appearance & Behavior */}
            {activeCategory === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Appearance</h3>
                  <p className="text-[11px] text-[#868a91]">Customize the IDE UI theme and look & feel.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">Theme</label>
                    <select className="w-64 bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#3574f0]">
                      <option value="oxide-dark">Oxide Dark (Modern UI)</option>
                      <option value="darcula">Darcula (Classic)</option>
                      <option value="high-contrast">High Contrast Dark</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="smoothScrolling" 
                      defaultChecked 
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                    <label htmlFor="smoothScrolling" className="text-[11px] text-[#dfe1e5] cursor-pointer">
                      Use smooth scrolling in all tool windows
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Keymap */}
            {activeCategory === 'keymap' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Keymap</h3>
                  <p className="text-[11px] text-[#868a91]">Select predefined keymap schemes or customize shortcut mappings.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">Keymap Scheme:</label>
                    <select 
                      value={keymapScheme}
                      onChange={(e: any) => setKeymapScheme(e.target.value)}
                      className="w-56 bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                    >
                      <option value="Default (Oxide)">Default (Oxide IDE)</option>
                      <option value="VS Code">VS Code</option>
                      <option value="Emacs">Emacs</option>
                      <option value="Sublime Text">Sublime Text</option>
                    </select>
                  </div>

                  <div className="border border-[#2b2d30] rounded bg-[#1a1b1d] p-3 text-[11px] space-y-2">
                    <div className="text-white font-medium">Core Oxide Shortcuts</div>
                    <div className="grid grid-cols-2 gap-2 text-[#868a91]">
                      <div>Search Everywhere: <span className="font-mono text-[#dfe1e5]">Shift+Shift</span></div>
                      <div>Run Project: <span className="font-mono text-[#dfe1e5]">Shift+F10</span></div>
                      <div>Debug Project: <span className="font-mono text-[#dfe1e5]">Shift+F9</span></div>
                      <div>Context Actions: <span className="font-mono text-[#dfe1e5]">Alt+Enter</span></div>
                      <div>Cargo Check: <span className="font-mono text-[#dfe1e5]">Ctrl+F9</span></div>
                      <div>Settings / Preferences: <span className="font-mono text-[#dfe1e5]">Ctrl+Alt+S</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Editor */}
            {activeCategory === 'editor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Editor Settings</h3>
                  <p className="text-[11px] text-[#868a91]">Configure font, minimap, formatting, and editor emulation.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">Font Size</label>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="number" 
                        min="10" 
                        max="28" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-24 bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                      />
                      <span className="text-[11px] text-[#868a91]">pixels (JetBrains Mono)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-[#2b2d30]">
                    <div>
                      <div className="text-[11px] font-medium text-[#dfe1e5]">Show Code Minimap</div>
                      <div className="text-[10px] text-[#868a91]">Display vertical overview on the right gutter of the editor.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={showMinimap} 
                      onChange={toggleMinimap}
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-[#2b2d30]">
                    <div>
                      <div className="text-[11px] font-medium text-[#dfe1e5]">Vim Editor Emulation</div>
                      <div className="text-[10px] text-[#868a91]">Enable modal editing (IdeaVim style).</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={vimMode} 
                      onChange={toggleVimMode}
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Rust & Cargo */}
            {activeCategory === 'rust' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Rust Toolchain & Inlay Hints</h3>
                  <p className="text-[11px] text-[#868a91]">Configure rustup, cargo compiler checks, and code insight features.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">Active Rust Toolchain</label>
                    <input 
                      type="text"
                      value={rustToolchain}
                      onChange={(e) => setRustToolchain(e.target.value)}
                      className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#3574f0]"
                    />
                  </div>

                  <div className="space-y-2 border-t border-[#2b2d30] pt-3">
                    <div className="text-[11px] font-semibold text-white mb-1">Inlay Hints</div>
                    <label className="flex items-center space-x-2 text-[11px] text-[#dfe1e5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={inlayHintsEnabled} 
                        onChange={(e) => setInlayHintsEnabled(e.target.checked)}
                        className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                      />
                      <span>Show type annotations for let bindings</span>
                    </label>

                    <label className="flex items-center space-x-2 text-[11px] text-[#dfe1e5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={inlayHintsParameterNames} 
                        onChange={(e) => setInlayHintsParameterNames(e.target.checked)}
                        className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                      />
                      <span>Show parameter name hints in function calls</span>
                    </label>

                    <label className="flex items-center space-x-2 text-[11px] text-[#dfe1e5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={inlayHintsChaining} 
                        onChange={(e) => setInlayHintsChaining(e.target.checked)}
                        className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                      />
                      <span>Show chained method call return types</span>
                    </label>
                  </div>

                  <div className="space-y-2 border-t border-[#2b2d30] pt-3">
                    <div className="text-[11px] font-semibold text-white mb-1">On Save Actions</div>
                    <label className="flex items-center space-x-2 text-[11px] text-[#dfe1e5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formatOnSave} 
                        onChange={(e) => setFormatOnSave(e.target.checked)}
                        className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                      />
                      <span>Reformat code with rustfmt</span>
                    </label>

                    <label className="flex items-center space-x-2 text-[11px] text-[#dfe1e5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={clippyOnSave} 
                        onChange={(e) => setClippyOnSave(e.target.checked)}
                        className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                      />
                      <span>Run cargo clippy diagnostics</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Oxide AI Assistant */}
            {activeCategory === 'ai' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Oxide AI Assistant (BYOK)</h3>
                  <p className="text-[11px] text-[#868a91]">Connect custom AI models for real-time code generation, explanation, and error fixing.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">AI Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as ApiProviderType)}
                      className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                    >
                      <option value="gemini">Google Gemini (Default)</option>
                      <option value="openai">OpenAI (GPT-4o)</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="custom">Local LLM / Custom Ollama Endpoint</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">API Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"} 
                        placeholder="Enter provider API key..." 
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        className="w-full bg-[#2b2d30] border border-[#393b40] rounded pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-[#3574f0] font-mono"
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-2 text-[#868a91] hover:text-white cursor-pointer"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-medium text-[#dfe1e5]">Model Override</label>
                      <input 
                        type="text" 
                        placeholder={getModelPlaceholder(provider)} 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-[#3574f0] font-mono text-xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-medium text-[#dfe1e5]">Endpoint URL</label>
                      <input 
                        type="text" 
                        placeholder={getEndpointPlaceholder(provider)} 
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        className="bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-[#3574f0] font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Terminal */}
            {activeCategory === 'terminal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Embedded Terminal</h3>
                  <p className="text-[11px] text-[#868a91]">Configure shell executable and environment integration.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-medium text-[#dfe1e5]">Shell Path</label>
                    <input 
                      type="text" 
                      defaultValue="/bin/bash"
                      className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#3574f0]"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="termAudio" 
                      defaultChecked={false} 
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                    <label htmlFor="termAudio" className="text-[11px] text-[#dfe1e5] cursor-pointer">
                      Audible bell on terminal activity
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Version Control */}
            {activeCategory === 'version_control' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Version Control</h3>
                  <p className="text-[11px] text-[#868a91]">Git integration and gutter diff settings.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="gitGutter" 
                      defaultChecked 
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                    <label htmlFor="gitGutter" className="text-[11px] text-[#dfe1e5] cursor-pointer">
                      Show VCS modification markers on editor left gutter
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="gitAutoFetch" 
                      defaultChecked 
                      className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0]" 
                    />
                    <label htmlFor="gitAutoFetch" className="text-[11px] text-[#dfe1e5] cursor-pointer">
                      Auto-fetch remote repository changes in background
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Buttons */}
        <div className="h-12 border-t border-[#2b2d30] flex items-center justify-end px-4 space-x-3 bg-[#26282d] shrink-0">
          <button 
            onClick={handleClose}
            className="px-4 py-1.5 bg-[#2b2d30] hover:bg-[#35373c] border border-[#393b40] text-[#dfe1e5] hover:text-white rounded cursor-pointer transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-1.5 bg-[#3574f0] hover:bg-[#437ef7] text-white rounded cursor-pointer transition-colors text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply & Close</span>
          </button>
        </div>

      </div>
    </div>
  );
}
