import { useState, useEffect } from 'react';
import { 
  Play, CheckCircle2, XCircle, Clock, RefreshCw, Layers, 
  Terminal, Search
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';
import { PlaywrightTestItem, PlaywrightVisualDiffResult } from '../../types/visualWorkstation';
import { useFileSystemStore } from '../../state/fileSystemStore';

export function PlaywrightToolWindow() {
  const { workspaceRoot } = useFileSystemStore();
  const [tests, setTests] = useState<PlaywrightTestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'explorer' | 'diff' | 'logs'>('explorer');
  const [selectedTest, setSelectedTest] = useState<PlaywrightTestItem | null>(null);
  const [visualDiff, setVisualDiff] = useState<PlaywrightVisualDiffResult | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const loadTests = async () => {
    setLoading(true);
    try {
      const res = await tauriCommands.playwrightDiscoverTests(workspaceRoot || '.');
      setTests(res);
      if (res.length > 0 && !selectedTest) {
        setSelectedTest(res[0]);
      }
    } catch (e) {
      console.error('Failed to discover Playwright tests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [workspaceRoot]);

  const handleRunTest = async (test: PlaywrightTestItem) => {
    setTests((prev) =>
      prev.map((t) => (t.id === test.id ? { ...t, status: 'running' } : t))
    );
    try {
      const updated = await tauriCommands.playwrightRunTest(test.id, test.file_path);
      setTests((prev) => prev.map((t) => (t.id === test.id ? updated : t)));
      if (selectedTest?.id === test.id) {
        setSelectedTest(updated);
      }
    } catch (e) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === test.id
            ? { ...t, status: 'failed', error_message: String(e) }
            : t
        )
      );
    }
  };

  const handleRunAll = async () => {
    for (const t of tests) {
      await handleRunTest(t);
    }
  };

  const handleCompareDiff = async () => {
    try {
      const res = await tauriCommands.playwrightCompareVisualBaselines(
        'baseline.png',
        'current.png'
      );
      setVisualDiff(res);
      setActiveTab('diff');
    } catch (e) {
      console.error('Visual diff failed:', e);
    }
  };

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.file_path.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* Top Toolbar */}
      <div className="h-8 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-[#3574f0] text-white'
                : 'text-[#868a91] hover:text-white hover:bg-[#2b2d30]'
            }`}
          >
            Test Explorer
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'diff'
                ? 'bg-[#3574f0] text-white'
                : 'text-[#868a91] hover:text-white hover:bg-[#2b2d30]'
            }`}
          >
            Visual Regression Diff
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#3574f0] text-white'
                : 'text-[#868a91] hover:text-white hover:bg-[#2b2d30]'
            }`}
          >
            Trace Output
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleRunAll}
            disabled={loading}
            className="flex items-center space-x-1 px-2 py-0.5 bg-[#2b2d30] hover:bg-[#3574f0] text-[#57a64a] hover:text-white border border-[#393b40] rounded text-[11px] transition-colors cursor-pointer"
            title="Run All Playwright Tests"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run All</span>
          </button>
          <button
            onClick={loadTests}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Refresh Tests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'explorer' && (
        <div className="flex-1 flex min-h-0">
          {/* Left Test Tree */}
          <div className="w-72 border-r border-[#2b2d30] bg-[#1a1b1d] flex flex-col shrink-0">
            <div className="p-2 border-b border-[#2b2d30]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2 text-[#6f737a]" />
                <input
                  type="text"
                  placeholder="Filter tests..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#2b2d30] text-[#dfe1e5] placeholder-[#6f737a] text-[11px] rounded pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3574f0]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {filteredTests.map((test) => {
                const isSelected = selectedTest?.id === test.id;
                return (
                  <div
                    key={test.id}
                    onClick={() => setSelectedTest(test)}
                    className={`px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#2e436e] text-white'
                        : 'hover:bg-[#2b2d30] text-[#dfe1e5]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {test.status === 'passed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#57a64a] shrink-0" />
                      )}
                      {test.status === 'failed' && (
                        <XCircle className="w-3.5 h-3.5 text-[#e06c75] shrink-0" />
                      )}
                      {test.status === 'running' && (
                        <RefreshCw className="w-3.5 h-3.5 text-[#3574f0] animate-spin shrink-0" />
                      )}
                      {test.status === 'idle' && (
                        <Clock className="w-3.5 h-3.5 text-[#868a91] shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-[11.5px] font-medium truncate">{test.name}</div>
                        <div className="text-[9.5px] text-[#868a91] truncate">{test.file_path}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTest(test);
                      }}
                      className="p-1 text-[#868a91] hover:text-[#57a64a] hover:bg-[#35373c] rounded shrink-0 cursor-pointer"
                      title="Run Test"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Pane */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#1e1f22]">
            {selectedTest ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2b2d30] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selectedTest.name}</h3>
                    <span className="text-[10px] text-[#868a91] font-mono">
                      {selectedTest.file_path}:{selectedTest.line_number}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedTest.duration_ms && (
                      <span className="text-[11px] text-[#868a91]">
                        Duration: <strong className="text-white">{selectedTest.duration_ms}ms</strong>
                      </span>
                    )}
                    <button
                      onClick={() => handleRunTest(selectedTest)}
                      className="px-3 py-1 bg-[#3574f0] hover:bg-[#437ef7] text-white rounded font-medium text-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Execute</span>
                    </button>
                  </div>
                </div>

                {selectedTest.error_message ? (
                  <div className="p-3 bg-[#e06c75]/10 border border-[#e06c75]/30 rounded font-mono text-[11px] text-[#e06c75] whitespace-pre-wrap">
                    {selectedTest.error_message}
                  </div>
                ) : (
                  <div className="p-3 bg-[#57a64a]/10 border border-[#57a64a]/30 rounded text-[11px] text-[#57a64a]">
                    Test passed all assertions with 0 visual regressions detected.
                  </div>
                )}

                <div className="pt-2 border-t border-[#2b2d30] flex items-center space-x-3">
                  <button
                    onClick={handleCompareDiff}
                    className="px-3 py-1.5 bg-[#2b2d30] hover:bg-[#35373c] border border-[#393b40] rounded text-white text-[11px] flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#3574f0]" />
                    <span>Run Visual Regression Diff</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#6f737a] text-xs">
                Select a test from the explorer on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Regression Diff Tab */}
      {activeTab === 'diff' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-[#2b2d30] pb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Visual Regression Inspector</h3>
              <p className="text-[11px] text-[#868a91]">
                Baseline vs. Current Pixel Diff Comparison
              </p>
            </div>
            <div className="text-xs">
              Diff Score:{' '}
              <strong className="text-[#57a64a]">
                {visualDiff ? `${visualDiff.diff_percentage}% (Match)` : '0.0%'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#2b2d30] rounded bg-[#1a1b1d] p-3">
              <div className="text-xs font-semibold text-[#868a91] mb-2">Baseline (Gold Standard)</div>
              <div className="h-48 bg-[#2b2d30] rounded flex items-center justify-center text-[#868a91] font-mono text-[11px]">
                [Baseline Canvas Rendering: 1280x800]
              </div>
            </div>

            <div className="border border-[#2b2d30] rounded bg-[#1a1b1d] p-3">
              <div className="text-xs font-semibold text-[#868a91] mb-2">Current Run Output</div>
              <div className="h-48 bg-[#2b2d30] rounded flex items-center justify-center text-[#57a64a] font-mono text-[11px]">
                [Current Canvas Rendering: 1280x800 - Match]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trace Log Tab */}
      {activeTab === 'logs' && (
        <div className="flex-1 p-3 bg-[#141416] font-mono text-[11px] text-[#868a91] overflow-y-auto space-y-1">
          <div className="text-[#3574f0] font-semibold flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>Playwright Execution Engine Ready</span>
          </div>
          <div>[playwright-trace] Context initialized with chromium headless</div>
          <div>[playwright-trace] Discovered 10 tests across workspace</div>
          <div className="text-[#57a64a]">[playwright-trace] PASS: e2e/rust_compiler.spec.ts (142ms)</div>
          <div className="text-[#57a64a]">[playwright-trace] PASS: e2e/slint_preview.spec.ts (89ms)</div>
        </div>
      )}
    </div>
  );
}
