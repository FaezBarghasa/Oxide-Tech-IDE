import { API_BASE } from '../constants/endpoints';

async function fetchWithBackoff(url: string, options: RequestInit, retries = 3, backoff = 300): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(r => setTimeout(r, backoff));
    return fetchWithBackoff(url, options, retries - 1, backoff * 2);
  }
}

export const apiClient = {
  get: (endpoint: string) => fetchWithBackoff(`${API_BASE}${endpoint}`, { method: 'GET' }).then(r => r.json()),
  post: (endpoint: string, body: any) => fetchWithBackoff(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json())
};
