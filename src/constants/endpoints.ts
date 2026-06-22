export const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080';
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
