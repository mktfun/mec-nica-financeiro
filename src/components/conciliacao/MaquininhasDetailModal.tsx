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
      size="xl"
    >
      <div className="space-y-6">
        {/* Cards de Resumo Global */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mb-1">
              <CreditCard size={13} className="text-blue-400" />
              Vendas Rede (Líquido)
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-zinc-100">
              {formatCurrency(data?.total_rede_liquido || 0)}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">
              Bruto: {formatCurrency(data?.total_rede_bruto || 0)}
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-rose-400" />
              Taxas & MDR (Rede)
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-rose-400">
              {formatCurrency(data?.total_rede_taxas || 0)}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Retido na adquirente</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mb-1">
              <Building2 size={13} className="text-emerald-400" />
              Creditado no OFX
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-emerald-400">
              {formatCurrency(data?.total_ofx_maquininhas || 0)}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Soma das bandeiras</span>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-amber-400" />
              A Compensar (Não Entrou)
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-amber-400">
              {formatCurrency(data?.total_nao_entrou || 0)}
            </span>
            <span className="text-[10px] text-amber-500/80 mt-0.5">Soma no Saldo Caixa</span>
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/40">
          <div className="overflow-x-auto max-h-[420px] scrollbar-thin scrollbar-thumb-zinc-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3 text-right">Venda Rede (Líq)</th>
                  <th className="py-2.5 px-3 text-right">Creditado OFX</th>
                  <th className="py-2.5 px-3 text-right">Não Entrou</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Detalhes de Bandeiras & OSs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      Carregando conciliação tripla...
                    </td>
                  </tr>
                ) : !data?.stores || data.stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      Nenhum registro de maquininha encontrado para esta data.
                    </td>
                  </tr>
                ) : (
                  data.stores.map((st: StorePosDetail) => {
                    const hasNaoEntrou = st.nao_entrou_valor > 0;
                    return (
                      <tr
                        key={st.store_id}
                        className="hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-sans font-medium text-zinc-200">
                          {st.store_name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-200">
                          {formatCurrency(st.rede_liquido)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          {formatCurrency(st.ofx_maquininhas)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {hasNaoEntrou ? (
                            <span className="text-amber-400 font-bold">
                              + {formatCurrency(st.nao_entrou_valor)}
                            </span>
                          ) : (
                            <span className="text-zinc-500">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {st.status_compensacao === 'entrou' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={11} /> ENTROU
                            </span>
                          )}
                          {st.status_compensacao === 'parcial' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock size={11} /> PARCIAL
                            </span>
                          )}
                          {st.status_compensacao === 'nao_entrou' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle size={11} /> NÃO ENTROU
                            </span>
                          )}
                          {st.status_compensacao === 'sem_movimento' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] text-zinc-500">
                              SEM MOVIMENTO
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px] text-zinc-400">
                          {st.ofx_transacoes && st.ofx_transacoes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {st.ofx_transacoes.map((tx, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px]"
                                  title={tx.fitid || tx.counterpart}
                                >
                                  {formatCurrency(tx.amount)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">Nenhum crédito OFX</span>
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
        <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-start gap-2.5">
          <Layers size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-zinc-200">Regra de Contabilização Patrimonial:</strong> Os valores com status <span className="text-amber-300 font-semibold">NÃO ENTROU / PARCIAL</span> já estão somados ao Saldo do Pilar 1 (Saldo Bancos + Cartões a Compensar). Quando o dinheiro cair no extrato bancário no dia seguinte, o status será automaticamente atualizado para <span className="text-emerald-300 font-semibold">ENTROU</span>, sem duplicar o faturamento.
          </div>
        </div>
      </div>
    </Modal>
  );
}
