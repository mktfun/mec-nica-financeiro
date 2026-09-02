import React from 'react';
import { StoreRow } from '@/lib/supabase';
import { ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';
import { Trash2, CheckCircle2, AlertCircle, Sparkles, Building2, CreditCard, Banknote, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OcrBatchReviewGridProps {
  items: ExtractedOcrOsItem[];
  stores: StoreRow[];
  onChangeItem: (id: string, field: keyof ExtractedOcrOsItem, value: any) => void;
  onDeleteItem: (id: string) => void;
  onInject: () => void;
  isInjecting: boolean;
  onClearAll: () => void;
}

export const OcrBatchReviewGrid: React.FC<OcrBatchReviewGridProps> = ({
  items,
  stores,
  onChangeItem,
  onDeleteItem,
  onInject,
  isInjecting,
  onClearAll,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalValueSum = items.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
  const totalDebitSum = items.reduce((sum, item) => sum + (Number(item.debit_value) || 0), 0);
  const totalCreditSum = items.reduce((sum, item) => sum + (Number(item.credit_value) || 0), 0);
  const totalPixSum = items.reduce((sum, item) => sum + (Number(item.pix_transfer_value) || 0), 0);
  const totalCashSum = items.reduce((sum, item) => sum + (Number(item.cash_value) || 0), 0);
  const totalFinalizadas = items.filter(i => i.status === 'finalizada').length;

  if (items.length === 0) return null;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 my-4 space-y-4 animate-in fade-in">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Conferência Rápida das OSs Extraídas ({items.length} itens)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Revise os valores e métodos extraídos do Oficina Inteligente antes de injetar no banco de dados.
          </p>
        </div>

        {/* Small KPIs */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase">Total Geral</span>
            <span className="font-bold text-zinc-100 font-mono">{formatCurrency(totalValueSum)}</span>
          </div>
          {totalDebitSum > 0 && (
            <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs flex flex-col">
              <span className="text-[10px] text-indigo-400 uppercase flex items-center gap-1">
                <CreditCard className="w-2.5 h-2.5" /> Débito REDE
              </span>
              <span className="font-bold text-indigo-200 font-mono">{formatCurrency(totalDebitSum)}</span>
            </div>
          )}
          {totalCreditSum > 0 && (
            <div className="px-2.5 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs flex flex-col">
              <span className="text-[10px] text-sky-400 uppercase flex items-center gap-1">
                <CreditCard className="w-2.5 h-2.5" /> Crédito REDE
              </span>
              <span className="font-bold text-sky-200 font-mono">{formatCurrency(totalCreditSum)}</span>
            </div>
          )}
          {totalPixSum > 0 && (
            <div className="px-2.5 py-1.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-xs flex flex-col">
              <span className="text-[10px] text-teal-400 uppercase flex items-center gap-1">
                <DollarSign className="w-2.5 h-2.5" /> PIX Itaú
              </span>
              <span className="font-bold text-teal-200 font-mono">{formatCurrency(totalPixSum)}</span>
            </div>
          )}
          {totalCashSum > 0 && (
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs flex flex-col">
              <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1">
                <Banknote className="w-2.5 h-2.5" /> Cofre Espécie
              </span>
              <span className="font-bold text-emerald-200 font-mono">{formatCurrency(totalCashSum)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Review Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-[380px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/90 text-zinc-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-2.5">Filial</th>
              <th className="px-3 py-2.5">Nº OS</th>
              <th className="px-3 py-2.5">Cliente / Placa</th>
              <th className="px-3 py-2.5">Valor Total</th>
              <th className="px-3 py-2.5">Desdobramento Pagamentos (Aba Pagto)</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-2 py-2.5 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
            {items.map((item) => {
              return (
                <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                  {/* Store Selector */}
                  <td className="px-3 py-2">
                    <select
                      value={item.store_id}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const sObj = stores.find(x => x.id === sId);
                        onChangeItem(item.id, 'store_id', sId);
                        if (sObj) onChangeItem(item.id, 'store_name', sObj.name);
                      }}
                      className="bg-zinc-900 border border-zinc-700/60 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* OS Number */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.os_number}
                      onChange={(e) => onChangeItem(item.id, 'os_number', e.target.value)}
                      className="w-20 bg-zinc-900 border border-zinc-700/60 text-indigo-300 text-xs font-mono font-bold rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    />
                  </td>

                  {/* Client & Plate */}
                  <td className="px-3 py-2 max-w-[220px]">
                    <div className="truncate font-medium text-zinc-200" title={item.client_name}>
                      {item.client_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {item.plate || 'S/ Placa'}
                      </span>
                      {item.vehicle && <span className="truncate max-w-[110px]">{item.vehicle}</span>}
                    </div>
                  </td>

                  {/* Total Value */}
                  <td className="px-3 py-2 font-mono">
                    <input
                      type="number"
                      step="0.01"
                      value={item.total_value}
                      onChange={(e) => onChangeItem(item.id, 'total_value', Number(e.target.value) || 0)}
                      className="w-24 bg-zinc-900 border border-zinc-700/60 text-emerald-400 text-xs font-mono font-bold rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    />
                  </td>

                  {/* Payments Breakdown */}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {item.debit_value > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                          Déb: {formatCurrency(item.debit_value)}
                        </span>
                      )}
                      {item.credit_value > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                          Créd: {formatCurrency(item.credit_value)}
                        </span>
                      )}
                      {item.pix_transfer_value > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                          PIX: {formatCurrency(item.pix_transfer_value)}
                        </span>
                      )}
                      {item.cash_value > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          Espécie: {formatCurrency(item.cash_value)}
                        </span>
                      )}
                      {item.debit_value === 0 && item.credit_value === 0 && item.pix_transfer_value === 0 && item.cash_value === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          {item.payment_method || 'Aberto em Pátio'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Selector */}
                  <td className="px-3 py-2">
                    <select
                      value={item.status}
                      onChange={(e) => onChangeItem(item.id, 'status', e.target.value)}
                      className={`text-xs rounded px-2 py-1 font-semibold focus:outline-none border ${
                        item.status === 'finalizada'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                          : item.status === 'pago_parcial'
                          ? 'bg-sky-950/60 text-sky-400 border-sky-700/60'
                          : 'bg-amber-950/60 text-amber-400 border-amber-700/60'
                      }`}
                    >
                      <option value="finalizada">🟢 Finalizada</option>
                      <option value="pago_parcial">🔵 Pago Parcial</option>
                      <option value="em_aberto">🟡 Em Aberto</option>
                    </select>
                  </td>

                  {/* Delete Button */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remover item da conferência"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClearAll}
          disabled={isInjecting}
          className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs"
        >
          Descartar Todos
        </Button>

        <Button
          type="button"
          onClick={onInject}
          disabled={isInjecting || items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/60"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          {isInjecting
            ? 'Injetando e Conciliando...'
            : `Injetar ${items.length} OS(s) no Pátio & Auto-Parear com REDE/PIX`}
        </Button>
      </div>
    </div>
  );
};
