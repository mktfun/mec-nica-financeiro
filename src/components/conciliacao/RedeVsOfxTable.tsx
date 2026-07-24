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
      {/* 3 Cards Superiores Redesenhados (Dark UI Zinc-950) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Maquininhas (Total Líquido)</span>
            <CreditCard size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            R$ {redeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{redeTxs.length} vendas de cartão processadas</p>
        </Card>

        <Card className="p-5 bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Depositado Banco (OFX)</span>
            <Landmark size={18} className="text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-sky-400 font-mono">
            R$ {ofxAdquirenteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{ofxAdquirenteTxs.length} depósitos de adquirente</p>
        </Card>

        <Card className={`p-5 rounded-2xl border ${isPareado ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} shadow-xl`}>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Status Maquininha ↔ Banco</span>
          <div className="flex items-center gap-3">
            {isPareado ? (
              <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={28} className="text-red-400 shrink-0" />
            )}
            <div>
              <p className={`text-xl font-bold font-mono ${isPareado ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPareado ? 'PAREADO (R$ 0,00)' : `DIVERGÊNCIA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-zinc-300 mt-0.5">
                {isPareado ? '100% dos cartões caíram no banco' : 'Diferença entre vendas e extrato'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Título de Pareamento Agrupado */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Layers size={20} className="text-[var(--color-primary)]" />
          Pareamento por Grupos de Depósito Bancário
        </h3>
        <Badge variant="outline" className="text-xs font-mono text-zinc-400 border-zinc-700">
          {depositGroups.length} Depósitos Identificados
        </Badge>
      </div>

      {/* CARDS AGRUPADOS POR DEPÓSITO BANCÁRIO OFX */}
      {depositGroups.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500 flex flex-col items-center bg-[#050711] border border-zinc-800">
          <Info size={36} className="opacity-20 mb-3" />
          Nenhum depósito de adquirente no extrato bancário para esta data.
        </Card>
      ) : (
        <div className="space-y-6">
          {depositGroups.map((group: any, idx: number) => {
            const { ofxDeposit, childRedeTxs, totalChildAmount, isMatched } = group;

            return (
              <Card key={idx} className="p-0 overflow-hidden bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl">
                {/* Header do Card: Depósito no Banco OFX */}
                <div className="p-5 bg-zinc-900/80 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                      <Landmark size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Depósito no Extrato Bancário (OFX)</span>
                      <h4 className="font-mono text-sm font-semibold text-white mt-0.5">{ofxDeposit.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Crédito no Banco</span>
                      <span className="font-mono text-lg font-bold text-sky-400">
                        R$ {Number(ofxDeposit.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {isMatched ? (
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 font-mono">
                        <CheckCircle2 size={12} className="mr-1.5" /> 100% Pareado
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-3 py-1 font-mono">
                        <AlertTriangle size={12} className="mr-1.5" /> Divergência R$ {Math.abs(group.groupDelta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sub-tabela de Vendas de Maquininha Filhas que Formam esse Depósito */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[var(--color-accent-teal)]" />
                      Vendas da Maquininha que Formam esse Depósito ({childRedeTxs.length})
                    </span>
                    <span>Líquido Rede</span>
                  </div>

                  {childRedeTxs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500 italic bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                      Nenhuma venda da maquininha pareada individualmente para este depósito.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {childRedeTxs.map((rTx: any, rIdx: number) => (
                        <div key={rIdx} className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <ChevronRight size={14} className="text-emerald-400" />
                            <span>{rTx.title}</span>
                            {rTx.payment_method && (
                              <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                                {rTx.payment_method}
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-white">
                            R$ {Number(rTx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rodapé com Cálculo Matemático Transparente */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Soma das Vendas da Maquininha:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">
                        R$ {totalChildAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-zinc-500">=</span>
                      <span className="font-bold text-sky-400">
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

      {/* Se houver vendas não atribuídas */}
      {unassignedRedeTxs.length > 0 && (
        <Card className="p-5 bg-[#050711] border border-amber-500/30 rounded-2xl space-y-3">
          <h4 className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} /> Vendas da Maquininha PENDENTES de Depósito Bancário ({unassignedRedeTxs.length})
          </h4>
          <div className="space-y-2">
            {unassignedRedeTxs.map((t: any, idx: number) => (
              <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">{t.title}</span>
                <span className="font-bold text-amber-400">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
