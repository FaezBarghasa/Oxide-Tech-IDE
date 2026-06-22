import React, { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import { useChatStore } from '../../state/chatStore';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const messages = useChatStore(state => state.messages);
  const addMessage = useChatStore(state => state.addMessage);

  const sendMessage = () => {
    if (!input.trim()) return;
    addMessage({ id: Date.now().toString(), role: 'user', content: input });
    // TODO: Send to backend AI
    setInput('');
  };

  return (
    <div className="fixed top-20 right-4 w-96 h-[60vh] bg-darcula-toolwindow border border-darcula-border rounded-lg shadow-2xl flex flex-col text-darcula-text z-50">
      <div className="p-2 border-b border-darcula-border flex items-center justify-between font-bold text-xs uppercase tracking-widest text-darcula-text/70">
        <div className="flex items-center">
            <Bot className="w-4 h-4 mr-2 text-darcula-accent" /> AI Chat
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`p-2 rounded text-xs ${msg.role === 'user' ? 'bg-darcula-selection text-white' : 'bg-darcula-bg'}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-darcula-border flex">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-darcula-bg text-xs p-2 rounded focus:outline-none"
          placeholder="Ask AI..."
        />
        <button onClick={sendMessage} className="ml-2 p-2 bg-darcula-accent text-white rounded">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
