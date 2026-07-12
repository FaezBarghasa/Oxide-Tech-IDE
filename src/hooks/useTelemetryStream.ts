import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateAgentPhase, appendLog } from '../store/swarmSlice';

export function useTelemetryStream(url: string) {
  const dispatch = useAppDispatch();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Note: Native EventSource doesn't support HTTP/3 yet
    // In production, use a library like fetch-event-source or quic-ws
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('agent-state-changed', (event) => {
      const data = JSON.parse(event.data);
      dispatch(updateAgentPhase({
        id: data.agent_id,
        phase: data.phase,
        iteration: data.iteration,
      }));
    });

    eventSource.addEventListener('agent-log', (event) => {
      const data = JSON.parse(event.data);
      dispatch(appendLog({
        id: data.agent_id,
        log: data.message,
      }));
    });

    eventSource.onerror = (error) => {
      console.error('Telemetry stream error:', error);
      // EventSource will automatically reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [url, dispatch]);
}