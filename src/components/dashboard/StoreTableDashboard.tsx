import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableIcon, TrendingUp, TrendingDown } from 'lucide-react';
import type { StoreMetrics } from '@/hooks/useDashboardV2';

interface StoreTableDashboardProps {
  data: StoreMetrics[];
  isLoading?: boolean;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

const statusVariant = (s: StoreMetrics['statusConciliacao']) => {
  if (s === 'approved') return 'success';
  if (s === 'divergence') return 'danger';
  return 'warning';
};

const statusLabel = (s: StoreMetrics['statusConciliacao']) => {
  if (s === 'approved') return 'OK';
  if (s === 'divergence') return 'Divergência';
  return 'Pendente';
};

export function StoreTableDashboard({ data, isLoading }: StoreTableDashboardProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <div className="h-6 w-40 bg-[var(--bg-surface-hover)] rounded mb-5 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 bg-[var(--bg-surface-hover)] rounded mb-2 animate-pulse" />
        ))}
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="mb-5 shrink-0">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <TableIcon size={16} className="text-[var(--color-primary)]" />
          Resultado por Loja
        </h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Saldo, faturamento e contas no período</p>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {['Loja', 'Saldo', 'Faturamento', 'Contas', 'Resultado', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left pb-2 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold px-2 first:pl-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-[var(--text-tertiary)]">
                  Sem dados para o período selecionado
                </td>
              </tr>
            )}
            {data.map((store, i) => {
              const isPositive = store.resultado >= 0;
              return (
                <motion.tr
                  key={store.storeId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <td className="py-3 pr-2 font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {store.storeName.replace(/Rei do /gi, 'R. ').replace(/Mecânica Mec\. /gi, 'Mec. ')}
                  </td>
                  <td className="py-3 px-2 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                    {fmt(store.saldoAtual)}
                  </td>
                  <td className="py-3 px-2 font-mono text-[var(--color-accent-teal)] whitespace-nowrap">
                    {fmt(store.faturamento)}
                  </td>
                  <td className="py-3 px-2 font-mono text-[var(--color-accent-warning)] whitespace-nowrap">
                    {fmt(store.contas)}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className={`font-mono font-semibold flex items-center gap-1 ${
                      isPositive ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                    }`}>
                      {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {fmt(store.resultado)}
                    </span>
                  </td>
                  <td className="py-3 pl-2">
                    <Badge variant={statusVariant(store.statusConciliacao)} className="text-[10px]">
                      {statusLabel(store.statusConciliacao)}
                    </Badge>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
