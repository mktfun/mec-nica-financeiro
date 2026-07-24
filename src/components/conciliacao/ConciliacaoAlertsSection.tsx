import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, CheckCircle2, Landmark, CreditCard, ShieldAlert } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ConciliacaoAlertsSection({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando alertas..." /></div>;
  }

  const alerts = data?.unmatchedAlerts || [];

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="p-0 overflow-hidden">
        <div className="bg-[var(--bg-surface)] p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                Alertas & Divergências de Fechamento por Loja
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Lançamentos que não fecharam matematicamente nas 4 camadas automáticas. Apenas exceções reais exigem revisão.
              </p>
            </div>
          </div>

          <Badge variant={alerts.length === 0 ? "success" : "warning"} className="text-xs font-mono">
            {alerts.length === 0 ? "0 Divergências Reais" : `${alerts.length} Exceções Pendentes`}
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center">
            <CheckCircle2 size={40} className="text-[var(--color-accent-teal)] mb-3 opacity-80" />
            <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">Nenhuma Divergência Pendente!</h4>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-md">
              Todas as vendas de cartão e depósitos bancários desta data foram pareados com 100% de exatidão pelo motor de conciliação.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {alerts.map((alert: any, idx: number) => {
              const isDeposito = alert.type === 'DEPOSITO_SEM_VENDA';

              return (
                <div key={idx} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--bg-canvas)] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDeposito ? 'bg-[var(--color-accent-light-blue)]/10 text-[var(--color-accent-light-blue)]' : 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]'
                    }`}>
                      {isDeposito ? <Landmark size={18} /> : <CreditCard size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{alert.title}</span>
                        <Badge variant={isDeposito ? "brand" : "warning"} className="text-[10px]">
                          {isDeposito ? "Depósito Bancário Sem Venda" : "Venda Maquininha Sem Depósito"}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} className="text-[var(--color-accent-warning)]" />
                        {alert.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right self-end md:self-center font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Valor Divergente</span>
                      <span className={`text-base font-bold ${isDeposito ? 'text-[var(--color-accent-light-blue)]' : 'text-[var(--color-accent-warning)]'}`}>
                        R$ {Number(alert.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
