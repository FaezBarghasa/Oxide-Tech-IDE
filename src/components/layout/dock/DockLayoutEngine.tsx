import React, { useEffect, useRef, useState } from 'react';
import { Layout, Model, TabNode, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

import { ProjectToolWindow } from '../../tools/ProjectToolWindow';
import { CargoToolWindow } from '../../tools/CargoToolWindow';
import { ProblemsToolWindow } from '../../tools/ProblemsToolWindow';
import { MacroViewerToolWindow } from '../../tools/MacroViewerToolWindow';
import { PlaywrightToolWindow } from '../../tools/PlaywrightToolWindow';
import { SlintPreviewToolWindow } from '../../tools/SlintPreviewToolWindow';
import { EmbeddedSimToolWindow } from '../../tools/EmbeddedSimToolWindow';
import { IcedInspectorToolWindow } from '../../tools/IcedInspectorToolWindow';
import { DebuggerToolWindow } from '../../tools/DebuggerToolWindow';
import { MQTTTerminalToolWindow } from '../../tools/MQTTTerminalToolWindow';
import { CodeEditor } from '../../editor/CodeEditor';
import { TerminalPanel } from '../../terminal/TerminalPanel';
import { GitPanel } from '../../git/GitPanel';
import { ASTVisualizer } from '../../ast/ASTVisualizer';
import { AIChatPanel } from '../../ai/AIChatPanel';
import { tauriCommands } from '../../../services/tauri';

const defaultLayoutJson: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    borderSize: 32,
    borderMinSize: 150,
  },
  borders: [
    {
      type: 'border',
      location: 'left',
      selected: 0,
      children: [
        {
          type: 'tab',
          id: 'project',
          name: 'Project',
          component: 'project',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'cargo',
          name: 'Cargo',
          component: 'cargo',
          enableClose: false,
        },
      ],
    },
    {
      type: 'border',
      location: 'right',
      selected: -1,
      children: [
        {
          type: 'tab',
          id: 'ai',
          name: 'AI Assistant',
          component: 'ai',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'structure',
          name: 'Structure',
          component: 'structure',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'slint',
          name: 'Slint Preview',
          component: 'slint',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'embedded_sim',
          name: 'Embedded Sim',
          component: 'embedded_sim',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'iced_inspector',
          name: 'Iced Inspector',
          component: 'iced_inspector',
          enableClose: false,
        },
      ],
    },
    {
      type: 'border',
      location: 'bottom',
      selected: 0,
      children: [
        {
          type: 'tab',
          id: 'debug',
          name: 'Debug',
          component: 'debug',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'mqtt_terminal',
          name: 'MQTT Terminal',
          component: 'mqtt_terminal',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'terminal',
          name: 'Terminal',
          component: 'terminal',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'problems',
          name: 'Problems',
          component: 'problems',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'macro',
          name: 'Macro Viewer',
          component: 'macro',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'playwright',
          name: 'Playwright E2E',
          component: 'playwright',
          enableClose: false,
        },
        {
          type: 'tab',
          id: 'git',
          name: 'Git',
          component: 'git',
          enableClose: false,
        },
      ],
    },
  ],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 100,
        selected: 0,
        children: [
          {
            type: 'tab',
            id: 'editor',
            name: 'Editor',
            component: 'editor',
            enableClose: false,
          },
        ],
      },
    ],
  },
};

export function DockLayoutEngine() {
  const [model, setModel] = useState<Model>(() => Model.fromJson(defaultLayoutJson));
  const saveTimeoutRef = useRef<any>(null);

  // Load saved layout from ~/.oxide/layout.json on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const savedJson = await tauriCommands.loadIdeLayout();
        if (savedJson && savedJson !== '{}') {
          const parsed = JSON.parse(savedJson);
          setModel(Model.fromJson(parsed));
        }
      } catch (err) {
        console.warn('Using default layout:', err);
      }
    }
    loadSaved();
  }, []);

  const handleModelChange = (updatedModel: Model) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const json = JSON.stringify(updatedModel.toJson());
        tauriCommands.saveIdeLayout(json).catch((err) => {
          console.warn('Failed to save layout:', err);
        });
      } catch (err) {
        console.warn('Layout serialize error:', err);
      }
    }, 1000);
  };

  const factory = (node: TabNode): React.ReactNode => {
    const component = node.getComponent();

    switch (component) {
      case 'debug':
        return <DebuggerToolWindow />;
      case 'mqtt_terminal':
        return <MQTTTerminalToolWindow />;
      case 'project':
        return <ProjectToolWindow />;
      case 'cargo':
        return <CargoToolWindow />;
      case 'problems':
        return <ProblemsToolWindow />;
      case 'macro':
        return <MacroViewerToolWindow />;
      case 'playwright':
        return <PlaywrightToolWindow />;
      case 'slint':
        return <SlintPreviewToolWindow />;
      case 'embedded_sim':
        return <EmbeddedSimToolWindow />;
      case 'iced_inspector':
        return <IcedInspectorToolWindow />;
      case 'editor':
        return <CodeEditor />;
      case 'terminal':
        return <TerminalPanel />;
      case 'git':
        return <GitPanel />;
      case 'structure':
        return <ASTVisualizer />;
      case 'ai':
        return <AIChatPanel />;
      default:
        return <div className="p-4 text-xs text-white">Tab: {node.getName()}</div>;
    }
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#1e1f22]">
      <Layout
        model={model}
        factory={factory}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
