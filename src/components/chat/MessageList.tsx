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
    <div className="flex flex-col gap-4 p-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center h-40 text-[var(--text-tertiary)]">
          <Bot size={48} className="mb-4 opacity-20" />
          <p>Olá! Sou o seu Agente MCP.</p>
          <p className="text-sm">Como posso ajudar na sua Oficina hoje?</p>
        </div>
      )}
      
      {messages.map(msg => (
        <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "self-end flex-row-reverse" : "self-start")}>
          <div className="flex-shrink-0 mt-1">
            {msg.role === 'user' ? (
              <div className="w-8 h-8 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center text-[var(--color-primary)]">
                <User size={16} />
              </div>
            ) : (
              <div className="w-8 h-8 bg-[var(--color-accent-blue)]/20 rounded-full flex items-center justify-center text-[var(--color-accent-blue)]">
                <Bot size={16} />
              </div>
            )}
          </div>
          <div className={cn("px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm", msg.role === 'user' ? "bg-[var(--color-primary)] text-white rounded-tr-sm" : "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm")}>
            {msg.content}
            {msg.mcpLogs && msg.mcpLogs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-xs opacity-80">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  MCP Actions Executadas:
                </div>
                {msg.mcpLogs.map((log, idx) => (
                  <div key={idx} className="bg-black/5 dark:bg-white/5 p-2 rounded mt-1 font-mono">
                    <span className="text-[var(--color-primary)]">{log.action}</span>
                    <pre className="mt-1 overflow-x-auto">{JSON.stringify(log.params, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="self-start flex gap-3 max-w-[85%]">
           <div className="flex-shrink-0 mt-1 w-8 h-8 bg-[var(--color-accent-blue)]/20 rounded-full flex items-center justify-center text-[var(--color-accent-blue)]">
              <Bot size={16} />
           </div>
           <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-tl-sm text-[var(--text-secondary)] flex items-center gap-1">
             <span className="animate-bounce">.</span>
             <span className="animate-bounce delay-100">.</span>
             <span className="animate-bounce delay-200">.</span>
           </div>
        </div>
      )}
    </div>
  );
}
