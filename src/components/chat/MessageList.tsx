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
    <div className="flex flex-col gap-6 p-2 md:p-4">
      {messages.length === 0 && (
        <div className="hidden">
          {/* placeholder handled in parent now */}
        </div>
      )}
      
      {messages.map(msg => (
        <div key={msg.id} className={cn("flex gap-3 max-w-[90%] md:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "self-end flex-row-reverse" : "self-start")}>
          <div className="flex-shrink-0 mt-1">
            {msg.role === 'user' ? (
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-[var(--color-primary)]/20">
                <User size={16} />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--bg-surface-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full flex items-center justify-center text-[var(--color-accent-teal)] shadow-sm">
                <Bot size={16} />
              </div>
            )}
          </div>
          <div className={cn("px-5 py-3.5 rounded-2xl whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm", msg.role === 'user' ? "bg-gradient-to-br from-[var(--color-primary)] to-blue-600 text-white rounded-tr-sm shadow-[var(--color-primary)]/10" : "bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm")}>
            {msg.content}
            {msg.mcpLogs && msg.mcpLogs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-xs opacity-90">
                <div className="font-medium mb-2 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-teal)] animate-pulse shadow-[0_0_8px_var(--color-accent-teal)]"></span>
                  Ferramentas MCP Utilizadas:
                </div>
                {msg.mcpLogs.map((log, idx) => (
                  <div key={idx} className="bg-black/20 dark:bg-white/5 p-3 rounded-lg mt-1 font-mono text-[11px] border border-white/5">
                    <span className="text-[var(--color-accent-teal)] font-semibold">{log.action}</span>
                    <pre className="mt-2 overflow-x-auto text-[var(--text-tertiary)]">{JSON.stringify(log.params, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="self-start flex gap-3 max-w-[85%] animate-in fade-in duration-300">
           <div className="flex-shrink-0 mt-1 w-8 h-8 bg-gradient-to-br from-[var(--bg-surface-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full flex items-center justify-center text-[var(--color-accent-teal)] shadow-sm">
              <Bot size={16} />
           </div>
           <div className="px-5 py-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md border border-[var(--border-subtle)] rounded-tl-sm text-[var(--text-secondary)] flex items-center gap-1.5 shadow-sm">
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"></span>
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-100"></span>
             <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce delay-200"></span>
           </div>
        </div>
      )}
    </div>
  );
}
