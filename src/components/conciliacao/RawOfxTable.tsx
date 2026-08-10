import { RawOfxResponse } from '@/hooks/useRawImportData';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface RawOfxTableProps {
  data: RawOfxResponse | undefined;
  isLoading: boolean;
}

export function RawOfxTable({ data, isLoading }: RawOfxTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Carregando dados bancários (OFX)...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Nenhum dado OFX retornado.</div>;
  }

  const txs = data.transactions || [];
  const inTotal = txs.filter(t => t.type === 'in').reduce((acc, t) => acc + (t.amount || 0), 0);
  const outTotal = txs.filter(t => t.type === 'out').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalBalance = inTotal + outTotal; // outTotal should be negative

  return (
    <div className="space-y-6">
      {/* Conta Header */}
      <div className="grid grid-cols-3 gap-4 px-4 py-4 bg-[var(--bg-muted)]/50 rounded-lg border border-[var(--border-subtle)]">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Limite da Conta</p>
          <p className="text-xl font-display font-medium text-[var(--text-primary)]">
            {data.account_limit !== null ? formatCurrency(data.account_limit) : <span className="text-sm italic opacity-50">Não configurado</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Saldo Anterior</p>
          <p className="text-xl font-display font-medium text-[var(--text-primary)]">
            {data.previous_balance !== null ? formatCurrency(data.previous_balance) : <span className="text-sm italic opacity-50">S/ Histórico</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Movimentação do Lote</p>
          <p className={`text-xl font-display font-medium ${totalBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg">
          Nenhuma transação bancária neste dia.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Histórico (Memo)</th>
                <th className="px-4 py-3 font-medium">FITID (Ref)</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {txs.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                    {row.occurred_at ? format(new Date(row.occurred_at), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)] max-w-xs truncate" title={row.description}>
                    {row.description || '-'}
                    {row.matched_os_number && (
                      <Badge variant="default" className="ml-2 text-[10px] scale-90">OS {row.matched_os_number}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[var(--text-tertiary)] max-w-[120px] truncate" title={row.fitid || ''}>
                    {row.fitid || '-'}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium flex items-center justify-end gap-1 ${
                    row.type === 'in' ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'
                  }`}>
                    {row.type === 'in' ? <ArrowDownRight size={14} className="opacity-70" /> : <ArrowUpRight size={14} className="opacity-50 text-[var(--color-accent-danger)]" />}
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
