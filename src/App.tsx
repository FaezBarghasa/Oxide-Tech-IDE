import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './state/queryClient';
import { useSettingsStore } from './state/settingsStore';
import {
  MainLayout,
  Omnibar,
  HarpoonBuffers,
  TransientOverlay,
  TaskHUD,
  SettingsModal,
  SearchEverywhereOverlay
} from './components';

export default function App() {
  const { activeOverlay, setActiveOverlay, transientView, setTransientView } = useSettingsStore();
  const lastShiftPressRef = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testOverlay = params.get('overlay');
    if (testOverlay === 'search-everywhere' || testOverlay === 'settings') {
      setActiveOverlay(testOverlay);
    }
  }, [setActiveOverlay]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const now = Date.now();

      // Double-Shift Detection for Search Everywhere
      if (e.key === 'Shift') {
        if (now - lastShiftPressRef.current < 300) {
          e.preventDefault();
          setActiveOverlay(activeOverlay === 'search-everywhere' ? null : 'search-everywhere');
          lastShiftPressRef.current = 0;
          return;
        } else {
          lastShiftPressRef.current = now;
        }
      }

      // Ctrl+Alt+S -> Non-Modal Settings
      if (isCmdOrCtrl && e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setActiveOverlay(activeOverlay === 'settings' ? null : 'settings');
        return;
      }

      // Ctrl+K -> Omnibar
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
      <MainLayout />
      <Omnibar />
      <HarpoonBuffers />
      <TransientOverlay />
      <TaskHUD />
      {activeOverlay === 'settings' && <SettingsModal />}
      <SearchEverywhereOverlay 
        isOpen={activeOverlay === 'search-everywhere'} 
        onClose={() => setActiveOverlay(null)} 
      />
    </QueryClientProvider>
  );
}

