import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Play, RotateCw, CheckCircle, XCircle, Clock, Terminal, Zap } from 'lucide-react';
import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';
import { WorkspaceTestItem, TestRunResult, TestStreamEvent } from '../../types/rustrover';

export function TestExplorerToolWindow() {
  const workspaceRoot = useFileSystemStore((s) => s.workspaceRoot);
  const [tests, setTests] = useState<WorkspaceTestItem[]>([]);
  const [selectedTest, setSelectedTest] = useState<WorkspaceTestItem | null>(null);
  const [activeResult, setActiveResult] = useState<TestRunResult | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');

  const discoverTests = async () => {
    setIsDiscovering(true);
    try {
      const items = await tauriCommands.discoverWorkspaceTests(workspaceRoot);
      setTests(items);
      if (items.length > 0 && !selectedTest) {
        setSelectedTest(items[0]);
      }
    } catch (err) {
      console.error('Failed to discover workspace tests:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    discoverTests();
  }, [workspaceRoot]);

  const handleRunTest = async (testItem: WorkspaceTestItem) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testItem.id ? { ...t, status: 'running' } : t))
    );
    try {
      const result = await tauriCommands.runSingleTest(workspaceRoot, testItem.id);
      setActiveResult(result);
      setTests((prev) =>
        prev.map((t) =>
          t.id === testItem.id
            ? {
                ...t,
                status: result.passed ? 'passed' : 'failed',
                duration_ms: result.duration_ms,
                output: result.stdout + '\n' + result.stderr,
              }
            : t
        )
      );
      if (selectedTest?.id === testItem.id) {
        setSelectedTest((prev) =>
          prev
            ? {
                ...prev,
                status: result.passed ? 'passed' : 'failed',
                duration_ms: result.duration_ms,
                output: result.stdout + '\n' + result.stderr,
              }
            : null
        );
      }
    } catch (err) {
      console.error(`Failed to run test ${testItem.id}:`, err);
      setTests((prev) =>
        prev.map((t) => (t.id === testItem.id ? { ...t, status: 'failed' } : t))
      );
    }
  };

  const handleRunAllTests = async () => {
    setIsRunningAll(true);
    for (const t of tests) {
      await handleRunTest(t);
    }
    setIsRunningAll(false);
  };

  const handleRunAllStreaming = async () => {
    if (!workspaceRoot) return;
    setIsRunningAll(true);

    // Reset all to 'running' state first
    setTests((prev) => prev.map((t) => ({ ...t, status: 'running' as const })));

    // Subscribe to real-time events
    const unlisten = await listen<TestStreamEvent>('test:event', (event) => {
      const payload = event.payload;
      setTests((prev) =>
        prev.map((t) => {
          if (t.id === payload.test_id) {
            if (payload.event === 'started') return { ...t, status: 'running' as const };
            if (payload.event === 'passed') return { ...t, status: 'passed' as const, duration_ms: payload.duration_ms };
            if (payload.event === 'failed') return { ...t, status: 'failed' as const, duration_ms: payload.duration_ms, output: payload.message };
          }
          return t;
        })
      );
    });

    try {
      await tauriCommands.runAllTestsStreaming(workspaceRoot);
    } finally {
      unlisten();
      setIsRunningAll(false);
    }
  };

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(filterText.toLowerCase()) ||
      t.module_path.toLowerCase().includes(filterText.toLowerCase())
  );

  const passedCount = tests.filter((t) => t.status === 'passed').length;
  const failedCount = tests.filter((t) => t.status === 'failed').length;

  return (
    <div className="flex h-full w-full bg-[#1e1f22] text-[#bcbec4] select-none text-xs font-sans">
      {/* Test Hierarchy Tree / List */}
      <div className="w-80 flex flex-col border-r border-[#2b2d30] bg-[#18191b]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b2d30] bg-[#1e1f22] gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRunAllTests}
              disabled={isRunningAll || isDiscovering || tests.length === 0}
              title="Run All Tests (Sequential)"
              className="p-1 rounded hover:bg-[#2e436e] text-[#59a869] disabled:opacity-50 transition-colors"
            >
              <Play size={14} className="fill-current" />
            </button>
            <button
              onClick={handleRunAllStreaming}
              disabled={isRunningAll || isDiscovering || tests.length === 0}
              title="Run All Tests (Streaming — real-time events)"
              className="p-1 rounded hover:bg-[#2e436e] text-[#e5c07b] disabled:opacity-50 transition-colors"
            >
              <Zap size={14} className="fill-current" />
            </button>
            <button
              onClick={discoverTests}
              disabled={isDiscovering}
              title="Refresh / Re-discover Tests"
              className={`p-1 rounded hover:bg-[#2b2d30] text-[#a8adbd] transition-colors ${
                isDiscovering ? 'animate-spin text-[#3574f0]' : ''
              }`}
            >
              <RotateCw size={13} />
            </button>
          </div>


          {/* Status summary badges */}
          <div className="flex items-center gap-2 text-[11px]">
            {passedCount > 0 && (
              <span className="flex items-center gap-1 text-[#59a869] font-medium">
                <CheckCircle size={11} /> {passedCount}
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-[#db5860] font-medium">
                <XCircle size={11} /> {failedCount}
              </span>
            )}
            <span className="text-[#707278]">{tests.length} total</span>
          </div>
        </div>

        {/* Search input */}
        <div className="p-2 border-b border-[#2b2d30] bg-[#1e1f22]">
          <input
            type="text"
            placeholder="Filter tests..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full px-2 py-1 bg-[#18191b] border border-[#393b40] rounded text-xs text-[#dfe1e5] focus:outline-none focus:border-[#3574f0]"
          />
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#232529]">
          {isDiscovering && tests.length === 0 ? (
            <div className="p-4 text-center text-[#707278]">
              <span>Discovering cargo tests...</span>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="p-4 text-center text-[#707278]">
              <span>No tests found in workspace</span>
            </div>
          ) : (
            filteredTests.map((test) => {
              const isSelected = selectedTest?.id === test.id;
              return (
                <div
                  key={test.id}
                  onClick={() => {
                    setSelectedTest(test);
                    if (test.output) {
                      setActiveResult({
                        test_id: test.id,
                        passed: test.status === 'passed',
                        duration_ms: test.duration_ms || 0,
                        stdout: test.output,
                        stderr: '',
                      });
                    }
                  }}
                  className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2e436e] text-white' : 'hover:bg-[#26282e] text-[#bcbec4]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {test.status === 'passed' && (
                      <CheckCircle size={13} className="text-[#59a869] shrink-0" />
                    )}
                    {test.status === 'failed' && (
                      <XCircle size={13} className="text-[#db5860] shrink-0" />
                    )}
                    {test.status === 'running' && (
                      <RotateCw size={13} className="text-[#3574f0] animate-spin shrink-0" />
                    )}
                    {test.status === 'idle' && (
                      <Clock size={13} className="text-[#707278] shrink-0" />
                    )}
                    <div className="truncate flex flex-col">
                      <span className="font-mono text-xs truncate">{test.name}</span>
                      <span className="text-[10px] text-[#707278] truncate">
                        {test.module_path}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {test.duration_ms !== undefined && (
                      <span className="text-[10px] text-[#868a91] font-mono">
                        {test.duration_ms}ms
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTest(test);
                      }}
                      title="Run Test"
                      className="p-1 hover:bg-[#393b40] rounded text-[#59a869]"
                    >
                      <Play size={11} className="fill-current" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Test Execution Output & Logs */}
      <div className="flex-1 flex flex-col bg-[#1e1f22]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b2d30] bg-[#1e1f22]">
          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-[#6c707e]" />
            <span className="text-[#dfe1e5] font-mono text-[11px]">
              {selectedTest ? selectedTest.id : 'Test Output Console'}
            </span>
          </div>
          {selectedTest && (
            <button
              onClick={() => handleRunTest(selectedTest)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#3574f0] hover:bg-[#3064d0] text-white rounded text-xs font-medium transition-colors"
            >
              <Play size={11} className="fill-current" />
              <span>Run Test</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 font-mono text-xs text-[#dcdcdc] bg-[#18191b] leading-relaxed select-text">
          {selectedTest?.output || activeResult?.stdout ? (
            <pre className="whitespace-pre">
              {activeResult?.stdout || selectedTest?.output}
              {activeResult?.stderr ? `\n\n--- STDERR ---\n${activeResult.stderr}` : ''}
              {activeResult?.failure_message
                ? `\n\n[FAILURE REASON]: ${activeResult.failure_message}`
                : ''}
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#707278]">
              <Terminal size={24} className="mb-2 opacity-40" />
              <span>Click 'Run Test' to execute the selected cargo unit/integration test</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
