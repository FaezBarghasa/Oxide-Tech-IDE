import { StatusBar } from './StatusBar';
import { TopNavigationBar } from './TopNavigationBar';
import { ToolWindowStripe } from './ToolWindowStripe';
import { ToolWindowPanel } from './ToolWindowPanel';
import { ToolWindowContent } from './ToolWindowContent';
import { SplitPane } from '../common/SplitPane';
import { useLayoutState } from './useLayoutState';
import { useSettingsStore } from '../../state/settingsStore';
import { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface MainLayoutProps {
  editor: ReactNode;
  bottomPanels?: ReactNode;
}

export function MainLayout({ editor, bottomPanels }: MainLayoutProps) {
  const zenMode = useSettingsStore(useShallow(state => state.zenMode));
  
  const {
    activeLeftWindow,
    activeRightWindow,
    activeBottomWindow,
    leftDockWidth,
    rightDockWidth,
    bottomDockHeight,
  } = useLayoutState(useShallow(state => ({
    activeLeftWindow: state.activeLeftWindow,
    activeRightWindow: state.activeRightWindow,
    activeBottomWindow: state.activeBottomWindow,
    leftDockWidth: state.leftDockWidth,
    rightDockWidth: state.rightDockWidth,
    bottomDockHeight: state.bottomDockHeight,
  })));

  if (zenMode) {
    return (
      <div className="flex flex-col h-screen w-full bg-ide-bg text-ide-text font-sans overflow-hidden">
        <main className="flex-1 overflow-hidden min-w-0 relative">
          {editor}
        </main>
      </div>
    );
  }

  // Build the center area (Left Panel | Editor | Right Panel)
  let centerArea = editor;

  if (activeRightWindow) {
    centerArea = (
      <SplitPane
        direction="horizontal"
        first={centerArea}
        second={<ToolWindowPanel id={activeRightWindow}><ToolWindowContent id={activeRightWindow} /></ToolWindowPanel>}
        initialSize={rightDockWidth}
        minSize={150}
        maxSize={600}
        reverse={true}
      />
    );
  }

  if (activeLeftWindow) {
    centerArea = (
      <SplitPane
        direction="horizontal"
        first={<ToolWindowPanel id={activeLeftWindow}><ToolWindowContent id={activeLeftWindow} /></ToolWindowPanel>}
        second={centerArea}
        initialSize={leftDockWidth}
        minSize={150}
        maxSize={600}
        reverse={false}
      />
    );
  }

  // Combine center area with Bottom Panel
  let mainContent = centerArea;
  if (activeBottomWindow) {
    const bottomContent = activeBottomWindow === 'terminal' && bottomPanels 
      ? bottomPanels 
      : <ToolWindowContent id={activeBottomWindow} />;

    mainContent = (
      <SplitPane
        direction="vertical"
        first={centerArea}
        second={<ToolWindowPanel id={activeBottomWindow}>{bottomContent}</ToolWindowPanel>}
        initialSize={bottomDockHeight}
        minSize={100}
        maxSize={800}
        reverse={true}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-ide-bg text-ide-text font-sans overflow-hidden border border-ide-border">
      <TopNavigationBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        <ToolWindowStripe position="left" />
        
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <div className="flex flex-1 overflow-hidden relative bg-ide-panel/30">
            {mainContent}
          </div>
          <ToolWindowStripe position="bottom" />
        </div>

        <ToolWindowStripe position="right" />
      </div>
      
      <StatusBar />
    </div>
  );
}
