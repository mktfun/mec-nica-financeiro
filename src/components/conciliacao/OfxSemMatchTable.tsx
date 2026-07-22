import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { HelpCircle, Info } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function OfxSemMatchTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.ofxSemMatch || [];

  return (
    <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
      <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
          3. Extrato Bancário (Sem Associação)
        </h3>
        <Badge variant="outline" className="text-xs border-[var(--color-primary)]/30 text-[var(--color-primary)] bg-[var(--color-primary)]/10">
          {rows.length} Entradas Soltas
        </Badge>
      </div>
      
      {rows.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-tertiary)] flex flex-col items-center">
          <Info size={32} className="opacity-20 mb-2" />
          Nenhuma entrada avulsa no banco. Tudo foi associado!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <th className="text-left py-3 px-4 font-medium">Descrição (OFX)</th>
                <th className="text-right py-3 px-4 font-medium">Valor Depositado</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                    {row.subtitle || row.title}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-primary)] font-medium">
                    R$ {Number(row.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className="bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                      <HelpCircle size={12} className="mr-1 opacity-50" />
                      Não Identificado
                    </Badge>
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
