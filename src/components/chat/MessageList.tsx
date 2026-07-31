import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Wrench as ToolIcon, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Sparkles,
  Search,
  Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data' | string;
  content: string;
  mcpLogs?: any[];
  toolInvocations?: any[];
  parts?: any[];
  isError?: boolean;
  error?: any;
};

export type StepItem = {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'completed' | 'error';
  args?: any;
  result?: any;
};

// Helper: Extrai mensagem de erro limpa sem HTML/verbosidade
export const sanitizeErrorText = (error: any): string => {
  if (!error) return 'Ocorreu um erro inesperado ao conectar com a IA.';
  let str = typeof error === 'string' ? error : error.message || JSON.stringify(error);
  
  // Remover HTML
  str = str.replace(/<[^>]*>?/gm, '');
  
  // Tentar extrair "error" de JSON
  try {
    const parsed = JSON.parse(str);
    if (parsed.error) str = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
  } catch (_) {}

  // Limitar tamanho
  if (str.length > 200) {
    str = str.substring(0, 200) + '...';
  }
  return str;
};

// Helper: Formata nomes amigáveis para ferramentas MCP/RAG
const getToolLabel = (name: string, args?: any): string => {
  switch (name) {
    case 'consulta_resumo_os':
      return args?.osNumber 
        ? `Verificando Ordem de Serviço #${args.osNumber} no banco local`
        : 'Verificando banco de dados local para Ordens de Serviço';
    case 'consulta_os_detalhe_completo':
      return args?.os_number || args?.osNumber
        ? `Recuperando detalhes completos da OS #${args.os_number || args.osNumber} na Oficina Inteligente`
        : 'Consultando API externa da Oficina Inteligente';
    case 'consulta_saldo_contas':
      return 'Consultando fluxo de caixa e saldos financeiros';
    case 'consulta_contas_pagar_oficina':
      return 'Buscando contas a pagar na API da oficina';
    case 'consulta_conciliacao_periodo':
      return 'Analisando resumos de conciliação por período';
    default:
      return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Helper: Extrai todas as etapas (reasoning + tools) da mensagem
const extractSteps = (msg: any): StepItem[] => {
  const steps: StepItem[] = [];

  // 1. Tool Invocations padrão (SDK v4)
  if (Array.isArray(msg.toolInvocations)) {
    msg.toolInvocations.forEach((tool: any, idx: number) => {
      steps.push({
        id: tool.toolCallId || `tool-${idx}`,
        name: tool.toolName || 'ferramenta',
        label: getToolLabel(tool.toolName || 'ferramenta', tool.args),
        status: tool.state === 'result' ? 'completed' : 'running',
        args: tool.args,
        result: tool.result
      });
    });
  }

  // 2. Parts array (SDK v4/v5)
  if (Array.isArray(msg.parts)) {
    msg.parts.forEach((part: any, idx: number) => {
      if (part.type === 'tool-invocation' && part.toolInvocation) {
        const t = part.toolInvocation;
        if (!steps.some(s => s.id === (t.toolCallId || `part-tool-${idx}`))) {
          steps.push({
            id: t.toolCallId || `part-tool-${idx}`,
            name: t.toolName || 'ferramenta',
            label: getToolLabel(t.toolName || 'ferramenta', t.args),
            status: t.state === 'result' ? 'completed' : 'running',
            args: t.args,
            result: t.result
          });
        }
      } else if (part.type === 'reasoning' && part.reasoning) {
        steps.push({
          id: `reasoning-${idx}`,
          name: 'raciocinio',
          label: 'Analisando lógica de resposta',
          status: 'completed',
          result: part.reasoning
        });
      }
    });
  }

  // 3. Legacy MCP Logs
  if (Array.isArray(msg.mcpLogs)) {
    msg.mcpLogs.forEach((log: any, idx: number) => {
      if (!steps.some(s => s.name === log.action)) {
        steps.push({
          id: `mcp-${idx}`,
          name: log.action || 'mcp_log',
          label: getToolLabel(log.action || 'mcp_log', log.params),
          status: 'completed',
          args: log.params,
          result: log.result
        });
      }
    });
  }

  return steps;
};

// Helper: Extrai texto simples das mensagens
const getMessageContent = (msg: any): string => {
  if (typeof msg.content === 'string' && msg.content.trim()) return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  }
  return msg.content || '';
};

// Componente Acordeão Expansível de Passo a Passo (Reasoning & Tool Steps)
function StepAccordion({ steps }: { steps: StepItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  const hasRunning = steps.some(s => s.status === 'running');
  const runningCount = steps.filter(s => s.status === 'running').length;
  const completedCount = steps.filter(s => s.status === 'completed').length;

  return (
    <div className="w-full my-2 font-sans">
      {/* Botão de Toggle do Acordeão */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all select-none group cursor-pointer"
      >
        {hasRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        )}

        <span>
          {hasRunning
            ? `Executando etapa (${completedCount + 1}/${steps.length})...`
            : `${steps.length} ${steps.length === 1 ? 'etapa concluída' : 'etapas concluídas'}`}
        </span>

        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 ml-1 text-zinc-500 group-hover:text-zinc-300 transition-transform" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1 text-zinc-500 group-hover:text-zinc-300 transition-transform" />
        )}
      </button>

      {/* Lista Expansível de Passos */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden mt-2 flex flex-col gap-1.5 pl-1 border-l-2 border-zinc-800/80 ml-3"
          >
            {steps.map((step) => (
              <details
                key={step.id}
                className="group/step overflow-hidden rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/60 transition-colors"
              >
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors list-none select-none">
                  {step.status === 'running' && (
                    <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  )}

                  <span className="flex-1 truncate tracking-wide">{step.label}</span>
                  
                  {(step.args || step.result) && (
                    <span className="opacity-40 text-[9px] group-open/step:rotate-180 transition-transform ml-auto">▼</span>
                  )}
                </summary>

                {(step.args || step.result) && (
                  <div className="px-3 pb-2.5 pt-1 text-[10px] font-mono text-zinc-400 bg-black/30 overflow-x-auto max-h-[200px] custom-scrollbar border-t border-zinc-800/40">
                    {step.args && (
                      <div className="mb-1 text-zinc-300">
                        <span className="text-zinc-500 select-none">Parâmetros: </span>
                        {JSON.stringify(step.args)}
                      </div>
                    )}
                    {step.result && (
                      <div className="text-zinc-400">
                        <span className="text-zinc-500 select-none">Resultado: </span>
                        {typeof step.result === 'string' ? step.result : JSON.stringify(step.result)}
                      </div>
                    )}
                  </div>
                )}
              </details>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type AggregatedTurn = {
  id: string;
  role: 'user' | 'assistant';
  textContent: string;
  steps: StepItem[];
  isError?: boolean;
  error?: any;
};

export const aggregateAssistantTurns = (messages: Message[]): AggregatedTurn[] => {
  const turns: AggregatedTurn[] = [];

  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const text = getMessageContent(msg);
    const steps = extractSteps(msg);
    const isError = msg.isError || (msg as any).status === 'error';

    if (isUser) {
      turns.push({
        id: msg.id || `user-${turns.length}`,
        role: 'user',
        textContent: text,
        steps: []
      });
    } else {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && lastTurn.role === 'assistant') {
        if (text.trim() && !lastTurn.textContent.includes(text.trim())) {
          lastTurn.textContent = lastTurn.textContent 
            ? `${lastTurn.textContent}\n\n${text.trim()}` 
            : text.trim();
        }
        steps.forEach((s) => {
          if (!lastTurn.steps.some((existing) => existing.id === s.id)) {
            lastTurn.steps.push(s);
          }
        });
        if (isError) {
          lastTurn.isError = true;
          lastTurn.error = msg.error || (msg as any).error;
        }
      } else {
        turns.push({
          id: msg.id || `assistant-${turns.length}`,
          role: 'assistant',
          textContent: text,
          steps: [...steps],
          isError,
          error: msg.error || (msg as any).error
        });
      }
    }
  });

  return turns;
};

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading?: boolean }) {
  const turns = aggregateAssistantTurns(messages);
  const lastTurn = turns[turns.length - 1];
  const isStreamingAssistant = isLoading && (!lastTurn || lastTurn.role === 'user' || (lastTurn.role === 'assistant' && !lastTurn.textContent.trim()));

  return (
    <div className="flex flex-col gap-6 py-6 max-w-4xl mx-auto px-4 md:px-0">
      {turns.length > 0 && (
        <div className="text-center text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-medium opacity-50 my-2">
          Hoje
        </div>
      )}
      
      <AnimatePresence initial={false}>
        {turns.map((turn, index) => {
          const textContent = turn.textContent;
          const steps = turn.steps;
          const hasText = textContent.trim().length > 0;
          const isUser = turn.role === 'user';
          const isError = turn.isError;

          // Se o assistente não tem texto nem passos nem erro, não renderizar balão em branco
          if (!isUser && !hasText && steps.length === 0 && !isError) {
            return null;
          }

          return (
            <motion.div 
              key={turn.id || `turn-${index}`} 
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
              className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}
            >
              {!isUser && (
                <div className="shrink-0 mt-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
                    <Bot size={16} strokeWidth={2} />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "flex flex-col gap-1.5 min-w-0 max-w-[85%] md:max-w-[75%]", 
                isUser ? "items-end" : "items-start"
              )}>
                <span className="text-[11px] font-medium text-zinc-500 px-1">
                  {isUser ? 'Você' : 'Oficina GPT'}
                </span>

                {/* PASSO A PASSO EXPANSÍVEL (REASONING & TOOLS) */}
                {!isUser && steps.length > 0 && (
                  <StepAccordion steps={steps} />
                )}
                
                {/* CARD DE ERRO FORMATADO E LIMPO */}
                {isError ? (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300 text-xs font-mono max-w-full">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-semibold text-red-200">Falha ao processar requisição</span>
                      <span className="text-[11px] text-red-400/90 leading-relaxed break-words">
                        {sanitizeErrorText(turn.error || textContent)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* BALÃO DE TEXTO (Apenas se houver texto real) */
                  hasText && (
                    <div className={cn(
                      "px-5 py-3.5 whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm break-words transition-all", 
                      isUser 
                        ? "bg-zinc-800 text-zinc-100 rounded-[22px] rounded-tr-[4px]" 
                        : "bg-transparent border border-zinc-800/80 text-zinc-200 rounded-[22px] rounded-tl-[4px] backdrop-blur-sm shadow-none"
                    )}>
                      {isUser ? (
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
                  )
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* NOVO LOADING STATE FLUIDO (Exibido apenas quando aguardando nova resposta) */}
      <AnimatePresence>
        {isStreamingAssistant && (
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
