import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableIcon, TrendingUp, TrendingDown } from 'lucide-react';
import type { StoreMetrics } from '@/hooks/useDashboardV2';
import { useMemo } from 'react';

interface StoreTableDashboardProps {
  data: any[];
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
  const totais = useMemo(() => {
    return data.reduce(
      (acc, curr) => ({
        saldoAtual: acc.saldoAtual + curr.saldoAtual,
        faturamento: acc.faturamento + curr.faturamento,
        contas: acc.contas + curr.contas,
        resultado: acc.resultado + curr.resultado,
        veiculosPatioValor: acc.veiculosPatioValor + curr.veiculosPatioValor,
        veiculosPatio: acc.veiculosPatio + curr.veiculosPatio,
      }),
      { saldoAtual: 0, faturamento: 0, contas: 0, resultado: 0, veiculosPatioValor: 0, veiculosPatio: 0 }
    );
  }, [data]);

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

  const isTotalPositive = totais.resultado >= 0;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="mb-5 shrink-0">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <TableIcon size={16} className="text-[var(--color-primary)]" />
          Resultado por Loja
        </h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Saldo, faturamento, contas e pátio no período</p>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {['Loja', 'Saldo Bancário', 'Faturamento', 'Contas (OFX)', 'Resultado', 'Pátio'].map(h => (
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
              const isSaldoNegative = Number(store.saldoAtual || 0) < 0;

              return (
                <motion.tr
                  key={store.storeId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <td className="py-3 pr-2 font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {(store.storeName || store.store_name || 'Loja').replace(/Rei do /gi, 'R. ').replace(/Mecânica Mec\. /gi, 'Mec. ')}
                  </td>
                  <td className="py-3 px-2 font-mono whitespace-nowrap">
                    {isSaldoNegative ? (
                      <span className="text-[var(--color-accent-danger)] font-bold flex items-center gap-1">
                        {fmt(store.saldoAtual)}
                        <span className="text-[9px] font-sans font-medium px-1 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          Negativo
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">
                        {fmt(store.saldoAtual)}
                      </span>
                    )}
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
                  <td className="py-3 px-2 text-[11px] whitespace-nowrap text-[var(--text-secondary)]">
                    {store.veiculosPatio > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-[var(--color-accent-warning)]">{store.veiculosPatio} ud.</span>
                        <span className="font-mono text-[10px] opacity-80">{fmt(store.veiculosPatioValor)}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">-</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          
          {data.length > 0 && (
            <tfoot className="bg-[var(--bg-surface-elevated)] border-t-2 border-[var(--border-subtle)]">
              <tr>
                <td className="py-3 pr-2 font-display font-bold text-[var(--text-primary)] uppercase tracking-wider text-xs">
                  Total
                </td>
                <td className="py-3 px-2 font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                  {fmt(totais.saldoAtual)}
                </td>
                <td className="py-3 px-2 font-mono font-bold text-[var(--color-accent-teal)] whitespace-nowrap">
                  {fmt(totais.faturamento)}
                </td>
                <td className="py-3 px-2 font-mono font-bold text-[var(--color-accent-warning)] whitespace-nowrap">
                  {fmt(totais.contas)}
                </td>
                <td className="py-3 px-2 whitespace-nowrap">
                  <span className={`font-mono font-bold flex items-center gap-1 ${
                    isTotalPositive ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                  }`}>
                    {isTotalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {fmt(totais.resultado)}
                  </span>
                </td>
                <td className="py-3 px-2 text-[11px] whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--color-accent-warning)]">{totais.veiculosPatio} ud.</span>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-[10px]">{fmt(totais.veiculosPatioValor)}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}
