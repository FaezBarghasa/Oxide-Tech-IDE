import { StatusBar } from './StatusBar';
import { Header } from './Header';
import { DockLayoutEngine } from './dock/DockLayoutEngine';
import { useSettingsStore } from '../../state/settingsStore';
import { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface MainLayoutProps {
  editor?: ReactNode;
  bottomPanels?: ReactNode;
}

export function MainLayout({ editor: _editor, bottomPanels: _bottomPanels }: MainLayoutProps) {
  const zenMode = useSettingsStore(useShallow((state) => state.zenMode));

  if (zenMode) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#1e1f22] text-[#dfe1e5] font-sans overflow-hidden">
        <main className="flex-1 overflow-hidden min-w-0 relative">
          <DockLayoutEngine />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1f22] text-[#dfe1e5] font-sans overflow-hidden select-none">
      <Header />
      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
        <DockLayoutEngine />
      </div>
      <StatusBar />
    </div>
  );
}
