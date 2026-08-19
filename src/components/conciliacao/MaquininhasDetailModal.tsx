import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PosTripleReconciliationResult, StorePosDetail } from '@/hooks/useBackendConciliacao';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  Wrench,
  Clock,
  ArrowRight
} from 'lucide-react';

interface MaquininhasDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  data?: PosTripleReconciliationResult | null;
  isLoading?: boolean;
}

export function MaquininhasDetailModal({
  isOpen,
  onClose,
  targetDate,
  data,
  isLoading
}: MaquininhasDetailModalProps) {
  if (!isOpen) return null;

  const formattedDate = targetDate.split('-').reverse().join('/');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhamento de Maquininhas & Batimento OFX — ${formattedDate}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Cards de Resumo Global (4 Colunas Largas e Espaçosas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Vendas Rede */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-400" />
                  Vendas Rede (Líquido)
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                {formatCurrency(data?.total_rede_liquido || 0)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono flex justify-between items-center">
              <span className="text-zinc-500">Bruto:</span>
              <span className="text-zinc-300">{formatCurrency(data?.total_rede_bruto || 0)}</span>
            </div>
          </div>

          {/* Card 2: Taxas & MDR */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-rose-400" />
                  Taxas & MDR (Rede)
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
                {formatCurrency(data?.total_rede_taxas || 0)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex justify-between items-center">
              <span>Desconto adquirente</span>
              <span className="text-rose-400/80 font-mono text-[10px]">Custo Maq</span>
            </div>
          </div>

          {/* Card 3: Creditado no OFX */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-400" />
                  Creditado no OFX
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {formatCurrency(data?.total_ofx_maquininhas || 0)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex justify-between items-center">
              <span>Extrato bancário</span>
              <span className="text-emerald-400/80 font-mono text-[10px]">Soma bandeiras</span>
            </div>
          </div>

          {/* Card 4: A Compensar */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  A Compensar (Não Entrou)
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
                {formatCurrency(data?.total_nao_entrou || 0)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-amber-500/20 text-[11px] text-amber-400/80 flex justify-between items-center">
              <span>Soma no Saldo Caixa</span>
              <span className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">Pilar 1</span>
            </div>
          </div>

        </div>

        {/* Tabela de Conciliação Tripla por Loja */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60 shadow-inner">
          <div className="overflow-x-auto max-h-[460px] scrollbar-thin scrollbar-thumb-zinc-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-4 text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Loja</th>
                  <th className="py-3 px-4 text-right text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Venda Rede (Líq)</th>
                  <th className="py-3 px-4 text-right text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Creditado OFX</th>
                  <th className="py-3 px-4 text-right text-amber-400 font-bold uppercase tracking-wider text-[10px]">Não Entrou</th>
                  <th className="py-3 px-4 text-center text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="py-3 px-4 text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Transações OFX Vinculadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                      Carregando conciliação tripla...
                    </td>
                  </tr>
                ) : !data?.stores || data.stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                      Nenhum registro de maquininha encontrado para esta data.
                    </td>
                  </tr>
                ) : (
                  data.stores.map((st: StorePosDetail) => {
                    const hasNaoEntrou = st.nao_entrou_valor > 0;
                    return (
                      <tr
                        key={st.store_id}
                        className="hover:bg-zinc-900/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-sans font-semibold text-zinc-100 text-sm">
                          {st.store_name}
                        </td>
                        <td className="py-3.5 px-4 text-right text-zinc-200 font-bold text-sm">
                          {formatCurrency(st.rede_liquido)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold text-sm">
                          {formatCurrency(st.ofx_maquininhas)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-sm">
                          {hasNaoEntrou ? (
                            <span className="text-amber-400">
                              + {formatCurrency(st.nao_entrou_valor)}
                            </span>
                          ) : (
                            <span className="text-zinc-500">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {st.status_compensacao === 'entrou' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={13} /> ENTROU
                            </span>
                          )}
                          {st.status_compensacao === 'parcial' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock size={13} /> PARCIAL
                            </span>
                          )}
                          {st.status_compensacao === 'nao_entrou' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle size={13} /> NÃO ENTROU
                            </span>
                          )}
                          {st.status_compensacao === 'sem_movimento' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-800">
                              SEM MOVIMENTO
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-xs text-zinc-400">
                          {st.ofx_transacoes && st.ofx_transacoes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {st.ofx_transacoes.map((tx, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px]"
                                  title={tx.fitid || tx.counterpart}
                                >
                                  {formatCurrency(tx.amount)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Nenhum crédito bancário</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota Informativa sobre a Regra de Negócio */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 flex items-start gap-3">
          <Layers size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-zinc-200">Regra Contábil de Fechamento:</strong> Os valores com status <span className="text-amber-300 font-semibold">NÃO ENTROU / PARCIAL</span> são integrados ao Saldo do Pilar 1 (<span className="text-cyan-300 font-semibold">Saldo Bancos + Cartões a Compensar</span>). Quando o valor for creditado no extrato do dia útil seguinte, ele será reconciliado como <span className="text-emerald-300 font-semibold">ENTROU</span>, mantendo a integridade do patrimônio.
          </div>
        </div>
      </div>
    </Modal>
  );
}
