import { TableIcon, TrendingUp, TrendingDown } from 'lucide-react';
import type { StoreMetrics } from '@/hooks/useDashboardV2';
import { useMemo } from 'react';
import {
  TableContainer,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { AmountCell } from '@/components/finance/AmountCell';
import { Badge } from '@/components/ui/Badge';

interface StoreTableDashboardProps {
  data: any[];
  isLoading?: boolean;
}

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
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-5" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 bg-zinc-800/60 rounded mb-2" />
        ))}
      </div>
    );
  }

  const isTotalPositive = totais.resultado >= 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 flex flex-col gap-4 shadow-sm">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base flex items-center gap-2 text-[var(--text-primary)]">
            <TableIcon size={16} className="text-[var(--color-primary)]" />
            Resultado por Loja
          </h3>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Saldo, faturamento, contas e pátio no período</p>
        </div>
      </div>

      <TableContainer>
        <TableHeader>
          <tr>
            <TableHead>Loja</TableHead>
            <TableHead isNumeric>Saldo Bancário (Itaú)</TableHead>
            <TableHead isNumeric>Faturamento (OFX)</TableHead>
            <TableHead isNumeric>Contas (OFX)</TableHead>
            <TableHead isNumeric>Resultado Operacional</TableHead>
            <TableHead align="center">Pátio</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" className="py-8 text-[var(--text-tertiary)]">
                Sem dados para o período selecionado
              </TableCell>
            </TableRow>
          )}
          {data.map((store) => {
            const isPositive = store.resultado >= 0;
            const isSaldoNegative = Number(store.saldoAtual || 0) < 0;

            return (
              <TableRow key={store.storeId || store.store_id || store.storeName}>
                <TableCell className="font-medium text-[var(--text-primary)] whitespace-nowrap">
                  {(store.storeName || store.store_name || 'Loja').replace(/Rei do /gi, 'R. ').replace(/Mecânica Mec\. /gi, 'Mec. ')}
                </TableCell>
                <TableCell isNumeric>
                  {isSaldoNegative ? (
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <AmountCell value={store.saldoAtual} tone="danger" />
                      <Badge variant="danger" size="sm">Negativo</Badge>
                    </div>
                  ) : (
                    <AmountCell value={store.saldoAtual} tone="neutral" />
                  )}
                </TableCell>
                <TableCell isNumeric>
                  <AmountCell value={store.faturamento} tone="neutral" />
                </TableCell>
                <TableCell isNumeric>
                  <AmountCell value={store.contas} tone="warning" />
                </TableCell>
                <TableCell isNumeric>
                  <div className="inline-flex items-center gap-1 font-mono font-semibold justify-end">
                    {isPositive ? (
                      <TrendingUp size={13} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={13} className="text-rose-400" />
                    )}
                    <AmountCell value={store.resultado} tone={isPositive ? 'success' : 'danger'} />
                  </div>
                </TableCell>
                <TableCell align="center" className="text-[11px] whitespace-nowrap">
                  {store.veiculosPatio > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold text-amber-400">{store.veiculosPatio} ud.</span>
                      <AmountCell value={store.veiculosPatioValor} className="text-[10px] opacity-80" />
                    </div>
                  ) : (
                    <span className="text-[var(--text-tertiary)]">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        
        {data.length > 0 && (
          <tfoot className="bg-[var(--bg-surface-elevated)] border-t-2 border-[var(--border-subtle)] text-sm font-semibold">
            <tr>
              <TableCell className="font-display font-bold uppercase tracking-wider text-xs">
                Total
              </TableCell>
              <TableCell isNumeric className="font-bold">
                <AmountCell value={totais.saldoAtual} />
              </TableCell>
              <TableCell isNumeric className="font-bold">
                <AmountCell value={totais.faturamento} />
              </TableCell>
              <TableCell isNumeric className="font-bold">
                <AmountCell value={totais.contas} tone="warning" />
              </TableCell>
              <TableCell isNumeric>
                <div className="inline-flex items-center gap-1 font-mono font-bold justify-end">
                  {isTotalPositive ? (
                    <TrendingUp size={14} className="text-emerald-400" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-400" />
                  )}
                  <AmountCell value={totais.resultado} tone={isTotalPositive ? 'success' : 'danger'} />
                </div>
              </TableCell>
              <TableCell align="center" className="text-[11px] whitespace-nowrap">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-bold text-amber-400">{totais.veiculosPatio} ud.</span>
                  <AmountCell value={totais.veiculosPatioValor} className="text-[10px] font-bold" />
                </div>
              </TableCell>
            </tr>
          </tfoot>
        )}
      </TableContainer>
    </div>
  );
}
