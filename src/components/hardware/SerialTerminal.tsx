import { useState } from 'react';
import { Terminal, Send, Trash2, Power } from 'lucide-react';
import { cn } from '../../utils/theme';

export function SerialTerminal() {
  const [port, setPort] = useState('/dev/ttyUSB0');
  const [baudRate, setBaudRate] = useState('115200');
  const [isConnected, setIsConnected] = useState(false);
  const [inputTx, setInputTx] = useState('');
  
  const [logs, setLogs] = useState<string[]>([
    '[System] Initializing Serial Interface...',
    '[System] Ready to connect.'
  ]);

  const handleConnect = () => {
    setIsConnected(prev => {
      const next = !prev;
      if (next) {
        setLogs(prevLogs => [
          ...prevLogs,
          `[Connection] Opened port ${port} at ${baudRate} bps.`,
          '[TX] Init command sent.',
          '[RX] Device response: Bootloader v1.0.4 initialized successfully.'
        ]);
      } else {
        setLogs(prevLogs => [
          ...prevLogs,
          `[Connection] Closed port ${port}.`
        ]);
      }
      return next;
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTx.trim()) return;

    setLogs(prev => [
      ...prev,
      `[TX] -> ${inputTx}`,
      `[RX] <- ACK: ${inputTx.toUpperCase()}`
    ]);
    setInputTx('');
  };

  const handleClear = () => {
    setLogs(['[System] Logs cleared.']);
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30 flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Terminal className="w-4 h-4 text-ide-keyword" />
          <span>Serial I/O Monitor</span>
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            title="Clear Logs"
            className="text-ide-text hover:text-white transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <span className={cn(
            "w-2.5 h-2.5 rounded-full",
            isConnected ? "bg-green-400" : "bg-red-500 animate-pulse"
          )} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Connection config bar */}
        <div className="bg-ide-panel border border-ide-border/40 rounded p-2.5 flex flex-wrap gap-2 items-center">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-ide-text/60 uppercase">Port</span>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isConnected}
              className="bg-ide-bg border border-ide-border rounded px-2 py-0.5 text-xs text-white focus:outline-none w-28"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-ide-text/60 uppercase">Baud</span>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              disabled={isConnected}
              className="bg-ide-bg border border-ide-border rounded p-0.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
            </select>
          </div>

          <button
            onClick={handleConnect}
            className={cn(
              "px-3 py-1 text-xs rounded font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ml-auto",
              isConnected ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" : "bg-ide-selection hover:bg-ide-activeTab text-white"
            )}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isConnected ? 'Disconnect' : 'Connect'}</span>
          </button>
        </div>

        {/* Output logs screen */}
        <div className="flex flex-col space-y-1.5 flex-1 min-h-[140px]">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Console Log</span>
          <div className="bg-ide-bg border border-ide-border rounded p-2.5 font-mono text-[11px] leading-relaxed text-ide-text flex-1 h-[180px] overflow-y-auto space-y-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={cn(
                  log.startsWith('[RX]') && "text-green-400",
                  log.startsWith('[TX]') && "text-ide-keyword",
                  log.startsWith('[Connection]') && "text-white font-bold",
                  log.startsWith('[System]') && "text-ide-text/40"
                )}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Sender bar */}
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            placeholder="Send command payload..."
            value={inputTx}
            onChange={(e) => setInputTx(e.target.value)}
            disabled={!isConnected}
            className="flex-1 bg-ide-panel border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none placeholder-ide-text/30"
          />
          <button
            type="submit"
            disabled={!isConnected}
            className="bg-ide-selection hover:bg-ide-activeTab text-white px-3 rounded font-semibold flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
