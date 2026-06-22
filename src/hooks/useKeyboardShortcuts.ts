import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const [keyCombo, callback] of Object.entries(shortcuts)) {
        const parts = keyCombo.split('+');
        const isCtrl = parts.includes('Ctrl') ? e.ctrlKey || e.metaKey : true;
        const isShift = parts.includes('Shift') ? e.shiftKey : !e.shiftKey;
        const key = parts[parts.length - 1];

        if (isCtrl && isShift && e.key.toLowerCase() === key.toLowerCase()) {
          e.preventDefault();
          callback();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
