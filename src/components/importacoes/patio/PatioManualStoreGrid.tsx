import React, { useState, useMemo } from 'react';
import { StoreRow } from '@/lib/supabase';
import { Plus, Search, Trash2, Car, Check, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type PaymentMethodOption = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'BOLETO' | 'TRANSFERENCIA' | 'EM_ABERTO';

export interface EditablePatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pending_value: number;
  days_open: number;
  opened_at: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  payment_method: PaymentMethodOption;
  debit_value?: number;
  credit_value?: number;
  pix_transfer_value?: number;
  cash_value?: number;
  isModified?: boolean;
  isNewManual?: boolean;
}

interface PatioManualStoreGridProps {
  stores: StoreRow[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  osItems: EditablePatioOsItem[];
  onChangeItem: (id: string, updates: Partial<EditablePatioOsItem>) => void;
  onQuickPay: (id: string, method: PaymentMethodOption) => void;
  onAddManualOs: (storeId: string, os: Partial<EditablePatioOsItem>) => void;
  onRemoveManualOs?: (id: string) => void;
  targetDate: string;
}

export const PatioManualStoreGrid: React.FC<PatioManualStoreGridProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  osItems,
  onChangeItem,
  onQuickPay,
  onAddManualOs,
  onRemoveManualOs,
  targetDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOsNumber, setNewOsNumber] = useState('');
  const [newTotalValue, setNewTotalValue] = useState<number | ''>('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethodOption>('PIX');

  const filteredOsList = useMemo(() => {
    return osItems.filter(item => {
      const matchStore = selectedStoreId === 'ALL' || item.store_id === selectedStoreId;
      if (!matchStore) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.os_number?.toLowerCase().includes(term) ||
        item.plate?.toLowerCase().includes(term) ||
        item.client_name?.toLowerCase().includes(term)
      );
    });
  }, [osItems, selectedStoreId, searchTerm]);

  const handleSaveNewOs = () => {
    if (!newOsNumber.trim() || !newTotalValue) return;
    const storeIdToUse = selectedStoreId !== 'ALL' ? selectedStoreId : (stores[0]?.id || 'st-01');
    const storeName = stores.find(s => s.id === storeIdToUse)?.name || 'Filial';
    const totalVal = Number(newTotalValue) || 0;
    const isPaid = newPaymentMethod !== 'EM_ABERTO';

    onAddManualOs(storeIdToUse, {
      os_number: newOsNumber.trim(),
      plate: 'S/ PLACA',
      client_name: 'Cliente Balcão',
      store_id: storeIdToUse,
      store_name: storeName,
      total_value: totalVal,
      paid_value: isPaid ? totalVal : 0,
      pending_value: isPaid ? 0 : totalVal,
      days_open: 0,
      opened_at: targetDate,
      status: isPaid ? 'finalizada' : 'em_aberto',
      payment_method: newPaymentMethod,
      pix_transfer_value: newPaymentMethod === 'PIX' ? totalVal : 0,
      credit_value: newPaymentMethod === 'CARTAO_CREDITO' ? totalVal : 0,
      cash_value: newPaymentMethod === 'DINHEIRO' ? totalVal : 0,
      isNewManual: true,
      isModified: true
    });

    setNewOsNumber('');
    setNewTotalValue('');
    setNewPaymentMethod('PIX');
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Toolbar Minimalista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-400">Filial:</label>
          <select
            value={selectedStoreId}
            onChange={e => onSelectStore(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas as Filiais ({osItems.length})</option>
            {stores.map(store => {
              const count = osItems.filter(i => i.store_id === store.id && i.status !== 'finalizada').length;
              return (
                <option key={store.id} value={store.id}>
                  {store.name.replace(/ - .*/, '')} {count > 0 ? `(${count} pendentes)` : '(0)'}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtrar OS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddingNew(prev => !prev)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
          >
            <Plus size={14} />
            {isAddingNew ? 'Cancelar' : 'Adicionar OS'}
          </Button>
        </div>
      </div>

      {/* 2. Formulário Rápido (3 Campos Apenas) */}
      {isAddingNew && (
        <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-zinc-900/90 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Nova OS Rápida</span>
            <span className="text-[11px] text-zinc-400">
              Filial: <strong className="text-zinc-200">{stores.find(s => s.id === (selectedStoreId !== 'ALL' ? selectedStoreId : stores[0]?.id))?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Nº OS *</label>
              <input
                type="text"
                placeholder="Ex: 48920"
                value={newOsNumber}
                onChange={e => setNewOsNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newTotalValue}
                onChange={e => setNewTotalValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Forma de Pagamento</label>
              <div className="flex items-center gap-1.5 h-9">
                {(['PIX', 'CARTAO_CREDITO', 'DINHEIRO'] as PaymentMethodOption[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setNewPaymentMethod(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      newPaymentMethod === m
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m === 'CARTAO_CREDITO' ? 'Cartão' : m === 'DINHEIRO' ? 'Dinheiro' : 'PIX'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNewOs}
              disabled={!newOsNumber.trim() || !newTotalValue}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
            >
              + Inserir no Pátio
            </Button>
          </div>
        </div>
      )}

      {/* 3. Tabela Limpa de OSs */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] font-semibold uppercase text-zinc-400 font-mono">
              <th className="py-2.5 px-3">OS / Identificação</th>
              <th className="py-2.5 px-3 text-right">Valor (R$)</th>
              <th className="py-2.5 px-4 text-center">Pagamento 1-Clique</th>
              <th className="py-2.5 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredOsList.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500">
                  <Car size={24} className="mx-auto mb-2 text-zinc-600 opacity-60" />
                  Nenhuma ordem de serviço pendente nesta filial.
                </td>
              </tr>
            ) : (
              filteredOsList.map(item => {
                const isPaid = item.paid_value > 0 && item.status === 'finalizada';

                return (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* OS e Loja */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 font-mono font-bold text-zinc-100">
                        <span>#{item.os_number}</span>
                        {item.plate && item.plate !== 'S/ PLACA' && (
                          <span className="text-[10px] font-normal text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {item.plate}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 block truncate max-w-[160px]">
                        {item.store_name}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-100">
                      R$ {Number(item.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* 3 Botões Claros de Pagamento */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, item.payment_method === 'PIX' ? 'EM_ABERTO' : 'PIX')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            item.payment_method === 'PIX'
                              ? 'bg-purple-600 text-white font-bold shadow-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-purple-300 hover:border-purple-500/30'
                          }`}
                        >
                          PIX
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, (item.payment_method === 'CARTAO_CREDITO' || item.payment_method === 'CARTAO_DEBITO') ? 'EM_ABERTO' : 'CARTAO_CREDITO')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            item.payment_method === 'CARTAO_CREDITO' || item.payment_method === 'CARTAO_DEBITO'
                              ? 'bg-indigo-600 text-white font-bold shadow-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/30'
                          }`}
                        >
                          Cartão
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, item.payment_method === 'DINHEIRO' ? 'EM_ABERTO' : 'DINHEIRO')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            item.payment_method === 'DINHEIRO'
                              ? 'bg-emerald-600 text-white font-bold shadow-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/30'
                          }`}
                        >
                          Dinheiro
                        </button>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-2 text-center">
                      {item.isNewManual && onRemoveManualOs ? (
                        <button
                          type="button"
                          onClick={() => onRemoveManualOs(item.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remover OS"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {isPaid ? '🟢 Paga' : '🟡 Aberta'}
                        </span>
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
  );
};
