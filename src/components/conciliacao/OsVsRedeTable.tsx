import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function OsVsRedeTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.osVsRede || [];

  return (
    <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
      <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          2. Maquininha (Rede/Pix) <span className="text-[var(--text-tertiary)]">→</span> Sistema (OS)
        </h3>
        <Badge variant="outline" className="text-xs">
          {rows.length} Transações Processadas
        </Badge>
      </div>
      
      {rows.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-tertiary)] flex flex-col items-center">
          <Info size={32} className="opacity-20 mb-2" />
          Nenhuma transação de maquininha importada encontrada para esta data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <th className="text-left py-3 px-4 font-medium">Transação Maquininha</th>
                <th className="text-right py-3 px-4 font-medium">Rede (Bruto)</th>
                <th className="text-right py-3 px-4 font-medium">Faturamento Sistema (OS)</th>
                <th className="text-right py-3 px-4 font-medium">Delta</th>
                <th className="text-center py-3 px-4 font-medium">OS Vinculada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                    {row.maquininha_title}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    R$ {row.rede_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.os_total > 0 ? `R$ ${row.os_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${row.delta < 0 ? 'text-[var(--color-accent-teal)]' : row.delta > 0 ? 'text-[var(--color-accent-warning)]' : 'text-[var(--text-secondary)]'}`}>
                    {row.delta > 0 ? '+' : ''}{row.delta === 0 ? '-' : `R$ ${row.delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                       <span className="font-semibold text-xs">{row.os_number}</span>
                       {row.status === 'PAREADO' ? (
                         <Badge variant="success" className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30 text-[10px] px-1.5 py-0.5">
                           <CheckCircle2 size={10} className="mr-1" /> Pareado
                         </Badge>
                       ) : row.status === 'SEM_PAR' ? (
                         <Badge variant="danger" className="bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] border-[var(--color-accent-danger)]/30 text-[10px] px-1.5 py-0.5">
                           <AlertTriangle size={10} className="mr-1" /> Sem OS
                         </Badge>
                       ) : (
                         <Badge variant="warning" className="bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]/30 text-[10px] px-1.5 py-0.5">
                           <AlertTriangle size={10} className="mr-1" /> Delta
                         </Badge>
                       )}
                    </div>
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
