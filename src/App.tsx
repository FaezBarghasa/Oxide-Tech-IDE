import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './state/queryClient';
import { useSettingsStore } from './state/settingsStore';
import {
  MainLayout,
  CodeEditor,
  TerminalPanel,
  Omnibar,
  HarpoonBuffers,
  TransientOverlay,
  TaskHUD,
  SettingsModal
} from './components';

export default function App() {
  const { activeOverlay, setActiveOverlay, transientView, setTransientView } = useSettingsStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        setActiveOverlay(activeOverlay === 'omnibar' ? null : 'omnibar');
      } else if (isCmdOrCtrl && e.key === 'e') {
        e.preventDefault();
        setActiveOverlay(activeOverlay === 'harpoon' ? null : 'harpoon');
      } else if (isCmdOrCtrl && e.key === 'p') {
        e.preventDefault();
        if (activeOverlay === 'transient' && transientView === 'previews') {
          setActiveOverlay(null);
          setTransientView(null);
        } else {
          setTransientView('previews');
          setActiveOverlay('transient');
        }
      } else if (e.key === 'Escape') {
        if (activeOverlay) {
          e.preventDefault();
          setActiveOverlay(null);
          setTransientView(null);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, transientView, setActiveOverlay, setTransientView]);

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout
        editor={<CodeEditor />}
        bottomPanels={<TerminalPanel />}
      />
      <Omnibar />
      <HarpoonBuffers />
      <TransientOverlay />
      <TaskHUD />
      {activeOverlay === 'settings' && <SettingsModal />}
    </QueryClientProvider>
  );
}
