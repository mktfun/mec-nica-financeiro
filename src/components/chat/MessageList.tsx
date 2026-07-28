import React from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Wrench as ToolIcon } from 'lucide-react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mcpLogs?: any[];
};

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading?: boolean }) {
  return (
    <div className="flex flex-col gap-6 py-4 max-w-4xl mx-auto">
      {messages.length > 0 && (
        <div className="text-center text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold opacity-70 my-2">
          Hoje
        </div>
      )}
      
      <AnimatePresence initial={false}>
        {messages.map(msg => (
          <motion.div 
            key={msg.id} 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={cn("flex flex-col gap-2 max-w-[95%] md:max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}
          >
            <div className={cn("px-5 py-3 rounded-3xl whitespace-pre-wrap text-[15px] leading-relaxed transition-all", 
              msg.role === 'user' 
                ? "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tr-sm shadow-sm" 
                : "bg-transparent text-[var(--text-primary)]"
            )}>
              {msg.content}
            </div>

            {msg.mcpLogs && msg.mcpLogs.length > 0 && (
              <div className="flex flex-col gap-1 w-full mt-1 mb-2">
                {msg.mcpLogs.map((log, i) => (
                  <details key={i} className="group overflow-hidden rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-colors list-none select-none">
                      <ToolIcon className="w-3.5 h-3.5" />
                      <span className="flex-1 capitalize tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                      <span className="opacity-50 text-[10px] transition-transform duration-200 group-open:rotate-180">▼</span>
                    </summary>
                    <div className="px-3 pb-3 pt-1.5 text-[11px] font-mono text-[var(--text-tertiary)] bg-black/10 overflow-x-auto max-h-[200px] custom-scrollbar border-t border-[var(--border-subtle)]">
                      <div className="mb-1 text-[#4ade80]">Input: {JSON.stringify(log.params)}</div>
                      <div className="text-[var(--text-secondary)]">Output: {JSON.stringify(log.result)}</div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-start flex items-center gap-2 px-5 py-4 bg-transparent"
        >
          <div className="flex gap-1.5">
            <motion.div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0 }} />
            <motion.div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.2 }} />
            <motion.div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.4 }} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
