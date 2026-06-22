import { WS_BASE } from '../constants/endpoints';

type WSMessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<WSMessageHandler> = new Set();
  
  connect() {
    this.ws = new WebSocket(`${WS_BASE}/ws`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.forEach(h => h(data));
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
    
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 5000); // Reconnect
    };
  }

  subscribe(handler: WSMessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const wsService = new WebSocketService();
