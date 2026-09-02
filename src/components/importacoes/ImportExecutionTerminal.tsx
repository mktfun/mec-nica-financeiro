import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Filter, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface ImportLogErrorDetails {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  stack?: string;
  payload?: any;
}

export interface ImportLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  source?: 'ofx' | 'rede' | 'patio' | 'contas' | 'database' | 'ai' | 'system' | 'rpc';
  error?: ImportLogErrorDetails;
  details?: any;
}

export interface ImportExecutionTerminalProps {
  logs: ImportLogEntry[];
  isRunning?: boolean;
  isFinished?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  title?: string;
  targetDate?: string;
}

export const ImportExecutionTerminal: React.FC<ImportExecutionTerminalProps> = ({
  logs,
  isRunning = false,
  isFinished = false,
  hasError = false,
  onRetry,
  title = 'Console de Execução & Conciliação',
  targetDate,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  const errorCount = logs.filter(l => l.type === 'error').length;
  const warningCount = logs.filter(l => l.type === 'warning').length;
  const successCount = logs.filter(l => l.type === 'success').length;

  const filteredLogs = logs.filter(log => {
    if (filterType === 'all') return true;
    return log.type === filterType;
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (autoScroll && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, filterType]);

  const handleCopyLogs = () => {
    const textLogs = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(textLogs);
    setCopied(true);
    toast.success('Logs copiados para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogTypeBadge = (type: ImportLogEntry['type']) => {
    switch (type) {
      case 'error':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">ERRO</span>;
      case 'warning':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">AVISO</span>;
      case 'success':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">OK</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">INFO</span>;
    }
  };

  return (
    <div className="w-full bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
      {/* Header com estilo macOS / Terminal Linux */}
      <div className="bg-zinc-900/90 px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Terminal size={14} className="text-emerald-400" />
            <span className="font-semibold text-zinc-200 text-xs tracking-wide">{title}</span>
            {targetDate && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {targetDate}
              </span>
            )}
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({logs.length})
            </button>
            {errorCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('error')}
                className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                  filterType === 'error' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-rose-400/80 hover:text-rose-300'
                }`}
              >
                <XCircle size={11} /> {errorCount}
              </button>
            )}
            {warningCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('warning')}
                className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                  filterType === 'warning' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                <AlertTriangle size={11} /> {warningCount}
              </button>
            )}
            {successCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('success')}
                className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                  filterType === 'success' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-emerald-400/80 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 size={11} /> {successCount}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copiar todos os logs"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Corpo do Terminal com Scroll Independente */}
      <div
        ref={terminalScrollRef}
        onScroll={handleScroll}
        className="p-4 bg-zinc-950/95 overflow-y-auto max-h-[380px] min-h-[160px] space-y-2 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Nenhum evento registrado no console ainda.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-2 rounded-lg border transition-colors break-words ${
                log.type === 'error'
                  ? 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                  : log.type === 'warning'
                  ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                  : log.type === 'success'
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                  : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] text-zinc-500 tabular-nums shrink-0 pt-0.5">{log.timestamp}</span>
                <span className="shrink-0">{getLogTypeBadge(log.type)}</span>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <p className="whitespace-pre-wrap leading-relaxed">{log.message}</p>

                  {/* Detalhes de Erro Estruturados */}
                  {log.error && (
                    <div className="mt-1.5 p-2 bg-black/50 rounded border border-rose-500/20 text-[11px] space-y-1 font-mono text-rose-200">
                      {log.error.code && <div><strong className="text-rose-400">Código:</strong> {log.error.code}</div>}
                      {log.error.details && <div><strong className="text-rose-400">Detalhes:</strong> {log.error.details}</div>}
                      {log.error.hint && <div><strong className="text-rose-400">Dica:</strong> {log.error.hint}</div>}
                      {log.error.stack && (
                        <pre className="text-[10px] text-rose-300/80 overflow-x-auto mt-1 p-1 bg-black/40 rounded">
                          {log.error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com Status da Operação */}
      <div className="bg-zinc-900/60 px-4 py-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : hasError ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
          <span>
            {isRunning ? 'Executando gravação e conciliação...' : hasError ? 'Processo concluído com pendências/erros.' : isFinished ? 'Conciliação e gravação finalizadas com sucesso.' : 'Aguardando ação do operador.'}
          </span>
        </div>

        {hasError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded border border-rose-500/40 transition-all cursor-pointer"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    </div>
  );
};
