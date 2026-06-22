import { useState } from 'react';
import { Send, Globe } from 'lucide-react';
import { tauriCommands } from '../../services/tauri';

export function BackendTester() {
  const [url, setUrl] = useState('http://127.0.0.1:8080/api/v1/health');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [reqHeaders, setReqHeaders] = useState('Content-Type: application/json');
  const [reqBody, setReqBody] = useState('{}');

  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [resBody, setResBody] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const start = Date.now();

    try {
      // Parse headers
      const headersObj: Record<string, string> = {};
      reqHeaders.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          headersObj[parts[0].trim()] = parts.slice(1).join(':').trim();
        }
      });

      // Route through backend reqwest proxy to bypass CORS
      const bodyPayload = method === 'GET' ? '' : reqBody;
      const text = await tauriCommands.proxyRequest(url, method, headersObj, bodyPayload);
      
      setResponseStatus(200); // Curl request was successful
      setResponseTime(Date.now() - start);
      
      try {
        setResBody(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResBody(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseTime(Date.now() - start);
      setResBody(JSON.stringify({ error: err.message || err }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30 flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-ide-keyword" />
          <span>Local REST Client</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <form onSubmit={handleRequest} className="space-y-3 bg-ide-panel border border-ide-border/40 rounded p-3">
          <div className="flex space-x-2">
            <select
              value={method}
              onChange={(e: any) => setMethod(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab font-bold"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-ide-bg border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-ide-selection hover:bg-ide-activeTab text-white px-4 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/50">Headers (Name: Value)</label>
              <textarea
                value={reqHeaders}
                onChange={(e) => setReqHeaders(e.target.value)}
                rows={3}
                className="w-full bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/50">Request Body</label>
              <textarea
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
                rows={3}
                className="w-full bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Output */}
        <div className="bg-ide-panel/30 border border-ide-border/40 rounded p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between border-b border-ide-border/40 pb-1.5 text-xs select-none">
            <span className="font-bold text-white uppercase tracking-wider text-[9px]">Response</span>
            {responseStatus !== null && (
              <div className="flex space-x-3 text-[10px]">
                <span>Status: <strong className={responseStatus >= 200 && responseStatus < 300 ? "text-green-400" : "text-red-400"}>{responseStatus}</strong></span>
                <span>Time: <strong>{responseTime} ms</strong></span>
              </div>
            )}
          </div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap select-all leading-relaxed text-ide-text overflow-auto max-h-[220px] p-2 bg-ide-bg/50 rounded border border-ide-border/20">
            {resBody || 'Send a request to see output.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
