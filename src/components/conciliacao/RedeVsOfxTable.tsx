import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.redeVsOfx || [];

  return (
    <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
      <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          2. Maquininha (Líquido) <span className="text-[var(--text-tertiary)]">→</span> Banco (Extrato)
        </h3>
        <Badge variant="outline" className="text-xs">
          {rows.length} Transações Pareadas
        </Badge>
      </div>
      
      {rows.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-tertiary)] flex flex-col items-center">
          <Info size={32} className="opacity-20 mb-2" />
          Nenhuma transação de maquininha pareada com extrato nesta data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <th className="text-left py-3 px-4 font-medium">Ref. OS</th>
                <th className="text-right py-3 px-4 font-medium">Rede Líquido</th>
                <th className="text-right py-3 px-4 font-medium">Depositado (Banco)</th>
                <th className="text-right py-3 px-4 font-medium">Delta</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                    {row.os_number}
                  </td>
                  <td className="py-3 px-4 text-right">
                    R$ {row.rede_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    R$ {row.ofx_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${row.delta < 0 ? 'text-[var(--color-accent-teal)]' : row.delta > 0 ? 'text-[var(--color-accent-warning)]' : 'text-[var(--text-secondary)]'}`}>
                    {row.delta > 0 ? '+' : ''}{row.delta === 0 ? '-' : `R$ ${row.delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.status === 'PAREADO' ? (
                      <Badge variant="success" className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30">
                        <CheckCircle2 size={12} className="mr-1" />
                        No Banco
                      </Badge>
                    ) : row.status === 'FALTA_NO_BANCO' ? (
                       <Badge variant="danger" className="bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] border-[var(--color-accent-danger)]/30">
                        <AlertTriangle size={12} className="mr-1" />
                        Falta no Banco
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]/30">
                        <AlertTriangle size={12} className="mr-1" />
                        Com Delta
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
