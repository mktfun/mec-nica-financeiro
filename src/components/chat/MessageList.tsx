import React from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Wrench as ToolIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data' | string;
  content: string;
  mcpLogs?: any[];
  toolInvocations?: any[];
};

const getMessageContent = (msg: any) => {
  if (typeof msg.content === 'string' && msg.content.trim()) return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  }
  return msg.content || '';
};

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading?: boolean }) {
  return (
    <div className="flex flex-col gap-6 py-6 max-w-4xl mx-auto px-4 md:px-0">
      {messages.length > 0 && (
        <div className="text-center text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-medium opacity-50 my-2">
          Hoje
        </div>
      )}
      
      <AnimatePresence initial={false}>
        {messages.map(msg => {
          const textContent = getMessageContent(msg);
          return (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
              className={cn("flex w-full gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 mt-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
                    <Bot size={16} strokeWidth={2} />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "flex flex-col gap-1.5 min-w-0 max-w-[85%] md:max-w-[75%]", 
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <span className="text-[11px] font-medium text-zinc-500 px-1">
                  {msg.role === 'user' ? 'Você' : 'Oficina GPT'}
                </span>
                
                <div className={cn(
                  "px-5 py-3.5 whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm break-words transition-all", 
                  msg.role === 'user' 
                    ? "bg-zinc-800 text-zinc-100 rounded-[22px] rounded-tr-[4px]" 
                    : "bg-transparent border border-zinc-800/80 text-zinc-200 rounded-[22px] rounded-tl-[4px] backdrop-blur-sm shadow-none"
                )}>
                  {msg.role === 'user' ? (
                    textContent
                  ) : (
                    <div className="prose prose-invert prose-zinc max-w-none text-zinc-300">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-4 rounded-xl border border-zinc-800/60 bg-black/20">
                              <table className="w-full text-sm border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => <thead className="bg-zinc-900/80 border-b border-zinc-800" {...props} />,
                          th: ({node, ...props}) => <th className="p-3 text-left font-semibold text-zinc-200 border-r border-zinc-800/30 last:border-0 uppercase tracking-wider text-[11px]" {...props} />,
                          td: ({node, ...props}) => <td className="p-3 border-b border-zinc-800/40 border-r border-zinc-800/30 last:border-r-0 text-zinc-400 font-mono text-[13px]" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-zinc-800/30 transition-colors" {...props} />,
                          p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed text-[15px]" {...props} />,
                          a: ({node, ...props}) => <a className="text-[#a5b4fc] hover:text-[#818cf8] underline decoration-1 underline-offset-2" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[13px]" {...props} />
                            ) : (
                              <div className="my-4 rounded-xl border border-zinc-800/60 bg-zinc-950 overflow-hidden">
                                <pre className="p-4 overflow-x-auto custom-scrollbar">
                                  <code className="font-mono text-[13px] text-zinc-300" {...props} />
                                </pre>
                              </div>
                            )
                        }}
                      >
                        {textContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

              {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                <div className="flex flex-col gap-1 w-full mt-1.5 mb-2">
                  {msg.toolInvocations.map((tool: any, i: number) => (
                    <details key={i} open={tool.state !== 'result'} className="group overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800/60 transition-colors hover:border-zinc-700/60">
                      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors list-none select-none">
                        {tool.state === 'call' ? (
                           <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                             <ToolIcon className="w-3.5 h-3.5" />
                             <span className="flex-1 capitalize tracking-wide">Acessando Oficina Inteligente ({tool.toolName})...</span>
                           </div>
                        ) : (
                           <div className="flex items-center gap-2">
                             <ToolIcon className="w-3.5 h-3.5 text-zinc-500" />
                             <span className="flex-1 capitalize tracking-wide">{tool.toolName.replace(/_/g, ' ')}</span>
                           </div>
                        )}
                        <span className="opacity-50 text-[10px] transition-transform duration-200 group-open:rotate-180 ml-auto">▼</span>
                      </summary>
                      {tool.state === 'result' && (
                        <div className="px-3 pb-3 pt-1.5 text-[11px] font-mono text-zinc-500 bg-black/20 overflow-x-auto max-h-[250px] custom-scrollbar border-t border-zinc-800/60">
                          <div className="mb-2 text-zinc-300"><span className="text-zinc-600 select-none">Input: </span>{JSON.stringify(tool.args)}</div>
                          <div className="text-zinc-400"><span className="text-zinc-600 select-none">Output: </span>{JSON.stringify(tool.result)}</div>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              )}
              {/* Legacy MCP Logs */}
              {msg.mcpLogs && msg.mcpLogs.length > 0 && (
                <div className="flex flex-col gap-1 w-full mt-1.5 mb-2">
                  {msg.mcpLogs.map((log, i) => (
                    <details key={i} className="group overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800/60 transition-colors hover:border-zinc-700/60">
                      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors list-none select-none">
                        <ToolIcon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="flex-1 capitalize tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                        <span className="opacity-50 text-[10px] transition-transform duration-200 group-open:rotate-180 ml-auto">▼</span>
                      </summary>
                      <div className="px-3 pb-3 pt-1.5 text-[11px] font-mono text-zinc-500 bg-black/20 overflow-x-auto max-h-[250px] custom-scrollbar border-t border-zinc-800/60">
                        <div className="mb-2 text-zinc-300"><span className="text-zinc-600 select-none">Input: </span>{JSON.stringify(log.params)}</div>
                        <div className="text-zinc-400"><span className="text-zinc-600 select-none">Output: </span>{JSON.stringify(log.result)}</div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
      
      {/* NOVO LOADING STATE: HIGH-END & FLUID */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="flex w-full gap-4 justify-start"
          >
            <div className="shrink-0 mt-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-zinc-800/50"
                  animate={{ opacity: [0.1, 0.5, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <Bot size={16} strokeWidth={2} className="relative z-10" />
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 items-start">
              <span className="text-[11px] font-medium text-zinc-500 px-1">Oficina GPT</span>
              <div className="px-5 py-4 bg-transparent border border-zinc-800/80 rounded-[22px] rounded-tl-[4px] shadow-sm flex items-center justify-center gap-1.5 h-[52px]">
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500" 
                  animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0 }} 
                />
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500" 
                  animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.15 }} 
                />
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500" 
                  animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.3 }} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
