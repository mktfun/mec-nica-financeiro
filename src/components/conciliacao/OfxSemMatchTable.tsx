import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HelpCircle, Info, FileEdit, CheckCircle2, Link2 } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { ManualMatchOsModal } from './ManualMatchOsModal';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function OfxSemMatchTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const { categorize } = useCategorizeOrphan();
  const queryClient = useQueryClient();
  const [categorizingTx, setCategorizingTx] = useState<any | null>(null);
  const [matchingTx, setMatchingTx] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const rows = data?.ofxSemMatch || [];
  const totalAvulso = rows.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);
  const totalJustificado = rows.filter((r: any) => !!r.manual_category).reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);
  const totalPendente = totalAvulso - totalJustificado;

  const handleCategorizationSuccess = async (categoryId: string, justification: string) => {
    toast.success('Justificativa aplicada com sucesso!');
    setCategorizingTx(null);
    await queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
    await queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] });
    await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    await queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="elevated" className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Entradas Avulsas</span>
              <HelpCircle size={18} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
              R$ {totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Justificado / Ajustes</span>
              <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-accent-teal)] font-mono">
              R$ {totalJustificado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card variant="elevated" className="p-5 border-[var(--color-accent-warning)]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Pendente de Justificativa / Vínculo</span>
              <FileEdit size={18} className="text-[var(--color-accent-warning)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-accent-warning)] font-mono">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
              4. Extrato Bancário (Entradas Avulsas, PIX e Justificativas)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Vincule pagamentos de clientes à sua respectiva OS ou justifique receitas avulsas (como Venda de Sucata, Óleo ou Reembolsos).
            </p>
          </div>
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
                  <th className="text-center py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasCategory = !!row.manual_category;

                  return (
                    <tr key={i} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        <div className="flex flex-col">
                          <span>{row.title || row.subtitle || 'Depósito em Conta'}</span>
                          {row.manual_justification && (
                            <span className="text-[11px] text-[var(--color-accent-teal)] font-sans italic">
                              "{row.manual_justification}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)] font-mono">
                        {row.counterpart_name || row.cnpj_cpf || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--color-primary)] font-bold font-mono">
                        R$ {Number(row.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasCategory ? (
                          <Badge variant="success" className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30 text-xs font-mono">
                            <CheckCircle2 size={11} className="mr-1" />
                            {String(row.manual_category).replace('_', ' ').toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px] font-mono">
                            <HelpCircle size={10} className="mr-1 opacity-50" />
                            Não Identificado
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="teal"
                            onClick={() => setMatchingTx(row)}
                            className="text-[11px] h-7 px-2 font-mono gap-1"
                            title="Vincular à Ordem de Serviço (Não soma no Faturamento Atual)"
                          >
                            <Link2 size={12} />
                            Vincular OS
                          </Button>
                          <Button
                            size="sm"
                            variant={hasCategory ? "outline" : "ghost"}
                            onClick={() => setCategorizingTx(row)}
                            className="text-[11px] h-7 px-2 font-mono text-[var(--text-secondary)] hover:text-white"
                            title="Justificar como Receita Avulsa (Soma no Faturamento Atual)"
                          >
                            <FileEdit size={12} className="mr-1" />
                            {hasCategory ? 'Alterar' : 'Justificar'}
                          </Button>
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

      {/* Modal de Categorização Avulsa */}
      {categorizingTx && (
        <OrphanCategorizationModal
          transactionId={categorizingTx.id}
          transactionTitle={categorizingTx.title || categorizingTx.subtitle || 'Transação OFX'}
          transactionAmount={Number(categorizingTx.amount || 0)}
          transactionType="in"
          onClose={() => setCategorizingTx(null)}
          onSuccess={handleCategorizationSuccess}
          categorizeOrphan={categorize}
        />
      )}

      {/* Modal de Vínculo com OS */}
      {matchingTx && (
        <ManualMatchOsModal
          isOpen={!!matchingTx}
          onClose={() => setMatchingTx(null)}
          transaction={matchingTx}
          storeId={storeId}
          targetDate={date}
        />
      )}
    </div>
  );
}
