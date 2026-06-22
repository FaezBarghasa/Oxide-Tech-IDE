import { useState } from 'react';
import { Send, Bot, User, CheckSquare, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TaskBoardItem {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'done';
}

export function AIChatPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'tasks'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Oxide Tech IDE Local Agent. I can assist with code design, recursive refactoring, code reviews, and automatic script executions. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // AI parsed tasks board
  const [tasks, setTasks] = useState<TaskBoardItem[]>([
    { id: '1', title: 'Implement Slint UI layout preview', status: 'todo' },
    { id: '2', title: 'Add MQTT5 protocol listener', status: 'todo' },
    { id: '3', title: 'Setup Monaco Editor custom syntax highlighting', status: 'done' },
    { id: '4', title: 'Connect terminal console to backend process runner', status: 'done' }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setIsGenerating(true);

    const userMessageObj: Message = {
      role: 'user',
      content: userMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessageObj]);

    // Simulating Local Model inference
    setTimeout(() => {
      let responseContent = '';
      if (userMsg.toLowerCase().includes('review') || userMsg.toLowerCase().includes('pr')) {
        responseContent = `### Pull Request / Code Review Suggestion\n\n- **Optimizations**: Consolidate Tauri commands into a single handlers file if tree operations grow too large.\n- **Performance**: Switch standard \`Command\` execution to async streams in \`file_ops.rs\`.\n- **Lints**: Ensure \`#[serde(rename = "...")]\` is explicitly added for Javascript compatibility.`;
      } else {
        responseContent = `I have received your prompt: "${userMsg}". Spawning local model planner...\n\nI recommend creating a custom automation script via the **Skills Orchestrator** to perform this task automatically. Let me know if I should decompose this into task board items for you.`;
        
        // Decompose the command into the task board as a demonstration of "agentic coding"
        setTasks(prev => [
          ...prev,
          { id: String(Date.now()), title: `Local Task: ${userMsg.slice(0, 30)}...`, status: 'todo' }
        ]);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsGenerating(false);
    }, 1200);
  };

  const handleReviewCode = () => {
    setPrompt("Please perform a code review on the active file.");
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text select-none">
      <div className="p-3 border-b border-ide-border shrink-0 bg-ide-panel/30 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Bot className="w-4.5 h-4.5 text-ide-keyword animate-pulse" />
          <span className="text-xs font-bold text-white">Local Agentic Copilot</span>
        </div>
        <div className="flex space-x-1 bg-ide-bg border border-ide-border rounded p-0.5">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={cn(
              "px-2 py-0.5 text-[9px] uppercase font-bold rounded tracking-wider cursor-pointer transition-colors",
              activeSubTab === 'chat' ? "bg-ide-selection text-white" : "hover:text-white"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={cn(
              "px-2 py-0.5 text-[9px] uppercase font-bold rounded tracking-wider cursor-pointer transition-colors",
              activeSubTab === 'tasks' ? "bg-ide-selection text-white" : "hover:text-white"
            )}
          >
            Task Board
          </button>
        </div>
      </div>

      {activeSubTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex space-x-2.5 max-w-[85%] text-xs p-2.5 rounded-lg border",
                  msg.role === 'user'
                    ? "ml-auto bg-ide-panel/50 border-ide-border/60 text-white"
                    : "bg-ide-panel/20 border-ide-border/30 text-ide-text"
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-ide-keyword" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-ide-function" />
                  )}
                </div>
                <div className="flex-1 flex flex-col space-y-1">
                  <span className="text-[10px] text-white/40">{msg.role === 'user' ? 'You' : 'Agent'} • {msg.timestamp}</span>
                  <div className="whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-xs">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex space-x-2.5 text-xs p-2.5 bg-ide-panel/10 border border-ide-border/20 rounded-lg max-w-[80%]">
                <Bot className="w-3.5 h-3.5 text-ide-function animate-spin" />
                <span className="text-ide-text/50">Local model thinking...</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-ide-border shrink-0 flex flex-col space-y-2">
            <div className="flex space-x-1.5">
              <button
                onClick={handleReviewCode}
                className="bg-ide-panel hover:bg-ide-hover border border-ide-border text-ide-text text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-ide-keyword" />
                <span>Trigger Code Review</span>
              </button>
            </div>
            <form onSubmit={handleSend} className="flex space-x-1.5">
              <input
                type="text"
                placeholder="Ask local model or request planning task..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                className="flex-1 bg-ide-panel border border-ide-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-ide-activeTab placeholder-ide-text/30"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="bg-ide-selection hover:bg-ide-activeTab text-white p-2 rounded cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-ide-border pb-1.5">
            <span className="text-[10px] uppercase font-bold text-white/50">Agent parsed plans</span>
            <button
              onClick={() => {
                setTasks([
                  { id: '1', title: 'Implement Slint UI layout preview', status: 'todo' },
                  { id: '2', title: 'Add MQTT5 protocol listener', status: 'todo' },
                  { id: '3', title: 'Setup Monaco Editor custom syntax highlighting', status: 'done' },
                  { id: '4', title: 'Connect terminal console to backend process runner', status: 'done' }
                ]);
              }}
              className="text-ide-text hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <span className="text-[9px] uppercase font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">To Do</span>
              <div className="flex flex-col space-y-1.5 mt-2">
                {tasks.filter(t => t.status === 'todo').map(t => (
                  <div key={t.id} className="bg-ide-panel border border-ide-border p-2 rounded text-xs text-white flex justify-between items-center">
                    <span className="truncate max-w-[200px]">{t.title}</span>
                    <button
                      onClick={() => setTasks(prev => prev.map(item => item.id === t.id ? { ...item, status: 'progress' } : item))}
                      className="text-[9px] bg-ide-border hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-ide-keyword bg-ide-keyword/10 px-1.5 py-0.5 rounded">In Progress</span>
              <div className="flex flex-col space-y-1.5 mt-2">
                {tasks.filter(t => t.status === 'progress').map(t => (
                  <div key={t.id} className="bg-ide-panel border border-ide-border p-2 rounded text-xs text-white flex justify-between items-center">
                    <span className="truncate max-w-[200px]">{t.title}</span>
                    <button
                      onClick={() => setTasks(prev => prev.map(item => item.id === t.id ? { ...item, status: 'done' } : item))}
                      className="text-[9px] bg-ide-selection hover:bg-ide-activeTab px-1.5 py-0.5 rounded cursor-pointer text-white"
                    >
                      Complete
                    </button>
                  </div>
                ))}
                {tasks.filter(t => t.status === 'progress').length === 0 && (
                  <div className="text-[10px] text-ide-text/30 italic py-2">No active tasks in progress.</div>
                )}
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Completed</span>
              <div className="flex flex-col space-y-1.5 mt-2">
                {tasks.filter(t => t.status === 'done').map(t => (
                  <div key={t.id} className="bg-ide-panel/50 border border-ide-border/50 p-2 rounded text-xs text-ide-text/60 flex items-center justify-between">
                    <span className="line-through truncate max-w-[220px]">{t.title}</span>
                    <CheckSquare className="w-3.5 h-3.5 text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
