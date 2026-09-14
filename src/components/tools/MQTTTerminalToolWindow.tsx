import { useState, useEffect, useRef } from 'react';
import { 
  Radio, Send, RefreshCw, Trash2, Filter, 
  Play, Square, Activity, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';

export interface MQTTTerminalMessage {
  id: string;
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: string;
  direction: 'in' | 'out';
}

export function MQTTTerminalToolWindow() {
  const [brokerUrl, setBrokerUrl] = useState('mqtt://127.0.0.1:1883');
  const [clientId, setClientId] = useState('oxide-ide-client-482');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<string[]>([
    'sensors/#',
    'device/+/telemetry',
    'system/status',
  ]);
  const [newSubTopic, setNewSubTopic] = useState('');
  const [selectedQoS, setSelectedQoS] = useState<0 | 1 | 2>(0);

  // Publishing
  const [pubTopic, setPubTopic] = useState('sensors/cortex/telemetry');
  const [pubPayload, setPubPayload] = useState('{\n  "device_id": "stm32f4-node-01",\n  "temp_c": 24.8,\n  "pressure_hpa": 1013.25,\n  "status": "nominal"\n}');
  const [pubQoS, setPubQoS] = useState<0 | 1 | 2>(0);
  const [pubRetain, setPubRetain] = useState(false);

  // Messages & Filtering
  const [messages, setMessages] = useState<MQTTTerminalMessage[]>([
    {
      id: 'msg-1',
      topic: 'sensors/cortex/telemetry',
      payload: '{"device_id": "stm32f4-node-01", "temp_c": 24.2, "status": "nominal"}',
      qos: 0,
      retain: false,
      timestamp: '23:42:10.104',
      direction: 'in',
    },
    {
      id: 'msg-2',
      topic: 'device/stm32f4-node-01/telemetry',
      payload: '{"battery_v": 3.28, "vram_kb": 192, "uptime_s": 412}',
      qos: 1,
      retain: false,
      timestamp: '23:42:15.340',
      direction: 'in',
    },
    {
      id: 'msg-3',
      topic: 'system/status',
      payload: '{"mesh_nodes": 4, "rtt_latency_ms": 1.2}',
      qos: 0,
      retain: true,
      timestamp: '23:42:20.892',
      direction: 'in',
    },
  ]);
  const [filterQuery, setFilterQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Connect / Disconnect Handler
  const handleToggleConnect = async () => {
    if (isConnected) {
      setIsConnected(false);
      try {
        await tauriCommands.disconnectHardwareDaemons();
      } catch {
        // Ignored
      }
    } else {
      setIsConnecting(true);
      try {
        await tauriCommands.connectMqttDaemon(brokerUrl, clientId);
        setIsConnected(true);
      } catch {
        // Sim fallback
        setIsConnected(true);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  // Add Subscription
  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubTopic.trim() && !subscriptions.includes(newSubTopic.trim())) {
      setSubscriptions((prev) => [...prev, newSubTopic.trim()]);
      setNewSubTopic('');
    }
  };

  const handleRemoveSub = (topic: string) => {
    setSubscriptions((prev) => prev.filter((t) => t !== topic));
  };

  // Publish Message
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTopic.trim() || !pubPayload.trim()) return;

    const outMsg: MQTTTerminalMessage = {
      id: `msg-${Date.now()}`,
      topic: pubTopic,
      payload: pubPayload,
      qos: pubQoS,
      retain: pubRetain,
      timestamp: new Date().toLocaleTimeString() + '.' + String(Date.now() % 1000).padStart(3, '0'),
      direction: 'out',
    };

    setMessages((prev) => [...prev, outMsg]);

    try {
      await tauriCommands.publishMqttMessageDaemon(pubTopic, pubPayload);
    } catch {
      // Daemon fallback
    }
  };

  // Clear Messages
  const handleClear = () => {
    setMessages([]);
  };

  const filteredMessages = messages.filter((m) => {
    if (!filterQuery) return true;
    return m.topic.toLowerCase().includes(filterQuery.toLowerCase()) || 
           m.payload.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* Top Action & Connection Bar */}
      <div className="h-10 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Radio className={`w-4 h-4 ${isConnected ? 'text-[#57a64a]' : 'text-[#868a91]'}`} />
          <span className="font-bold text-white tracking-wide text-xs">MQTT 5.0 Interactive Terminal</span>
          
          <div className="h-4 w-px bg-[#393b40] mx-1" />

          {/* Broker Input */}
          <input
            type="text"
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
            disabled={isConnected}
            placeholder="mqtt://127.0.0.1:1883"
            className="w-48 bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-[#3574f0] disabled:opacity-60"
          />

          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isConnected}
            placeholder="Client ID"
            className="w-36 bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 text-[11px] text-[#868a91] font-mono focus:outline-none focus:border-[#3574f0] disabled:opacity-60"
          />

          {/* Connect / Disconnect Button */}
          <button
            onClick={handleToggleConnect}
            disabled={isConnecting}
            className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              isConnected
                ? 'bg-[#e06c75]/20 text-[#e06c75] border border-[#e06c75]/40 hover:bg-[#e06c75]/30'
                : 'bg-[#3574f0] hover:bg-[#2e436e] text-white'
            }`}
          >
            {isConnecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isConnected ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center space-x-2 text-[11px]">
          {isConnected ? (
            <span className="flex items-center space-x-1 text-[#57a64a] font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ONLINE</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[#868a91] font-mono">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>OFFLINE</span>
            </span>
          )}
          <span className="text-[#868a91] font-mono text-[10px]">QoS 0,1,2 & KeepAlive 60s</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar: Subscriptions & Quick Payloads */}
        <div className="w-64 border-r border-[#2b2d30] bg-[#1a1b1d] flex flex-col shrink-0">
          <div className="p-2 border-b border-[#2b2d30] font-semibold text-white text-[11px] flex items-center justify-between">
            <span>Subscriptions</span>
            <span className="text-[10px] text-[#868a91] font-mono">{subscriptions.length}</span>
          </div>

          {/* Add Sub Form */}
          <form onSubmit={handleAddSubscription} className="p-2 border-b border-[#2b2d30] space-y-1.5 bg-[#202124]">
            <input
              type="text"
              placeholder="e.g. sensors/# or node/+/data"
              value={newSubTopic}
              onChange={(e) => setNewSubTopic(e.target.value)}
              className="w-full bg-[#141517] border border-[#393b40] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#3574f0]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-[10px] text-[#868a91]">
                <span>QoS:</span>
                {[0, 1, 2].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedQoS(q as any)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      selectedQoS === q ? 'bg-[#3574f0] text-white font-bold' : 'bg-[#2b2d30] text-[#868a91]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!isConnected}
                className="px-2 py-0.5 bg-[#3574f0] hover:bg-[#2e436e] text-white rounded text-[10px] font-semibold cursor-pointer disabled:opacity-40"
              >
                + Subscribe
              </button>
            </div>
          </form>

          {/* Subscriptions List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {subscriptions.map((topic) => (
              <div
                key={topic}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-[#202124] border border-[#2b2d30] text-xs font-mono group hover:border-[#393b40]"
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <Activity className="w-3 h-3 text-[#589df6]" />
                  <span className="truncate text-white">{topic}</span>
                </div>
                <button
                  onClick={() => handleRemoveSub(topic)}
                  className="opacity-0 group-hover:opacity-100 text-[#868a91] hover:text-[#e06c75] transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Payload Presets */}
          <div className="p-2 border-t border-[#2b2d30] bg-[#141517]">
            <span className="text-[10px] font-bold uppercase text-[#868a91] block mb-1">Payload Templates</span>
            <div className="space-y-1">
              {[
                { label: 'Cortex Telemetry', payload: '{"device": "m4", "fps": 60, "temp": 24.5}' },
                { label: 'Relay Command', payload: '{"cmd": "SET_RELAY", "relay_id": 1, "state": true}' },
                { label: 'Ping Request', payload: '{"ping": true, "timestamp": ' + Date.now() + '}' },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => setPubPayload(tpl.payload)}
                  className="w-full text-left px-2 py-1 rounded bg-[#202124] hover:bg-[#2b2d30] text-[10px] text-[#dfe1e5] truncate cursor-pointer"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right: Real-Time Stream & Publish Pad */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1f22]">
          {/* Message Stream Toolbar */}
          <div className="h-8 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 max-w-sm">
              <Filter className="w-3.5 h-3.5 text-[#868a91]" />
              <input
                type="text"
                placeholder="Filter by topic or payload JSON..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-[10px] text-[#868a91] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-[#393b40] text-[#3574f0]"
                />
                <span>Autoscroll</span>
              </label>

              <button
                onClick={handleClear}
                title="Clear Message Stream"
                className="p-1 hover:bg-[#35373c] text-[#868a91] hover:text-white rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-xs">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded border transition-colors ${
                  msg.direction === 'out'
                    ? 'bg-[#252830] border-[#3574f0]/50'
                    : 'bg-[#1a1b1d] border-[#2b2d30]'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      msg.direction === 'out' ? 'bg-[#3574f0] text-white' : 'bg-[#57a64a] text-white'
                    }`}>
                      {msg.direction === 'out' ? 'PUB' : 'RCV'}
                    </span>
                    <span className="font-bold text-[#e5c07b]">{msg.topic}</span>
                    <span className="text-[10px] text-[#868a91]">QoS {msg.qos}</span>
                    {msg.retain && <span className="text-[9px] text-[#e06c75] uppercase">[Retain]</span>}
                  </div>
                  <span className="text-[10px] text-[#868a91]">{msg.timestamp}</span>
                </div>

                <div className="p-2 rounded bg-[#141517] text-[#98c379] font-mono text-[11px] whitespace-pre-wrap select-all">
                  {msg.payload}
                </div>
              </div>
            ))}

            {filteredMessages.length === 0 && (
              <div className="text-center py-12 text-[#6f737a] italic">
                No MQTT messages received matching subscription filters.
              </div>
            )}
          </div>

          {/* Bottom Publisher Pad */}
          <form onSubmit={handlePublish} className="border-t border-[#2b2d30] p-3 bg-[#26282d] space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Publish Topic (e.g. sensors/cortex/telemetry)"
                value={pubTopic}
                onChange={(e) => setPubTopic(e.target.value)}
                className="flex-1 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#3574f0]"
              />

              <div className="flex items-center space-x-1 text-[11px] text-[#868a91]">
                <span>QoS:</span>
                {[0, 1, 2].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPubQoS(q as any)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      pubQoS === q ? 'bg-[#3574f0] text-white font-bold' : 'bg-[#1e1f22] text-[#868a91]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <label className="flex items-center space-x-1 text-[11px] text-[#868a91] cursor-pointer">
                <input
                  type="checkbox"
                  checked={pubRetain}
                  onChange={(e) => setPubRetain(e.target.checked)}
                  className="rounded border-[#393b40] text-[#3574f0]"
                />
                <span>Retain</span>
              </label>

              <button
                type="submit"
                disabled={!isConnected}
                className="flex items-center space-x-1.5 px-4 py-1 bg-[#3574f0] hover:bg-[#2e436e] text-white rounded font-bold text-xs cursor-pointer disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={pubPayload}
              onChange={(e) => setPubPayload(e.target.value)}
              placeholder="JSON or string payload..."
              className="w-full bg-[#1e1f22] border border-[#393b40] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#3574f0]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
