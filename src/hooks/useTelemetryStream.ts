import { useEffect, useRef } from 'react';
import { useSwarmStore } from '../state/swarmStore';

export function useTelemetryStream(url: string) {
  const { updateAgentPhase, appendLog } = useSwarmStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Note: Native EventSource doesn't support HTTP/3 yet
    // In production, use a library like fetch-event-source or quic-ws
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('agent-state-changed', (event) => {
      try {
        const data = JSON.parse(event.data);
        updateAgentPhase({
          id: data.agent_id,
          phase: data.phase,
          iteration: data.iteration,
        });
      } catch (err) {
        console.error('Failed to parse agent-state-changed event:', err);
      }
    });

    eventSource.addEventListener('agent-log', (event) => {
      try {
        const data = JSON.parse(event.data);
        appendLog({
          id: data.agent_id,
          log: data.message,
        });
      } catch (err) {
        console.error('Failed to parse agent-log event:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.error('Telemetry stream error:', error);
      // EventSource will automatically reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [url, updateAgentPhase, appendLog]);
}