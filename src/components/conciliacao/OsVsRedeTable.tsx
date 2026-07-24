import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, Info, ExternalLink, Check } from 'lucide-react';
import { useReconciliationViews, useUpdateOsStatus } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';

export function OsVsRedeTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const updateOsStatus = useUpdateOsStatus();
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.osVsRede || [];

  const handleQuickEntrou = (e: React.MouseEvent, osData: any) => {
    e.stopPropagation();
    if (!osData?.id) return;
    const isEntrou = osData.status === 'ENTROU';
    updateOsStatus.mutate({
      osId: osData.id,
      osNumber: osData.os_number,
      storeId,
      targetDate: date,
      newStatus: isEntrou ? 'finalizado' : 'ENTROU'
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden">
        <div className="bg-[var(--bg-surface)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--text-primary)]">
              1. Cartão <span className="text-[var(--text-tertiary)]">(Sistema OS → Maquininha)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Clique na OS para ver detalhes ou use o botão 'Baixar' para marcar como ENTROU manualmente.</p>
          </div>
          <Badge variant="neutral" className="text-xs font-mono">
            {rows.length} Transações
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
                  <th className="text-center py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasOs = row.os_number !== 'Não Localizada';
                  const isEntrou = row.os_data?.status === 'ENTROU';

                  return (
                    <tr
                      key={i}
                      onClick={() => row.os_data && setSelectedOsData({ ...row.os_data, store_id: storeId, target_date: date })}
                      className={`transition-colors ${hasOs ? 'hover:bg-[var(--bg-surface)] cursor-pointer' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                        {row.maquininha_title}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[var(--text-secondary)]">
                        R$ {row.rede_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-[var(--text-primary)]">
                        {hasOs ? `R$ ${(row.os_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-medium ${
                        row.delta < 0 ? 'text-[var(--color-accent-teal)]' :
                        row.delta > 0 ? 'text-[var(--color-accent-warning)]' :
                        'text-[var(--text-tertiary)]'
                      }`}>
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
                            <span className="text-xs text-[var(--text-tertiary)] font-mono">Sem OS</span>
                          )}

                          {isEntrou || row.status === 'PAREADO' ? (
                            <Badge variant="success" className="text-[10px] px-2 py-0.5 font-mono">
                              <CheckCircle2 size={10} className="mr-1" /> Pareado / ENTROU
                            </Badge>
                          ) : row.status === 'SEM_PAR' ? (
                            <Badge variant="danger" className="text-[10px] px-2 py-0.5 font-mono">
                              <AlertTriangle size={10} className="mr-1" /> Sem OS
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-mono">
                              <AlertTriangle size={10} className="mr-1" /> Delta
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {hasOs && row.os_data?.id && (
                          <Button
                            size="sm"
                            variant={isEntrou ? "outline" : "teal"}
                            onClick={(e) => handleQuickEntrou(e, row.os_data)}
                            disabled={updateOsStatus.isPending}
                            className="text-[10px] h-7 px-2"
                          >
                            <Check size={10} className="mr-1" />
                            {isEntrou ? 'Desfazer' : 'Baixar OS'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OsDetailModal
        isOpen={!!selectedOsData}
        onClose={() => setSelectedOsData(null)}
        osData={selectedOsData}
      />
    </div>
  );
}
