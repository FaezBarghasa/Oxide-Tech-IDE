import { useState } from 'react';
import { Radio, Send, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/theme';

interface MQTTMessage {
  topic: string;
  payload: string;
  time: string;
}

export function MQTT5Client() {
  const [broker, setBroker] = useState('mqtt://127.0.0.1:1883');
  const [subTopic, setSubTopic] = useState('sensor/temperature');
  const [pubTopic, setPubTopic] = useState('sensor/temperature');
  const [pubPayload, setPubPayload] = useState('{"temp": 24.5, "unit": "C"}');
  
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<MQTTMessage[]>([
    { topic: 'sensor/temperature', payload: '{"temp": 22.1}', time: '20:10:05' },
    { topic: 'sensor/temperature', payload: '{"temp": 22.8}', time: '20:10:15' }
  ]);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setIsConnected(prev => !prev);
      setConnecting(false);
    }, 800);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTopic.trim() || !pubPayload.trim()) return;

    const newMsg: MQTTMessage = {
      topic: pubTopic,
      payload: pubPayload,
      time: new Date().toLocaleTimeString()
    };
    
    // Add to message log (simulating loopback if subscribed to same topic)
    if (pubTopic === subTopic) {
      setMessages(prev => [newMsg, ...prev]);
    }
    setPubPayload('');
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTopic.trim()) return;
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30 flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Radio className="w-4 h-4 text-ide-keyword" />
          <span>MQTT 5.0 Protocol Client</span>
        </span>
        <span className={cn(
          "w-2.5 h-2.5 rounded-full",
          isConnected ? "bg-green-400" : "bg-red-500 animate-pulse"
        )} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Broker settings */}
        <div className="bg-ide-panel border border-ide-border/40 rounded p-2.5 flex space-x-2">
          <input
            type="text"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            disabled={isConnected}
            className="flex-1 bg-ide-bg border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none placeholder-ide-text/20"
          />
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={cn(
              "px-3 py-1 text-xs rounded font-bold transition-colors cursor-pointer flex items-center space-x-1",
              isConnected ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" : "bg-ide-selection hover:bg-ide-activeTab text-white"
            )}
          >
            {connecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isConnected ? (
              <span>Disconnect</span>
            ) : (
              <span>Connect</span>
            )}
          </button>
        </div>

        {/* Subscribe */}
        <form onSubmit={handleSubscribe} className="bg-ide-panel border border-ide-border/40 rounded p-2.5 space-y-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Subscribe Topic</span>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="sensor/+"
              value={subTopic}
              onChange={(e) => setSubTopic(e.target.value)}
              className="flex-1 bg-ide-bg border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!isConnected}
              className="bg-ide-selection hover:bg-ide-activeTab text-white text-xs px-3 rounded font-semibold cursor-pointer disabled:opacity-40"
            >
              Subscribe
            </button>
          </div>
        </form>

        {/* Publish */}
        <form onSubmit={handlePublish} className="bg-ide-panel border border-ide-border/40 rounded p-2.5 space-y-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Publish message</span>
          <div className="flex flex-col space-y-2">
            <input
              type="text"
              placeholder="topic (e.g. sensor/temperature)"
              value={pubTopic}
              onChange={(e) => setPubTopic(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <textarea
              placeholder='payload (e.g. {"temp": 24.5})'
              value={pubPayload}
              onChange={(e) => setPubPayload(e.target.value)}
              rows={2}
              className="bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!isConnected}
              className="bg-ide-selection hover:bg-ide-activeTab text-white text-xs py-1 rounded font-semibold flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Message</span>
            </button>
          </div>
        </form>

        {/* Message logs */}
        <div className="flex flex-col space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Message Stream</span>
          <div className="bg-ide-bg border border-ide-border rounded p-2 min-h-[120px] max-h-[200px] overflow-y-auto space-y-1.5">
            {messages.map((m, idx) => (
              <div key={idx} className="border-b border-ide-border/30 pb-1.5 last:border-b-0 text-[11px] font-mono leading-normal">
                <div className="flex items-center justify-between text-ide-keyword">
                  <span>Topic: {m.topic}</span>
                  <span className="text-[9px] text-ide-text/40">{m.time}</span>
                </div>
                <div className="text-white mt-0.5 whitespace-pre-wrap select-all">{m.payload}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-[10px] text-ide-text/30 italic text-center py-4">No messages received.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
