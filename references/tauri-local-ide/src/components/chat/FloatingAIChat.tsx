import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Send, Bot, Loader2, Workflow, Diff } from 'lucide-react';
import { useChatStore } from '../../state/chatStore';
import { cn } from '../../utils/theme';

export function FloatingAIChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { messages, addMessage, isPlanning, setPlanning } = useChatStore();

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    addMessage({ id: Date.now().toString(), role: 'user', content: input, type: 'chat' });
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, isPlanning }),
      });
      const data = await response.json();
      addMessage({ id: Date.now().toString(), role: 'assistant', content: data.response, type: data.type || 'chat' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 z-[100]" />
        <Dialog.Content className="fixed top-20 right-4 w-96 h-[60vh] bg-darcula-toolwindow border border-darcula-border rounded-lg shadow-2xl flex flex-col z-[101] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <Dialog.Title className="p-3 border-b border-darcula-border flex items-center justify-between font-bold text-xs uppercase tracking-widest text-darcula-text">
            <span className="flex items-center"><Bot className="w-4 h-4 mr-2 text-darcula-accent" /> AI Chat ({isPlanning ? 'Planning' : 'Chat'})</span>
            <button onClick={() => setPlanning(!isPlanning)} className={cn("p-1 rounded", isPlanning ? "bg-darcula-accent" : "hover:bg-darcula-bg")}>
              <Workflow className="w-3 h-3" />
            </button>
          </Dialog.Title>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn("p-2 rounded text-xs", msg.role === 'user' ? "bg-darcula-selection text-white self-end" : "bg-darcula-bg text-darcula-text")}>
                {msg.type === 'diff' && <Diff className="w-3 h-3 inline mr-1" />}
                {msg.content}
              </div>
            ))}
            {loading && <div className="text-darcula-text/50 text-xs animate-pulse">Thinking...</div>}
          </div>
          
          <div className="p-3 border-t border-darcula-border flex">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-darcula-bg text-xs p-2 rounded focus:outline-none"
              placeholder={isPlanning ? "Decompose task..." : "Ask AI..."}
            />
            <button onClick={sendMessage} className="ml-2 p-2 bg-darcula-accent text-white rounded">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
