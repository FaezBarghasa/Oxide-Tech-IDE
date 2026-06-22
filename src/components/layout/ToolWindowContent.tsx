import { Suspense, lazy } from 'react';
import { ToolWindowId } from './useLayoutState';
import { FileTree } from '../fileExplorer/FileTree';
import { GitPanel } from '../git/GitPanel';

// Lazy load heavy components
const AIChatPanel = lazy(() => import('../ai/AIChatPanel').then(m => ({ default: m.AIChatPanel })));
const SkillsOrchestrator = lazy(() => import('../ai/SkillsOrchestrator').then(m => ({ default: m.SkillsOrchestrator })));
const MCPExplorer = lazy(() => import('../mcp/MCPExplorer').then(m => ({ default: m.MCPExplorer })));
const PreviewContainer = lazy(() => import('../previews/PreviewContainer').then(m => ({ default: m.PreviewContainer })));
const BackendTester = lazy(() => import('../previews/BackendTester').then(m => ({ default: m.BackendTester })));
const MQTT5Client = lazy(() => import('../hardware/MQTT5Client').then(m => ({ default: m.MQTT5Client })));
const SerialTerminal = lazy(() => import('../hardware/SerialTerminal').then(m => ({ default: m.SerialTerminal })));
const MultiAgentCoordinator = lazy(() => import('../ai/MultiAgentCoordinator').then(m => ({ default: m.MultiAgentCoordinator })));
const ASTVisualizer = lazy(() => import('../ast/ASTVisualizer').then(m => ({ default: m.ASTVisualizer })));
const NeuralDebugger = lazy(() => import('../ai/NeuralDebugger').then(m => ({ default: m.NeuralDebugger })));

interface ToolWindowContentProps {
  id: ToolWindowId;
}

export function ToolWindowContent({ id }: ToolWindowContentProps) {
  let content;

  switch (id) {
    case 'project':
      content = <FileTree />;
      break;
    case 'search':
      content = (
        <div className="flex flex-col space-y-3 p-3 select-none">
          <input
            type="text"
            placeholder="Search..."
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
      content = <div className="p-4 text-xs">Terminal Panel Placeholder</div>;
      break;
    case 'debug':
      content = <MultiAgentCoordinator />;
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
    <Suspense fallback={<div className="p-4 text-xs text-ide-text/50">Loading component...</div>}>
      {content}
    </Suspense>
  );
}
