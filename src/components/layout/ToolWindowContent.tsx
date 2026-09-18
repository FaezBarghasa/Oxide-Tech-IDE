import { Suspense, lazy } from 'react';
import { ToolWindowId } from './useLayoutState';
import { GitPanel } from '../git/GitPanel';

// Lazy load heavy components
const ProjectToolWindow = lazy(() => import('../tools/ProjectToolWindow').then(m => ({ default: m.ProjectToolWindow })));
const CargoToolWindow = lazy(() => import('../tools/CargoToolWindow').then(m => ({ default: m.CargoToolWindow })));
const TestExplorerToolWindow = lazy(() => import('../tools/TestExplorerToolWindow').then(m => ({ default: m.TestExplorerToolWindow })));
const ProblemsToolWindow = lazy(() => import('../tools/ProblemsToolWindow').then(m => ({ default: m.ProblemsToolWindow })));
const DebuggerToolWindow = lazy(() => import('../tools/DebuggerToolWindow').then(m => ({ default: m.DebuggerToolWindow })));
const LocalHistoryToolWindow = lazy(() => import('../tools/LocalHistoryToolWindow').then(m => ({ default: m.LocalHistoryToolWindow })));
const MacroViewerToolWindow = lazy(() => import('../tools/MacroViewerToolWindow').then(m => ({ default: m.MacroViewerToolWindow })));
const EmbeddedSimToolWindow = lazy(() => import('../tools/EmbeddedSimToolWindow').then(m => ({ default: m.EmbeddedSimToolWindow })));
const SlintPreviewToolWindow = lazy(() => import('../tools/SlintPreviewToolWindow').then(m => ({ default: m.SlintPreviewToolWindow })));
const PlaywrightToolWindow = lazy(() => import('../tools/PlaywrightToolWindow').then(m => ({ default: m.PlaywrightToolWindow })));
const TerminalPanel = lazy(() => import('../terminal/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const AIChatPanel = lazy(() => import('../ai/AIChatPanel').then(m => ({ default: m.AIChatPanel })));
const SkillsOrchestrator = lazy(() => import('../ai/SkillsOrchestrator').then(m => ({ default: m.SkillsOrchestrator })));
const MCPExplorer = lazy(() => import('../mcp/MCPExplorer').then(m => ({ default: m.MCPExplorer })));
const PreviewContainer = lazy(() => import('../previews/PreviewContainer').then(m => ({ default: m.PreviewContainer })));
const BackendTester = lazy(() => import('../previews/BackendTester').then(m => ({ default: m.BackendTester })));
const MQTT5Client = lazy(() => import('../hardware/MQTT5Client').then(m => ({ default: m.MQTT5Client })));
const SerialTerminal = lazy(() => import('../hardware/SerialTerminal').then(m => ({ default: m.SerialTerminal })));
const ASTVisualizer = lazy(() => import('../ast/ASTVisualizer').then(m => ({ default: m.ASTVisualizer })));
const NeuralDebugger = lazy(() => import('../ai/NeuralDebugger').then(m => ({ default: m.NeuralDebugger })));

interface ToolWindowContentProps {
  id: ToolWindowId;
}

export function ToolWindowContent({ id }: ToolWindowContentProps) {
  let content;

  switch (id) {
    case 'project':
      content = <ProjectToolWindow />;
      break;
    case 'cargo':
      content = <CargoToolWindow />;
      break;
    case 'test':
      content = <TestExplorerToolWindow />;
      break;
    case 'problems':
      content = <ProblemsToolWindow />;
      break;
    case 'debug':
      content = <DebuggerToolWindow />;
      break;
    case 'local_history':
      content = <LocalHistoryToolWindow />;
      break;
    case 'macro_viewer':
      content = <MacroViewerToolWindow />;
      break;
    case 'embedded_sim':
      content = <EmbeddedSimToolWindow />;
      break;
    case 'slint_preview':
      content = <SlintPreviewToolWindow />;
      break;
    case 'playwright':
      content = <PlaywrightToolWindow />;
      break;
    case 'search':
      content = (
        <div className="flex flex-col space-y-3 p-3 select-none">
          <input
            type="text"
            placeholder="Search across workspace..."
            className="w-full bg-ide-panel border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab"
          />
          <input
            type="text"
            placeholder="Replace..."
            className="w-full bg-ide-panel border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab"
          />
        </div>
      );
      break;
    case 'git':
      content = <GitPanel />;
      break;
    case 'ai':
      content = <AIChatPanel />;
      break;
    case 'skills':
      content = <SkillsOrchestrator />;
      break;
    case 'mcp':
      content = <MCPExplorer />;
      break;
    case 'previews':
      content = <PreviewContainer />;
      break;
    case 'rest':
      content = <BackendTester />;
      break;
    case 'mqtt':
      content = <MQTT5Client />;
      break;
    case 'serial':
      content = <SerialTerminal />;
      break;
    case 'terminal':
      content = <TerminalPanel />;
      break;
    case 'ast':
      content = <ASTVisualizer />;
      break;
    case 'neural':
      content = <NeuralDebugger />;
      break;
    default:
      content = <div className="p-4 text-xs text-ide-text">Not Implemented</div>;
  }

  return (
    <Suspense fallback={<div className="p-4 text-xs text-ide-text/50">Loading tool window...</div>}>
      {content}
    </Suspense>
  );
}

