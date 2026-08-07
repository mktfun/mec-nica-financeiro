import { Card } from '@/components/ui/Card';
import { Terminal, Database, Server, Wrench, Clock } from 'lucide-react';
import { useMcpLogs } from '@/hooks/useMcpLogs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function LogsAgentePanel() {
  const { data: logs = [], isLoading: loadingLogs } = useMcpLogs(50);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Terminal size={20} className="text-indigo-400" />
          </div>
          MCP Tools Logs
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">Monitoramento de execução de ferramentas e consultas (Cache vs Live).</p>
      </div>

      <Card variant="glass" className="p-6">
          {loadingLogs ? (
            <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhum log MCP registrado.</p>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const isCache = log.params?.source === 'cache' || log.params?.source === 'db';
                const isBot = log.params?.source === 'bot';
                return (
                  <div key={log.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-[var(--color-primary)]" />
                        <span className="text-xs font-semibold tracking-widest text-[var(--text-secondary)]">
                          {log.action}
                        </span>
                        {isCache && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] text-[10px] font-bold flex items-center gap-1 border border-[var(--color-accent-teal)]/30">
                            <Database size={10} /> LOCAL CACHE
                          </span>
                        )}
                        {isBot && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                            <Server size={10} /> LIVE FETCH (BOT)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      <strong>Params:</strong> {JSON.stringify(log.params)}
                    </div>
                    {log.result && (
                      <pre className="text-[10px] text-[var(--text-tertiary)] font-mono bg-black/40 p-2 rounded mt-1 overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(log.result, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </Card>
    </div>
  );
}
