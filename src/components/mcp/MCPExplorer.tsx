import { useState } from 'react';
import { Network, Plus, Play, Info, Cpu } from 'lucide-react';
import { cn } from '../../utils/theme';

interface MCPServer {
  id: string;
  name: string;
  command: string;
  status: 'connected' | 'error' | 'disconnected';
  tools: string[];
}

export function MCPExplorer() {
  const [servers, setServers] = useState<MCPServer[]>([
    {
      id: '1',
      name: 'Filesystem MCP',
      command: 'npx @modelcontextprotocol/server-filesystem /path/to/project',
      status: 'connected',
      tools: ['read_file', 'write_file', 'list_directory', 'grep_search']
    },
    {
      id: '2',
      name: 'PostgreSQL MCP',
      command: 'npx @modelcontextprotocol/server-postgres postgres://localhost:5432/db',
      status: 'disconnected',
      tools: ['query_db', 'describe_tables', 'list_databases']
    }
  ]);

  const [newServerName, setNewServerName] = useState('');
  const [newServerCmd, setNewServerCmd] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const [executingTool, setExecutingTool] = useState('');
  const [toolParams, setToolParams] = useState('');
  const [toolLogs, setToolLogs] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerCmd.trim()) return;

    const server: MCPServer = {
      id: String(Date.now()),
      name: newServerName.trim(),
      command: newServerCmd.trim(),
      status: 'disconnected',
      tools: ['run_custom_action', 'get_metadata']
    };

    setServers(prev => [...prev, server]);
    setNewServerName('');
    setNewServerCmd('');
  };

  const handleConnect = (id: string) => {
    setServers(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: 'connected' };
      }
      return s;
    }));
  };

  const handleSelectServer = (server: MCPServer) => {
    setSelectedServerId(server.id);
    setSelectedTools(server.tools);
  };

  const handleExecuteTool = (tool: string) => {
    setExecutingTool(tool);
    setToolLogs(`[MCP] Executing tool: "${tool}" on server...\n`);
    
    setTimeout(() => {
      setToolLogs(prev => `${prev}\x1b[32m[Output]\x1b[0m\n{\n  "status": "success",\n  "data": {\n    "message": "Tool execution completed simulated successfully.",\n    "params": "${toolParams || 'none'}"\n  }\n}`);
      setExecutingTool('');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30">
        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
          <Network className="w-4 h-4 text-ide-keyword" />
          <span>MCP Client & Explorer</span>
        </span>
        <p className="text-[10px] text-ide-text/60 mt-1">
          Connect local Model Context Protocol servers to provide context and run tools.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Connection form */}
        <form onSubmit={handleAdd} className="bg-ide-panel border border-ide-border/50 rounded p-2.5 flex flex-col space-y-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Connect Local Server</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Server Name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
            />
            <input
              type="text"
              placeholder="npx command..."
              value={newServerCmd}
              onChange={(e) => setNewServerCmd(e.target.value)}
              className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
            />
          </div>
          <button
            type="submit"
            className="bg-ide-selection hover:bg-ide-activeTab text-white text-xs py-1 rounded font-medium flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect MCP</span>
          </button>
        </form>

        {/* Server List */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Connected Servers ({servers.length})</span>
          {servers.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelectServer(s)}
              className={cn(
                "bg-ide-panel border rounded p-2.5 flex flex-col space-y-1.5 cursor-pointer hover:border-ide-activeTab transition-colors",
                selectedServerId === s.id ? "border-ide-activeTab" : "border-ide-border/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-ide-keyword" />
                  <span className="text-xs font-bold text-white">{s.name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                    s.status === 'connected' && "bg-green-500/10 text-green-400",
                    s.status === 'disconnected' && "bg-ide-border text-ide-text/50"
                  )}>
                    {s.status}
                  </span>
                  {s.status === 'disconnected' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(s.id); }}
                      className="text-[9px] bg-ide-selection hover:bg-ide-activeTab px-1.5 py-0.5 rounded cursor-pointer text-white font-medium"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              <code className="text-[10px] font-mono bg-ide-bg/60 p-1 rounded text-ide-function select-all border border-ide-border/20 truncate">
                {s.command}
              </code>
            </div>
          ))}
        </div>

        {/* Tools Viewer */}
        {selectedServerId && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-white/50 block">Available Tools</span>
            <div className="grid grid-cols-2 gap-2">
              {selectedTools.map(t => (
                <div
                  key={t}
                  className="bg-ide-panel border border-ide-border/40 hover:border-ide-border rounded p-2 flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t}</span>
                    <button
                      disabled={executingTool !== ''}
                      onClick={() => handleExecuteTool(t)}
                      className="text-green-400 hover:text-green-300 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {executingTool === t ? (
                        <span className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Params (json format)"
                    value={toolParams}
                    onChange={(e) => setToolParams(e.target.value)}
                    className="bg-ide-bg border border-ide-border/60 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none placeholder-ide-text/20"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Output log */}
        {toolLogs && (
          <div className="flex flex-col space-y-1.5 bg-ide-bg border border-ide-border rounded p-2.5 min-h-[100px]">
            <span className="text-[9px] uppercase font-bold text-white/50 flex items-center space-x-1">
              <Info className="w-3 h-3 text-ide-keyword" />
              <span>Tool Console Log</span>
            </span>
            <pre className="text-[10px] font-mono whitespace-pre-wrap select-all leading-normal text-ide-text flex-1 overflow-auto max-h-[160px]">
              {toolLogs}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
