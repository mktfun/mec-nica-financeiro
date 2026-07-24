import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, CreditCard, Landmark, ChevronRight, Layers } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const redeTxs = data?.redeVsOfx?.rede || [];
  const ofxAdquirenteTxs = data?.redeVsOfx?.ofx || [];
  const depositGroups = data?.redeVsOfx?.depositGroups || [];
  const unassignedRedeTxs = data?.redeVsOfx?.unassignedRedeTxs || [];

  const redeTotal = redeTxs.reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  const ofxAdquirenteTotal = ofxAdquirenteTxs.reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  const delta = redeTotal - ofxAdquirenteTotal;
  const isPareado = Math.abs(delta) < 1.0;

  return (
    <div className="space-y-8">
      {/* 3 Cards Superiores — usando Card nativo do sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Maquininhas (Total Líquido)</span>
            <CreditCard size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {redeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{redeTxs.length} vendas de cartão processadas</p>
        </Card>

        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Depositado Banco (OFX)</span>
            <Landmark size={18} className="text-[var(--color-accent-light-blue)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-light-blue)] font-mono">
            R$ {ofxAdquirenteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{ofxAdquirenteTxs.length} depósitos de adquirente</p>
        </Card>

        <Card variant="elevated" className={`p-5 ${isPareado ? 'border-[var(--color-accent-teal)]/30' : 'border-[var(--color-accent-danger)]/30'}`}>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">Status Maquininha ↔ Banco</span>
          <div className="flex items-center gap-3">
            {isPareado ? (
              <CheckCircle2 size={28} className="text-[var(--color-accent-teal)] shrink-0" />
            ) : (
              <AlertTriangle size={28} className="text-[var(--color-accent-danger)] shrink-0" />
            )}
            <div>
              <p className={`text-xl font-bold font-mono ${isPareado ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                {isPareado ? 'PAREADO (R$ 0,00)' : `DIVERGÊNCIA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isPareado ? '100% dos cartões caíram no banco' : 'Diferença entre vendas e extrato'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Título de Pareamento Agrupado */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
          <Layers size={20} className="text-[var(--color-primary)]" />
          Pareamento por Grupos de Depósito Bancário
        </h3>
        <Badge variant="neutral" className="text-xs font-mono text-[var(--text-secondary)]">
          {depositGroups.length} Depósitos Identificados
        </Badge>
      </div>

      {/* CARDS AGRUPADOS POR DEPÓSITO OFX */}
      {depositGroups.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
          <Info size={36} className="opacity-20 mb-3" />
          Nenhum depósito de adquirente no extrato bancário para esta data.
        </Card>
      ) : (
        <div className="space-y-6">
          {depositGroups.map((group: any, idx: number) => {
            const { ofxDeposit, childRedeTxs, totalChildAmount, isMatched } = group;

            return (
              <Card key={idx} variant="elevated" className="p-0 overflow-hidden">
                {/* Header do Card — Depósito no Banco OFX */}
                <div className="p-5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light-blue)]/10 text-[var(--color-accent-light-blue)] flex items-center justify-center shrink-0">
                      <Landmark size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[var(--color-accent-light-blue)] uppercase tracking-widest">Depósito no Extrato Bancário (OFX)</span>
                      <h4 className="font-mono text-sm font-semibold text-[var(--text-primary)] mt-0.5">{ofxDeposit.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider block">Crédito no Banco</span>
                      <span className="font-mono text-lg font-bold text-[var(--color-accent-light-blue)]">
                        R$ {Number(ofxDeposit.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isMatched ? (
                      <Badge variant="success" className="text-xs px-3 py-1 font-mono">
                        <CheckCircle2 size={12} className="mr-1.5" /> 100% Pareado
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs px-3 py-1 font-mono">
                        <AlertTriangle size={12} className="mr-1.5" /> Divergência R$ {Math.abs(group.groupDelta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sub-tabela de Vendas da Maquininha */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[var(--color-accent-teal)]" />
                      Vendas da Maquininha que Formam esse Depósito ({childRedeTxs.length})
                    </span>
                    <span>Líquido Rede</span>
                  </div>

                  {childRedeTxs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--text-tertiary)] italic bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                      Nenhuma venda da maquininha pareada individualmente para este depósito.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {childRedeTxs.map((rTx: any, rIdx: number) => (
                        <div key={rIdx} className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <ChevronRight size={14} className="text-[var(--color-accent-teal)]" />
                            <span>{rTx.title}</span>
                            {rTx.payment_method && (
                              <Badge variant="neutral" className="text-[10px]">
                                {rTx.payment_method}
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-[var(--text-primary)]">
                            R$ {Number(rTx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rodapé com Cálculo Matemático Transparente */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-secondary)]">Soma das Vendas da Maquininha:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-accent-teal)]">
                        R$ {totalChildAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[var(--text-tertiary)]">=</span>
                      <span className="font-bold text-[var(--color-accent-light-blue)]">
                        R$ {Number(ofxDeposit.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Banco)
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vendas não atribuídas */}
      {unassignedRedeTxs.length > 0 && (
        <Card variant="transparent" className="p-5 space-y-3 border-[var(--color-accent-warning)]/30">
          <h4 className="font-mono text-xs font-bold text-[var(--color-accent-warning)] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} /> Vendas da Maquininha PENDENTES de Depósito Bancário ({unassignedRedeTxs.length})
          </h4>
          <div className="space-y-2">
            {unassignedRedeTxs.map((t: any, idx: number) => (
              <div key={idx} className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">{t.title}</span>
                <span className="font-bold text-[var(--color-accent-warning)]">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
