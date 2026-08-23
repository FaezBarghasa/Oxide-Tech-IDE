
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { upsertAgents, AgentState } from '../store/swarmSlice';
import { AppDispatch } from '../store/store';

export const useTelemetry = (telemetryUrl: string) => {
    const dispatch = useDispatch<AppDispatch>();
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Ensure this code runs only in the browser
        if (typeof window === 'undefined') {
            return;
        }

        // Create a new worker
        const worker = new Worker(new URL('../workers/telemetryWorker.ts', import.meta.url), {
            type: 'module',
        });
        workerRef.current = worker;

        // Start the worker
        worker.postMessage({ type: 'start', telemetryUrl });

        // Handle messages from the worker
        worker.onmessage = (event) => {
            const { type, payload } = event.data;
            if (type === 'batchUpdate') {
                // The payload is an array of AgentState objects
                dispatch(upsertAgents(payload as AgentState[]));
            } else if (type === 'error') {
                console.error('Telemetry hook received error from worker:', payload);
            }
        };

        // Handle errors from the worker
        worker.onerror = (error) => {
            console.error('Telemetry worker error:', error);
        };

        // Cleanup function
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, [telemetryUrl, dispatch]);
};
