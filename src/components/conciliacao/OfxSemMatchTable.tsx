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
  const totalAvulso = rows.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <Card variant="elevated" className="p-5 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Entradas Avulsas</span>
            <HelpCircle size={18} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      )}

      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
            4. Extrato Bancário (Entradas Avulsas / Sem Associação)
          </h3>
          <Badge variant="outline" className="text-xs border-[var(--color-primary)]/30 text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-mono">
            {rows.length} Entradas
          </Badge>
        </div>
        
        {rows.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma entrada avulsa no banco. Todas as entradas foram associadas a Maquininhas ou PIX de OS!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono">
                  <th className="text-left py-3 px-4 font-medium">Descrição (OFX)</th>
                  <th className="text-left py-3 px-4 font-medium">Contraparte / Documento</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Depositado</th>
                  <th className="text-center py-3 px-4 font-medium">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                      {row.title || row.subtitle || 'Depósito em Conta'}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)] font-mono">
                      {row.counterpart_name || row.cnpj_cpf || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-primary)] font-bold font-mono">
                      R$ {Number(row.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px] font-mono">
                        <HelpCircle size={10} className="mr-1 opacity-50" />
                        Entrada Avulsa
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
