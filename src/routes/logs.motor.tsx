import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Workflow, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, ChevronDown } from 'lucide-react';
import { useBotLogs } from '@/hooks/useBotLogs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/logs/motor')({
  component: LogsMotorPage,
});

function LogsMotorPage() {
  const { data: botLogs = [], isLoading: loadingLogs } = useBotLogs(50);
  const motorLogs = botLogs.filter(log => !log.bot_name?.toLowerCase().includes('ias') && !log.bot_name?.toLowerCase().includes('agente'));

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/agente" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 bg-[var(--bg-surface)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
            <ArrowLeft size={16} /> Voltar para o Agente
          </Link>
          <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Workflow size={20} className="text-blue-400" />
            </div>
            Log do Motor de Conciliação
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">Trilha de auditoria das execuções de coleta do bot.</p>
        </div>

        <Card variant="glass" className="p-6">
            {loadingLogs ? (
              <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
            ) : motorLogs.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhum log do Motor registrado.</p>
            ) : (
              <div className="space-y-3">
                {motorLogs.map(log => (
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
                      <details className="mt-2 group">
                        <summary className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer list-none flex items-center gap-1 select-none">
                          <ChevronDown size={14} className="group-open:-rotate-180 transition-transform duration-200" />
                          Ver Detalhes do Payload
                        </summary>
                        <div className="mt-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
                          {log.payload.input && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">Input (Request)</div>
                              <pre className="text-[10px] text-[var(--text-primary)] font-mono bg-[#050711] p-2 rounded overflow-x-auto border border-[var(--border-subtle)]">
                                {JSON.stringify(log.payload.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.payload.output && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">Output (Response)</div>
                              <pre className="text-[10px] text-[var(--text-primary)] font-mono bg-[#050711] p-2 rounded overflow-x-auto border border-[var(--border-subtle)]">
                                {JSON.stringify(log.payload.output, null, 2)}
                              </pre>
                            </div>
                          )}
                          {!log.payload.input && !log.payload.output && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">Payload Bruto</div>
                              <pre className="text-[10px] text-[var(--text-primary)] font-mono bg-[#050711] p-2 rounded overflow-x-auto border border-[var(--border-subtle)]">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
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
