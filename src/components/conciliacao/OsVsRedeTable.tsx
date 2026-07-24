import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, ExternalLink, ShieldCheck } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';

export function OsVsRedeTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.osVsRede || [];

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)] shadow-xl">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              1. Cartão <span className="text-[var(--text-tertiary)]">(Sistema OS → Maquininha)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Clique no número de qualquer OS para ver a quebra completa de pagamentos.</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {rows.length} Transações Processadas
          </Badge>
        </div>
        
        {rows.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação de maquininha encontrada para esta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono">
                  <th className="text-left py-3 px-4 font-medium">Transação Maquininha</th>
                  <th className="text-right py-3 px-4 font-medium">Rede (Bruto)</th>
                  <th className="text-right py-3 px-4 font-medium">Faturamento Sistema (OS)</th>
                  <th className="text-right py-3 px-4 font-medium">Delta</th>
                  <th className="text-center py-3 px-4 font-medium">OS Vinculada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasOs = row.os_number !== 'Não Localizada';

                  return (
                    <tr 
                      key={i} 
                      onClick={() => row.os_data && setSelectedOsData(row.os_data)}
                      className={`transition-colors ${hasOs ? 'hover:bg-white/5 cursor-pointer' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                        {row.maquininha_title}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[var(--text-secondary)]">
                        R$ {row.rede_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                        {hasOs ? `R$ ${(row.os_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-medium ${row.delta < 0 ? 'text-[var(--color-accent-teal)]' : row.delta > 0 ? 'text-[var(--color-accent-warning)]' : 'text-zinc-400'}`}>
                        {hasOs ? `${row.delta > 0 ? '+' : ''}R$ ${row.delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {hasOs ? (
                            <button className="flex items-center gap-1 font-bold text-xs text-[var(--color-primary)] hover:underline">
                              <span>OS #{row.os_number}</span>
                              <ExternalLink size={12} />
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono">Sem OS</span>
                          )}

                          {row.status === 'PAREADO' ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5 font-mono">
                              <CheckCircle2 size={10} className="mr-1" /> Pareado
                            </Badge>
                          ) : row.status === 'SEM_PAR' ? (
                            <Badge variant="danger" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] px-2 py-0.5 font-mono">
                              <AlertTriangle size={10} className="mr-1" /> Sem OS
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] px-2 py-0.5 font-mono">
                              <AlertTriangle size={10} className="mr-1" /> Delta
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes da OS */}
      <OsDetailModal 
        isOpen={!!selectedOsData}
        onClose={() => setSelectedOsData(null)}
        osData={selectedOsData}
      />
    </div>
  );
}
