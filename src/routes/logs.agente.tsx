import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Terminal, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useBotLogs } from '@/hooks/useBotLogs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/logs/agente')({
  component: LogsAgentePage,
});

function LogsAgentePage() {
  const { data: botLogs = [], isLoading: loadingLogs } = useBotLogs(50);
  const agenteLogs = botLogs.filter(log => log.bot_name?.toLowerCase().includes('ias') || log.bot_name?.toLowerCase().includes('agente'));

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/agente" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 bg-[var(--bg-surface)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
            <ArrowLeft size={16} /> Voltar para o Agente
          </Link>
          <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Terminal size={20} className="text-indigo-400" />
            </div>
            Log do Agente de IA
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">Monitoramento metacognitivo das reflexões do agente.</p>
        </div>

        <Card variant="glass" className="p-6">
            {loadingLogs ? (
              <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
            ) : agenteLogs.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhum log do Agente IA registrado.</p>
            ) : (
              <div className="space-y-3">
                {agenteLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 size={14} className="text-[var(--color-accent-teal)]" />
                        ) : log.status === 'error' ? (
                          <XCircle size={14} className="text-[var(--color-accent-danger)]" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                          {log.bot_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{log.message}</p>
                    {log.payload && (
                      <pre className="text-[10px] text-[var(--text-tertiary)] font-mono bg-black/40 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>
    </AppShell>
  );
}
