import React, { useState, useMemo } from 'react';
import { StoreRow } from '@/lib/supabase';
import { 
  Building2, 
  Car, 
  CreditCard, 
  Banknote, 
  DollarSign, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Calendar,
  Sparkles,
  Zap,
  Check,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
  const [newPlate, setNewPlate] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newTotalValue, setNewTotalValue] = useState<number | ''>('');
  const [newPaidValue, setNewPaidValue] = useState<number | ''>('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethodOption>('PIX');

  // Contadores por Loja
  const storeCounts = useMemo(() => {
    const counts: Record<string, { total: number; pending: number; totalPendingValue: number }> = {};
    stores.forEach(s => {
      counts[s.id] = { total: 0, pending: 0, totalPendingValue: 0 };
    });

    osItems.forEach(item => {
      if (!counts[item.store_id]) {
        counts[item.store_id] = { total: 0, pending: 0, totalPendingValue: 0 };
      }
      counts[item.store_id].total += 1;
      const pendingVal = Math.max(0, (item.total_value || 0) - (item.paid_value || 0));
      if (pendingVal > 0.05 && item.status !== 'finalizada' && item.status !== 'cancelada') {
        counts[item.store_id].pending += 1;
        counts[item.store_id].totalPendingValue += pendingVal;
      }
    });

    return counts;
  }, [stores, osItems]);

  const filteredOsList = useMemo(() => {
    return osItems.filter(item => {
      const matchStore = selectedStoreId === 'ALL' || item.store_id === selectedStoreId;
      if (!matchStore) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.os_number?.toLowerCase().includes(term) ||
        item.plate?.toLowerCase().includes(term) ||
        item.client_name?.toLowerCase().includes(term) ||
        item.store_name?.toLowerCase().includes(term)
      );
    });
  }, [osItems, selectedStoreId, searchTerm]);

  const handleSaveNewOs = () => {
    if (!newOsNumber.trim()) return;
    const storeIdToUse = selectedStoreId !== 'ALL' ? selectedStoreId : (stores[0]?.id || 'st-01');
    const storeName = stores.find(s => s.id === storeIdToUse)?.name || 'Filial';
    const totalVal = Number(newTotalValue) || 0;
    const paidVal = Number(newPaidValue) || 0;
    const status = paidVal >= (totalVal - 0.05) && totalVal > 0 ? 'finalizada' : 'em_aberto';

    onAddManualOs(storeIdToUse, {
      os_number: newOsNumber.trim(),
      plate: newPlate.trim().toUpperCase() || 'S/ PLACA',
      client_name: newClient.trim() || 'Cliente Balcão',
      store_id: storeIdToUse,
      store_name: storeName,
      total_value: totalVal,
      paid_value: paidVal,
      pending_value: Math.max(0, totalVal - paidVal),
      days_open: 0,
      opened_at: targetDate,
      status: status,
      payment_method: newPaymentMethod,
      pix_transfer_value: newPaymentMethod === 'PIX' || newPaymentMethod === 'TRANSFERENCIA' ? paidVal : 0,
      credit_value: newPaymentMethod === 'CARTAO_CREDITO' ? paidVal : 0,
      debit_value: newPaymentMethod === 'CARTAO_DEBITO' ? paidVal : 0,
      cash_value: newPaymentMethod === 'DINHEIRO' ? paidVal : 0,
      isNewManual: true,
      isModified: true
    });

    setNewOsNumber('');
    setNewPlate('');
    setNewClient('');
    setNewTotalValue('');
    setNewPaidValue('');
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. SELETOR DE LOJAS HORIZONTAL COM CONTADORES */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-800 scrollbar-thin">
        <button
          type="button"
          onClick={() => onSelectStore('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedStoreId === 'ALL'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
          }`}
        >
          <Building2 size={13} />
          <span>Todas as Filiais</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            selectedStoreId === 'ALL' ? 'bg-zinc-950 text-emerald-400' : 'bg-zinc-800 text-zinc-300'
          }`}>
            {osItems.length}
          </span>
        </button>

        {stores.map(store => {
          const count = storeCounts[store.id] || { total: 0, pending: 0, totalPendingValue: 0 };
          const isSelected = selectedStoreId === store.id;

          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelectStore(store.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-950/50'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
              }`}
            >
              <span>{store.name.replace(/ - .*/, '')}</span>
              {count.pending > 0 ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-zinc-950 text-emerald-400' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {count.pending}
                </span>
              ) : (
                <CheckCircle2 size={12} className={isSelected ? 'text-zinc-950' : 'text-zinc-600'} />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. TOOLBAR DE BUSCA E AÇÕES RÁPIDAS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por OS, placa ou cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddingNew(prev => !prev)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            {isAddingNew ? 'Cancelar Cadastro' : 'Cadastrar Nova OS Manual'}
          </Button>
        </div>
      </div>

      {/* 3. CARD DE CADASTRO RÁPIDO DE NOVA OS */}
      {isAddingNew && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              Cadastro Rápido de Veículo / OS no Pátio
            </h4>
            <span className="text-[11px] text-zinc-400 font-mono">
              Filial: <strong className="text-zinc-200">{stores.find(s => s.id === (selectedStoreId !== 'ALL' ? selectedStoreId : stores[0]?.id))?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Nº da OS *</label>
              <input
                type="text"
                placeholder="Ex: 48920"
                value={newOsNumber}
                onChange={e => setNewOsNumber(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Placa</label>
              <input
                type="text"
                placeholder="ABC-1234"
                value={newPlate}
                onChange={e => setNewPlate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-zinc-100 uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Cliente / Carro</label>
              <input
                type="text"
                placeholder="Nome do cliente ou modelo"
                value={newClient}
                onChange={e => setNewClient(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newTotalValue}
                onChange={e => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  setNewTotalValue(v);
                  if (newPaidValue === '' || newPaidValue === 0) {
                    setNewPaidValue(v);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Valor Pago Hoje (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPaidValue}
                onChange={e => setNewPaidValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-500/20">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 font-medium">Forma de Pagamento:</span>
              {(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO', 'EM_ABERTO'] as PaymentMethodOption[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNewPaymentMethod(m)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    newPaymentMethod === m
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m === 'CARTAO_CREDITO' ? 'Crédito' :
                   m === 'CARTAO_DEBITO' ? 'Débito' :
                   m === 'DINHEIRO' ? 'Dinheiro' :
                   m === 'EM_ABERTO' ? 'Em Aberto' : m}
                </button>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveNewOs}
              disabled={!newOsNumber.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg"
            >
              Salvar e Inserir no Pátio
            </Button>
          </div>
        </div>
      )}

      {/* 4. TABELA DE OSS COM CHIPS DE PAGAMENTO 1-CLIQUE */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-lg">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] font-semibold uppercase text-zinc-400 font-mono">
              <th className="py-3 px-3">OS / Filial</th>
              <th className="py-3 px-3">Veículo / Cliente</th>
              <th className="py-3 px-3 text-right">Total (R$)</th>
              <th className="py-3 px-3 text-right">Pago Hoje (R$)</th>
              <th className="py-3 px-3 text-right">Saldo Aberto</th>
              <th className="py-3 px-4 text-center">Forma de Pagamento (1-Clique)</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredOsList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans">
                  <Car size={28} className="mx-auto mb-2 text-zinc-600 opacity-60" />
                  Nenhuma ordem de serviço pendente encontrada nesta filial.
                </td>
              </tr>
            ) : (
              filteredOsList.map(item => {
                const pendingValue = Math.max(0, (item.total_value || 0) - (item.paid_value || 0));
                const isFullyPaid = item.paid_value >= (item.total_value - 0.05) && item.total_value > 0;

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-zinc-900/50 transition-colors ${
                      item.isModified ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    {/* OS & Filial */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-100">
                        <span>#{item.os_number}</span>
                        {item.isNewManual && (
                          <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-1 py-0">
                            Manual
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 block truncate max-w-[120px]">
                        {item.store_name}
                      </span>
                    </td>

                    {/* Placa & Cliente */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-zinc-200 text-[11px]">
                        {item.plate || 'S/ PLACA'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                        {item.client_name || 'Cliente'}
                      </div>
                    </td>

                    {/* Valor Total */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-200">
                      <input
                        type="number"
                        step="0.01"
                        value={item.total_value || ''}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          onChangeItem(item.id, { total_value: val, isModified: true });
                        }}
                        className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Valor Pago Hoje */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      <input
                        type="number"
                        step="0.01"
                        value={item.paid_value || ''}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          const newStatus = val >= ((item.total_value || 0) - 0.05) && (item.total_value || 0) > 0 ? 'finalizada' : 'em_aberto';
                          onChangeItem(item.id, { 
                            paid_value: val, 
                            status: newStatus,
                            isModified: true 
                          });
                        }}
                        className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </td>

                    {/* Saldo Aberto */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={pendingValue > 0.05 ? 'text-amber-400' : 'text-zinc-500'}>
                        R$ {pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Forma de Pagamento (Chips de 1-Clique) */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'PIX')}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            item.payment_method === 'PIX'
                              ? 'bg-purple-500 text-white shadow-sm shadow-purple-950/50'
                              : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20'
                          }`}
                          title="Quitar 100% via PIX"
                        >
                          ⚡ PIX
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'CARTAO_CREDITO')}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            item.payment_method === 'CARTAO_CREDITO'
                              ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-950/50'
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20'
                          }`}
                          title="Quitar 100% via Cartão de Crédito"
                        >
                          ⚡ Crédito
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'CARTAO_DEBITO')}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            item.payment_method === 'CARTAO_DEBITO'
                              ? 'bg-teal-500 text-white shadow-sm shadow-teal-950/50'
                              : 'bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20'
                          }`}
                          title="Quitar 100% via Cartão de Débito"
                        >
                          ⚡ Débito
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'DINHEIRO')}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            item.payment_method === 'DINHEIRO'
                              ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-950/50 font-extrabold'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title="Quitar 100% via Dinheiro Espécie (Cofre)"
                        >
                          ⚡ Dinheiro
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'EM_ABERTO')}
                          className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all ${
                            item.payment_method === 'EM_ABERTO' || !item.payment_method
                              ? 'bg-zinc-700 text-zinc-200 font-bold'
                              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Manter em Aberto"
                        >
                          Aberto
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={item.status}
                        onChange={e => onChangeItem(item.id, { status: e.target.value as any, isModified: true })}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border focus:outline-none bg-zinc-900 ${
                          item.status === 'finalizada'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : item.status === 'pago_parcial'
                            ? 'text-sky-400 border-sky-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <option value="finalizada">🟢 Finalizada</option>
                        <option value="pago_parcial">🔵 Pago Parcial</option>
                        <option value="em_aberto">🟡 Em Aberto</option>
                        <option value="cancelada">⚪ Cancelada</option>
                      </select>
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-2 text-center">
                      {item.isNewManual && onRemoveManualOs ? (
                        <button
                          type="button"
                          onClick={() => onRemoveManualOs(item.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remover OS"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onQuickPay(item.id, 'PIX')}
                          className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Quitar 100%"
                        >
                          <Check size={13} />
                        </button>
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
