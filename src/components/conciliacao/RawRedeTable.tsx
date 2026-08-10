import { RawRedeRecord } from '@/hooks/useRawImportData';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RawRedeTableProps {
  data: RawRedeRecord[];
  isLoading: boolean;
}

export function RawRedeTable({ data, isLoading }: RawRedeTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Carregando transações da Rede...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg">
        Nenhuma transação de maquininha encontrada para esta data.
      </div>
    );
  }

  const totalGross = data.reduce((acc, row) => acc + (row.gross_amount || 0), 0);
  const totalNet = data.reduce((acc, row) => acc + (row.net_amount || 0), 0);
  const totalFee = data.reduce((acc, row) => acc + (row.fee_amount || 0), 0);
  const avgFeePct = totalGross > 0 ? (totalFee / totalGross) * 100 : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-y border-[var(--border-subtle)]">
          <tr>
            <th className="px-4 py-3 font-medium">Data/Hora</th>
            <th className="px-4 py-3 font-medium">Maquininha</th>
            <th className="px-4 py-3 font-medium">Forma Pgto</th>
            <th className="px-4 py-3 font-medium text-right">Bruto</th>
            <th className="px-4 py-3 font-medium text-right">Taxa (R$)</th>
            <th className="px-4 py-3 font-medium text-right">Taxa (%)</th>
            <th className="px-4 py-3 font-medium text-right">Líquido</th>
            <th className="px-4 py-3 font-medium text-center">OS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
              <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                {row.occurred_at
                  ? format(new Date(row.occurred_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                  : '-'}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{row.machine_name || '-'}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{row.payment_method || '-'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.gross_amount)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-danger)]">
                {formatCurrency(row.fee_amount)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-warning)]">
                {row.fee_percentage ? row.fee_percentage.toFixed(2) + '%' : '-'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-success)] font-medium">
                {formatCurrency(row.net_amount)}
              </td>
              <td className="px-4 py-3 text-center">
                {row.matched_os_number ? (
                  <Badge variant="default" className="text-xs">
                    {row.matched_os_number}
                  </Badge>
                ) : (
                  <span className="text-[var(--text-tertiary)]">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[var(--bg-muted)]/50 border-t border-[var(--border-subtle)] font-medium">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-[var(--text-tertiary)]">
              Totais:
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalGross)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-danger)]">
              {formatCurrency(totalFee)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-warning)]">
              {avgFeePct.toFixed(2)}%
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-success)]">
              {formatCurrency(totalNet)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
