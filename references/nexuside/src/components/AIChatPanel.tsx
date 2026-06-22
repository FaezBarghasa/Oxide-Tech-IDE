import React, { useRef, useEffect } from "react";
import { ChatMessage } from "../types";

interface AIChatPanelProps {
  chatMessages: ChatMessage[];
  userInputChat: string;
  setUserInputChat: (v: string) => void;
  onSendChatMessage: () => void;
  isModelResponding: boolean;
  onClose: () => void;
}

export default function AIChatPanel({
  chatMessages,
  userInputChat,
  setUserInputChat,
  onSendChatMessage,
  isModelResponding,
  onClose,
}: AIChatPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new chat items
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isModelResponding]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendChatMessage();
    }
  };

  return (
    <aside className="w-[380px] bg-surface-container-lowest border-l border-outline-variant flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between font-body-sm text-body-sm text-on-surface border-b border-outline-variant bg-surface font-semibold shrink-0 select-none">
        <div className="flex items-center gap-1">
          <span>Gemini</span>
          <div className="flex gap-2 ml-4 text-[11px] font-medium">
            <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded cursor-pointer border border-primary/20">
              Agent
            </span>
            <span 
              onClick={() => alert("Ask mode selected.")}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer py-0.5"
            >
              Ask
            </span>
            <span 
              onClick={() => alert("Code workspace outline generated in model context.")}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer py-0.5"
            >
              Outline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-outline">
          <button 
            onClick={() => alert("New prompt session started.")}
            className="hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-variant/30"
            title="Add File Context"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button 
            onClick={() => alert("Prompt library shortcuts opened.")}
            className="hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
          </button>
          <button 
            onClick={() => alert("View conversational agent history...")}
            className="hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
          </button>
          <button 
            onClick={() => alert("Select expert developers model parameters.")}
            className="hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">more_horiz</span>
          </button>
          <button 
            onClick={onClose} 
            className="hover:text-on-surface transition-colors ml-1 p-1 rounded hover:bg-surface-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-[12px] leading-relaxed selection:bg-primary/25"
      >
        {chatMessages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id} className="flex gap-2.5 animate-fade-in">
              {/* Profile Avatar */}
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isUser 
                    ? "bg-primary/30 text-primary font-bold border border-primary/20" 
                    : "bg-surface-variant text-secondary border border-outline-variant/30"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isUser ? "person" : "smart_toy"}
                </span>
              </div>

              {/* Message bubble */}
              <div className="flex-1 text-on-surface-variant pt-0.5">
                {isUser ? (
                  <p className="text-on-surface text-[12.5px] font-medium whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] text-on-surface-variant whitespace-pre-wrap leading-[18px]">
                      {message.text}
                    </p>

                    {/* Tool executions (mock or actual) in the screenshot */}
                    {message.toolLogs && message.toolLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-1 text-[11px] bg-surface-variant/20 p-2 rounded border border-outline-variant/25"
                      >
                        <span className={`material-symbols-outlined text-[14px] mt-0.5 ${
                          log.status === "error" ? "text-error" : "text-outline"
                        }`}>
                          {log.status === "error" ? "error" : "description"}
                        </span>
                        <div className="flex-1 truncate">
                          <span className="text-outline">{log.action}</span>
                          {log.detail && (
                            <span className="block text-[10px] text-outline-variant mt-0.5 italic">
                              {log.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isModelResponding && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-surface-variant flex items-center justify-center shrink-0 text-secondary border border-outline-variant/30 animate-pulse">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            </div>
            <div className="flex-1 text-outline pt-1 text-[11px] italic">
              Gemini is streaming response...
            </div>
          </div>
        )}

        {/* Antigravity CLI Alert Box mimicking screenshot */}
        <div className="mt-2 bg-[#1e2a4f]/70 rounded-lg p-3 border border-primary/30 relative">
          <span 
            onClick={() => alert("Banner dismissed")}
            className="material-symbols-outlined absolute right-2 top-2 text-[13px] text-outline cursor-pointer hover:text-on-surface"
          >
            close
          </span>
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 font-bold">
              lightbulb
            </span>
            <div className="text-[11.5px] text-on-surface leading-[17px]">
              We are unifying our tools into a single, multi-agent platform called{" "}
              <b className="text-primary font-bold">Antigravity</b>, with Antigravity CLI now
              available. Gemini CLI and Gemini Code Assist IDE Extensions will stop serving requests
              for Google One and unpaid tiers starting June 18th. Please migrate to{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Antigravity
              </a>{" "}
              and Antigravity CLI before this date to avoid disruption to your workflows.
              <div className="mt-2 text-primary font-semibold hover:underline cursor-pointer">
                Dismiss
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area input box */}
      <div className="p-3 border-t border-outline-variant bg-surface-container-lowest shrink-0 select-none">
        <div className="text-outline bg-gradient-to-r from-outline-variant/10 to-transparent p-1 text-[10px] mb-1.5 rounded truncate select-none">
          Ask Gemini, use @name to attach files, use @prompt to recall prompts
        </div>
        
        <div className="relative rounded-lg border border-outline-variant bg-surface overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all p-2 flex flex-col h-[100px]">
          <textarea
            value={userInputChat}
            onChange={(e) => setUserInputChat(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none resize-none font-body-sm text-body-sm flex-1 focus:ring-0 text-on-surface placeholder-outline-variant text-[12px] p-0.5 outline-none"
            placeholder="Ask Gemini to write Rust unit-tests, explain structs..."
          />
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-outline-variant/10">
            <div className="flex items-center gap-1 text-outline-variant text-[10px] cursor-pointer hover:text-on-surface transition-colors">
              <span>Context (Workspace)</span>
              <span className="material-symbols-outlined text-[12px]">expand_more</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-outline-variant text-[10px] cursor-pointer hover:text-on-surface transition-colors">
                <span>3.5 Flash</span>
                <span className="material-symbols-outlined text-[12px]">expand_more</span>
              </div>
              <button 
                onClick={() => alert("Model options adjusted")}
                className="text-outline hover:text-on-surface p-0.5 rounded"
              >
                <span className="material-symbols-outlined text-[15px]">settings</span>
              </button>
              <button
                onClick={onSendChatMessage}
                disabled={!userInputChat.trim() || isModelResponding}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  userInputChat.trim() && !isModelResponding
                    ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer"
                    : "bg-surface-variant text-outline cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info tag */}
        <div className="flex items-center justify-between mt-2.5 text-[9.5px] select-none text-outline-variant">
          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
            Gemini Code Assist
          </span>
          <span>
            Gemini can make mistakes, so{" "}
            <a href="#" className="text-primary hover:underline font-semibold">
              use with caution
            </a>
            .
          </span>
        </div>
      </div>
    </aside>
  );
}
