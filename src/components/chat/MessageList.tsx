import React from 'react';
import { cn } from '../../lib/utils';
import { Bot, User } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mcpLogs?: any[]; // if we want to show logs
}

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading?: boolean }) {
  return (
    <div className="flex flex-col gap-8 p-0 md:p-2 max-w-4xl mx-auto">
      {messages.length === 0 && (
        <div className="hidden">
          {/* placeholder handled in parent now */}
        </div>
      )}
      
      {messages.map(msg => (
        <div key={msg.id} className={cn("flex flex-col gap-2 max-w-[95%] md:max-w-[85%] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>
          
          <div className={cn("px-5 py-3 rounded-3xl whitespace-pre-wrap text-[15px] leading-relaxed transition-all", 
            msg.role === 'user' 
              ? "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tr-sm shadow-sm" 
              : "bg-transparent text-[var(--text-primary)]"
          )}>
            {msg.content}
            
            {msg.mcpLogs && msg.mcpLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 text-xs opacity-90 w-full max-w-full">
                <div className="font-medium mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                  Ferramentas MCP Analisadas
                </div>
                <div className="flex flex-col gap-2">
                  {msg.mcpLogs.map((log, idx) => (
                    <div key={idx} className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] font-mono text-[11px] overflow-hidden shadow-sm">
                      <div className="text-blue-500 font-semibold mb-1">{log.action}</div>
                      <pre className="overflow-x-auto text-[var(--text-tertiary)] max-h-32 custom-scrollbar">{JSON.stringify(log.params, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="self-start flex gap-3 max-w-[85%] animate-in fade-in duration-300">
           <div className="px-5 py-4 rounded-3xl bg-transparent text-[var(--text-secondary)] flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"></span>
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-100"></span>
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-200"></span>
           </div>
        </div>
      )}
    </div>
  );
}
