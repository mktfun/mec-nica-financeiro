import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { JustifiedTransactionItem } from '@/hooks/useJustifiedTransactions';
import { Calculator, CheckCircle2, FileSpreadsheet, Building2, Tag, MessageSquare, ArrowUpRight } from 'lucide-react';

interface FaturamentoAtualBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  mapaMetasAmount: number;
  justifiedTransactions: JustifiedTransactionItem[];
  totalJustified: number;
  totalFaturamentoAtual: number;
}

export function FaturamentoAtualBreakdownModal({
  isOpen,
  onClose,
  selectedDate,
  mapaMetasAmount,
  justifiedTransactions,
  totalJustified,
  totalFaturamentoAtual,
}: FaturamentoAtualBreakdownModalProps) {
  const formattedDate = selectedDate ? selectedDate.split('-').reverse().join('/') : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Composição do Faturamento Atual — ${formattedDate}`} size="lg">
      <div className="space-y-6 text-zinc-200">
        
        {/* Banner Informativo */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-start gap-3">
          <Calculator className="text-emerald-400 shrink-0 mt-0.5" size={22} />
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Cálculo Transparente do Fechamento</h4>
            <p className="text-xs text-zinc-400 mt-1">
              O <strong>Faturamento Atual</strong> é a soma exata do faturamento apurado via <strong>Mapa de Metas</strong> com as <strong>transações justificadas</strong> que deram diferença nas filiais (abatendo da loja e subindo para o faturamento geral).
            </p>
          </div>
        </div>

        {/* Bloco 1: Faturamento Mapa de Metas */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                1. Faturamento Mapa de Metas (Input Manual)
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Valor bruto/odômetro inserido no fechamento das filiais
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-emerald-400">
              {formatCurrency(mapaMetasAmount)}
            </span>
          </div>
        </div>

        {/* Bloco 2: Transações Justificadas */}
        {(() => {
          const revenueItems = justifiedTransactions.filter(tx => tx.impacts_revenue !== false);
          return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    2. Receitas Avulsas / Justificativas ({revenueItems.length})
                  </h4>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  + {formatCurrency(totalJustified)}
                </span>
              </div>

              <div className="overflow-x-auto max-h-60">
                {revenueItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    Nenhuma receita avulsa foi somada nesta data.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-950/80 sticky top-0 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Loja</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Justificativa</th>
                        <th className="p-3 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-sans">
                      {revenueItems.map((tx) => (
                        <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 font-semibold text-zinc-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-zinc-500" />
                              {tx.store_name}
                            </div>
                          </td>
                          <td className="p-3 text-zinc-300 max-w-[180px] truncate" title={tx.title}>
                            {tx.title}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {tx.category}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400 text-[11px] italic max-w-[200px] truncate" title={tx.justification}>
                            {tx.justification || 'Sem observação'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            + {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })()}

        {/* Bloco 3: Total Geral */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              = Total Faturamento Atual
            </span>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Mapa de Metas ({formatCurrency(mapaMetasAmount)}) + Justificativas ({formatCurrency(totalJustified)})
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {formatCurrency(totalFaturamentoAtual)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <Button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs">
            Fechar
          </Button>
        </div>

      </div>
    </Modal>
  );
}
