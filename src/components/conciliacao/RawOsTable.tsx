import { RawOsRecord } from '@/hooks/useRawImportData';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RawOsTableProps {
  data: RawOsRecord[];
  isLoading: boolean;
}

export function RawOsTable({ data, isLoading }: RawOsTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Carregando dados do Pátio...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg">
        Nenhuma OS encontrada para esta data de abertura.
      </div>
    );
  }

  const totalValue = data.reduce((acc, row) => acc + (row.total_value || 0), 0);
  const totalPaid = data.reduce((acc, row) => acc + (row.paid_value || 0), 0);
  const totalRemaining = data.reduce((acc, row) => acc + (row.remaining_value || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-y border-[var(--border-subtle)]">
          <tr>
            <th className="px-4 py-3 font-medium">Nº OS</th>
            <th className="px-4 py-3 font-medium">Abertura</th>
            <th className="px-4 py-3 font-medium">Fechamento</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium text-right">Pago</th>
            <th className="px-4 py-3 font-medium text-right">Restante</th>
            <th className="px-4 py-3 font-medium">Pagamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {data.map((row) => (
            <tr key={row.os_number} className="hover:bg-[var(--bg-subtle)] transition-colors">
              <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.os_number}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {row.opened_at
                  ? format(new Date(row.opened_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                  : '-'}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {row.closed_at
                  ? format(new Date(row.closed_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                  : '-'}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    row.status === 'finalizado'
                      ? 'success'
                      : row.status === 'pago_parcial'
                      ? 'warning'
                      : 'default'
                  }
                  className="text-xs"
                >
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.total_value)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-success)]">
                {formatCurrency(row.paid_value)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-danger)]">
                {formatCurrency(row.remaining_value)}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{row.payment_method || '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[var(--bg-muted)]/50 border-t border-[var(--border-subtle)] font-medium">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-right text-[var(--text-tertiary)]">
              Totais:
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalValue)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-success)]">
              {formatCurrency(totalPaid)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent-danger)]">
              {formatCurrency(totalRemaining)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
