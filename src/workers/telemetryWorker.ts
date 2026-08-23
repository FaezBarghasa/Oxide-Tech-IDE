
import { AgentState } from '../store/swarmSlice';

let updateBatch: AgentState[] = [];
let lastUpdateTime = 0;
const BATCH_INTERVAL = 16; // ms, roughly 60fps

function postBatch() {
    if (updateBatch.length > 0) {
        self.postMessage({ type: 'batchUpdate', payload: updateBatch });
        updateBatch = [];
    }
    lastUpdateTime = performance.now();
}

self.onmessage = async (event) => {
    if (event.data.type === 'start') {
        const { telemetryUrl } = event.data;
        try {
            // Note: Web Workers do not have direct access to a native QUIC/HTTP3 API.
            // We are assuming the browser's fetch API can handle this, or that a polyfill/proxy is in place.
            // In a real-world Tauri app, you might use a sidecar or the main process to proxy this.
            // For this implementation, we'll use fetch and assume it works with SSE over HTTP/3.
            const response = await fetch(telemetryUrl);

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = line.substring(6);
                            const parsedEvent = JSON.parse(jsonData);
                            
                            // Here you would transform the raw event into AgentState
                            // This is a placeholder transformation
                            const agentUpdate: AgentState = {
                                id: parsedEvent.id,
                                name: parsedEvent.target,
                                status: parsedEvent.level === 'ERROR' ? 'Failed' : 'Running', // Example logic
                                logs: [parsedEvent.message],
                            };

                            updateBatch.push(agentUpdate);

                        } catch (e) {
                            console.error('Worker: Failed to parse JSON', e);
                        }
                    }
                }

                const now = performance.now();
                if (now - lastUpdateTime > BATCH_INTERVAL) {
                    postBatch();
                }
            }
        } catch (error) {
            console.error('Telemetry worker error:', error);
            self.postMessage({ type: 'error', payload: error.message });
        }
    }
};

// Ensure any remaining items are sent before the worker is terminated
self.addEventListener('close', () => {
    postBatch();
});
