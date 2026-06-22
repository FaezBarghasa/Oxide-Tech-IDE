import { useEffect } from 'react';
import { wsService } from '../services/websocket';

export function useWebSocket(onMessage: (data: any) => void) {
  useEffect(() => {
    const unsub = wsService.subscribe(onMessage);
    return () => {
      unsub();
    };
  }, [onMessage]);
}
