import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StoreRow } from '@/lib/supabase';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Search, 
  Trash2, 
  Car, 
  Check, 
  X, 
  DollarSign, 
  Sparkles, 
  CreditCard, 
  Smartphone, 
  Banknote,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export type PaymentMethodOption = 
  | 'PIX' 
  | 'CARTAO_CREDITO' 
  | 'CARTAO_DEBITO' 
  | 'DINHEIRO' 
  | 'BOLETO' 
  | 'TRANSFERENCIA' 
  | 'EM_ABERTO';

export type QuickPaymentType = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO';

export type PatioFilterMode = 'outside_report' | 'all';

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
  isMissingFromReport?: boolean;
  isFromReport?: boolean;
}

export interface PatioExcelStoreAccordionProps {
  stores: StoreRow[];
  osItems: EditablePatioOsItem[];
  onChangeItem: (id: string, updates: Partial<EditablePatioOsItem>) => void;
  onAddManualOs: (storeId: string, os: Partial<EditablePatioOsItem>) => void;
  onRemoveManualOs?: (id: string) => void;
  targetDate: string;
  selectedStoreId?: string;
  onSelectStore?: (storeId: string) => void;
  hasReportImported?: boolean;
  defaultFilterMode?: PatioFilterMode;
}

// ----------------------------------------------------------------------------
// COMPONENTE: Mini Popover de Lançamento de Pagamento na Linha
// ----------------------------------------------------------------------------
interface PaymentPopoverProps {
  osItem: EditablePatioOsItem;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (method: QuickPaymentType, amount: number) => void;
  onClearPayments: () => void;
}

const PaymentPopover: React.FC<PaymentPopoverProps> = ({
  osItem,
  isOpen,
  onClose,
  onSavePayment,
  onClearPayments
}) => {
  const [selectedMethod, setSelectedMethod] = useState<QuickPaymentType>('PIX');
  const [inputValue, setInputValue] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, (osItem.total_value || 0) - (osItem.paid_value || 0));

  useEffect(() => {
    if (isOpen) {
      // Sugere o valor restante automaticamente ao abrir
      setInputValue(remaining > 0 ? remaining.toFixed(2) : (osItem.total_value || 0).toFixed(2));
      setSelectedMethod('PIX');
    }
  }, [isOpen, remaining, osItem.total_value]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(numericVal) || numericVal <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    onSavePayment(selectedMethod, numericVal);
    onClose();
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 z-50 w-80 bg-zinc-950 border border-zinc-700/80 rounded-xl shadow-2xl p-4 text-zinc-100 animate-in fade-in zoom-in-95 duration-150 text-left"
    >
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <DollarSign size={14} className="text-emerald-400" />
          <span className="text-xs font-bold text-zinc-200">
            Lançar Pagamento · OS #{osItem.os_number || 'Sem Nº'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleApply} className="space-y-3">
        {/* Escolha do Meio de Pagamento */}
        <div>
          <label className="text-[10px] uppercase font-mono text-zinc-400 block mb-1.5">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMethod('PIX')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedMethod === 'PIX'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone size={12} />
              Pix
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('CARTAO_CREDITO')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedMethod === 'CARTAO_CREDITO'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CreditCard size={12} />
              Crédito
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('CARTAO_DEBITO')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedMethod === 'CARTAO_DEBITO'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CreditCard size={12} />
              Débito
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('DINHEIRO')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedMethod === 'DINHEIRO'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Banknote size={12} />
              Dinheiro
            </button>
          </div>
        </div>

        {/* Input de Valor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-mono text-zinc-400">
              Valor a Lançar (R$)
            </label>
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setInputValue(remaining.toFixed(2))}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Sparkles size={10} />
                Restante: R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">R$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0,00"
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-mono text-zinc-100 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-2">
          {osItem.paid_value > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClearPayments();
                onClose();
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              title="Zerar pagamentos desta OS"
            >
              <RotateCcw size={10} />
              Zerar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 bg-zinc-900 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-sm shadow-emerald-950 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL: PatioExcelStoreAccordion
// ----------------------------------------------------------------------------
export const PatioExcelStoreAccordion: React.FC<PatioExcelStoreAccordionProps> = ({
  stores,
  osItems,
  onChangeItem,
  onAddManualOs,
  onRemoveManualOs,
  targetDate,
  hasReportImported,
  defaultFilterMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  // Contagem de OSs que não vieram no relatório da sessão
  const countOutsideReport = useMemo(() => {
    return osItems.filter(i => i.isMissingFromReport).length;
  }, [osItems]);

  const [filterMode, setFilterMode] = useState<PatioFilterMode>(() => {
    if (defaultFilterMode) return defaultFilterMode;
    return 'all';
  });

  // Atualiza filterMode se houver itens fora do relatório após importação de planilhas
  useEffect(() => {
    if (hasReportImported && countOutsideReport > 0) {
      setFilterMode('outside_report');
    }
  }, [hasReportImported, countOutsideReport]);

  // Armazenamento de Lojas Abertas / Recolhidas via LocalStorage
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('patio_expanded_stores:v2');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    // Por padrão: abre todas as lojas
    const initial: Record<string, boolean> = {};
    stores.forEach((st) => {
      initial[st.id] = true;
    });
    return initial;
  });

  const toggleStore = (storeId: string) => {
    setExpandedStores(prev => {
      const next = { ...prev, [storeId]: !prev[storeId] };
      try {
        localStorage.setItem('patio_expanded_stores:v2', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    stores.forEach(st => { next[st.id] = true; });
    setExpandedStores(next);
    try {
      localStorage.setItem('patio_expanded_stores:v2', JSON.stringify(next));
    } catch (_) {}
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    stores.forEach(st => { next[st.id] = false; });
    setExpandedStores(next);
    try {
      localStorage.setItem('patio_expanded_stores:v2', JSON.stringify(next));
    } catch (_) {}
  };

  // Agrupamento de OSs por Filial
  const osByStore = useMemo(() => {
    const map = new Map<string, EditablePatioOsItem[]>();
    stores.forEach(s => map.set(s.id, []));

    osItems.forEach(item => {
      const list = map.get(item.store_id);
      if (list) {
        list.push(item);
      } else {
        const fallback = map.get(stores[0]?.id);
        if (fallback) fallback.push(item);
      }
    });

    return map;
  }, [stores, osItems]);

  // Totais Globais
  const globalMetrics = useMemo(() => {
    let totalBruto = 0;
    let totalPago = 0;
    let totalAberto = 0;
    let osCount = 0;

    osItems.forEach(item => {
      totalBruto += Number(item.total_value || 0);
      totalPago += Number(item.paid_value || 0);
      osCount++;
    });

    totalAberto = Math.max(0, totalBruto - totalPago);

    return { totalBruto, totalPago, totalAberto, osCount };
  }, [osItems]);

  // Handler de Lançamento no Popover
  const handleApplyPayment = (osItem: EditablePatioOsItem, method: QuickPaymentType, amount: number) => {
    let pix = Number(osItem.pix_transfer_value || 0);
    let cred = Number(osItem.credit_value || 0);
    let deb = Number(osItem.debit_value || 0);
    let cash = Number(osItem.cash_value || 0);

    if (method === 'PIX') pix += amount;
    else if (method === 'CARTAO_CREDITO') cred += amount;
    else if (method === 'CARTAO_DEBITO') deb += amount;
    else if (method === 'DINHEIRO') cash += amount;

    const newPaid = pix + cred + deb + cash;
    const total = Number(osItem.total_value || 0);
    const newPending = Math.max(0, total - newPaid);
    const isFullPaid = newPaid >= total - 0.05 && total > 0;

    let canonicalMethod: PaymentMethodOption = method;
    const countMethods = (pix > 0 ? 1 : 0) + (cred > 0 ? 1 : 0) + (deb > 0 ? 1 : 0) + (cash > 0 ? 1 : 0);
    if (countMethods > 1) {
      canonicalMethod = 'TRANSFERENCIA';
    }

    onChangeItem(osItem.id, {
      pix_transfer_value: pix,
      credit_value: cred,
      debit_value: deb,
      cash_value: cash,
      paid_value: newPaid,
      pending_value: newPending,
      payment_method: canonicalMethod,
      status: isFullPaid ? 'finalizada' : (newPaid > 0 ? 'pago_parcial' : 'em_aberto'),
      isModified: true
    });

    toast.success(`Lançamento de R$ ${amount.toFixed(2)} registrado na OS #${osItem.os_number || 'Sem Nº'}`);
  };

  const handleClearPayments = (osItem: EditablePatioOsItem) => {
    const total = Number(osItem.total_value || 0);
    onChangeItem(osItem.id, {
      pix_transfer_value: 0,
      credit_value: 0,
      debit_value: 0,
      cash_value: 0,
      paid_value: 0,
      pending_value: total,
      payment_method: 'EM_ABERTO',
      status: 'em_aberto',
      isModified: true
    });
    toast.info(`Pagamentos zerados na OS #${osItem.os_number}`);
  };

  // Handler para adicionar nova linha diretamente no final da filial
  const handleAddNewRowForStore = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    const newOsNumber = Math.floor(10000 + Math.random() * 90000).toString();

    onAddManualOs(storeId, {
      id: crypto.randomUUID(),
      os_number: newOsNumber,
      store_id: storeId,
      store_name: store?.name || 'Filial',
      client_name: 'Cliente Balcão',
      plate: 'SEM PLACA',
      total_value: 0,
      paid_value: 0,
      pending_value: 0,
      days_open: 0,
      opened_at: targetDate,
      status: 'em_aberto',
      payment_method: 'EM_ABERTO',
      pix_transfer_value: 0,
      credit_value: 0,
      debit_value: 0,
      cash_value: 0,
      isModified: true,
      isNewManual: true
    });

    // Garante que o accordion da loja fique aberto
    setExpandedStores(prev => ({ ...prev, [storeId]: true }));
    toast.success(`Nova linha de OS adicionada em ${store?.name || 'Filial'}`);
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR DE CONTROLE & BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº da OS, Placa ou Cliente..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* FILTRO: FORA DO RELATÓRIO vs TODAS AS OSs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
            <button
              type="button"
              onClick={() => setFilterMode('outside_report')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'outside_report'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle size={13} className={countOutsideReport > 0 ? 'text-amber-400' : 'text-zinc-500'} />
              <span>Fora do Relatório</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                countOutsideReport > 0 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {countOutsideReport}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers size={13} />
              <span>Todas as OSs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400">
                {osItems.length}
              </span>
            </button>
          </div>
        </div>

        {/* METRICAS GLOBAIS CONSOLIDADAS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">Total OS:</span>
            <span className="font-bold text-zinc-100">
              R$ {globalMetrics.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">Total Pago:</span>
            <span className="font-bold text-emerald-400">
              R$ {globalMetrics.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">Em Aberto:</span>
            <span className="font-bold text-amber-400">
              R$ {globalMetrics.totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer"
            >
              Expandir Tudo
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer"
            >
              Recolher Tudo
            </button>
          </div>
        </div>
      </div>

      {/* BLOCOS EXPANSÍVEIS POR LOJA (ESTILO EXCEL) */}
      <div className="space-y-3">
        {stores.map(store => {
          const storeItems = osByStore.get(store.id) || [];
          const isExpanded = !!expandedStores[store.id];
          const storeMissingCount = storeItems.filter(i => i.isMissingFromReport).length;

          // Filtragem interna por busca e por filterMode
          const filteredItems = storeItems.filter(item => {
            if (filterMode === 'outside_report' && !item.isMissingFromReport) {
              return false;
            }
            if (!searchTerm.trim()) return true;
            const q = searchTerm.toLowerCase();
            return (
              item.os_number.toLowerCase().includes(q) ||
              item.plate.toLowerCase().includes(q) ||
              item.client_name.toLowerCase().includes(q)
            );
          });

          // Totais da Loja
          const storeTotalOs = storeItems.reduce((acc, x) => acc + Number(x.total_value || 0), 0);
          const storeTotalPago = storeItems.reduce((acc, x) => acc + Number(x.paid_value || 0), 0);
          const storeTotalAberto = Math.max(0, storeTotalOs - storeTotalPago);

          return (
            <div 
              key={store.id}
              className="border border-zinc-800/90 rounded-2xl bg-zinc-950/70 overflow-hidden shadow-sm transition-all"
            >
              {/* CABEÇALHO DA LOJA (ACCORDION HEADER) */}
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-zinc-900/60 hover:bg-zinc-900 border-b border-zinc-800/60 cursor-pointer transition-colors"
                onClick={() => toggleStore(store.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-md bg-zinc-800 text-zinc-300">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100 tracking-tight">
                      {store.name}
                    </span>
                    <Badge variant="outline" className="bg-zinc-800/60 border-zinc-700 text-zinc-300 text-[10px] font-mono px-2 py-0.5">
                      {storeItems.length} OS(s)
                    </Badge>
                    {storeMissingCount > 0 && (
                      <Badge className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono px-2 py-0.5 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {storeMissingCount} fora do relatório
                      </Badge>
                    )}
                  </div>
                </div>

                {/* KPIS DA LOJA & BOTÃO ADICIONAR */}
                <div className="flex items-center gap-4 mt-2 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-zinc-400">Total: <strong className="text-zinc-200">R$ {storeTotalOs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    <span className="text-zinc-400">Pago: <strong className="text-emerald-400">R$ {storeTotalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    <span className="text-zinc-400">Aberto: <strong className="text-amber-400">R$ {storeTotalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddNewRowForStore(store.id)}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer h-7"
                  >
                    <Plus size={13} />
                    + Adicionar OS
                  </Button>
                </div>
              </div>

              {/* CORPO DO ACCORDION: TABELA ESTILO PLANILHA EXCEL */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/40 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                        <th className="py-2.5 px-3 w-28">OS</th>
                        <th className="py-2.5 px-3 w-24">Data</th>
                        <th className="py-2.5 px-3 w-32 text-right">Total OS</th>
                        <th className="py-2.5 px-3 w-28 text-right text-emerald-400/90">Pix</th>
                        <th className="py-2.5 px-3 w-28 text-right text-indigo-400/90">Crédito</th>
                        <th className="py-2.5 px-3 w-28 text-right text-blue-400/90">Débito</th>
                        <th className="py-2.5 px-3 w-28 text-right text-amber-400/90">Dinheiro</th>
                        <th className="py-2.5 px-3 w-32 text-right text-emerald-300 font-bold">Total Pago</th>
                        <th className="py-2.5 px-3 w-32 text-right text-amber-300 font-bold">Restante</th>
                        <th className="py-2.5 px-3 w-36 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center bg-zinc-950/40">
                            {filterMode === 'outside_report' ? (
                              <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 py-4">
                                <CheckCircle2 size={24} className="text-emerald-400" />
                                <p className="text-xs font-semibold text-zinc-200">
                                  Todas as OSs desta filial vieram no relatório.
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  Nenhuma ordem pendente de atualização manual em {store.name}.
                                </p>
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic text-xs">
                                Nenhuma OS encontrada para esta loja. Clique em "+ Adicionar OS" para lançar.
                              </span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map(item => {
                          const total = Number(item.total_value || 0);
                          const paid = Number(item.paid_value || 0);
                          const pix = Number(item.pix_transfer_value || 0);
                          const cred = Number(item.credit_value || 0);
                          const deb = Number(item.debit_value || 0);
                          const cash = Number(item.cash_value || 0);
                          const remaining = Math.max(0, total - paid);

                          const isFullyPaid = paid >= total - 0.05 && total > 0;
                          const isPartial = paid > 0 && paid < total - 0.05;

                          // Cores Semânticas de Linha
                          let rowBg = 'hover:bg-zinc-900/40';
                          let leftBorder = 'border-l-2 border-l-transparent';

                          if (isFullyPaid) {
                            rowBg = 'bg-emerald-950/15 hover:bg-emerald-950/25';
                            leftBorder = 'border-l-4 border-l-emerald-500';
                          } else if (isPartial) {
                            rowBg = 'bg-amber-950/15 hover:bg-amber-950/25';
                            leftBorder = 'border-l-4 border-l-amber-500';
                          }

                          return (
                            <tr key={item.id} className={`transition-colors ${rowBg} ${leftBorder}`}>
                              {/* Nº OS */}
                              <td className="py-2 px-3">
                                {item.isNewManual ? (
                                  <input
                                    type="text"
                                    value={item.os_number}
                                    onChange={(e) => onChangeItem(item.id, { os_number: e.target.value, isModified: true })}
                                    placeholder="Nº OS"
                                    className="w-24 px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 font-bold focus:outline-none focus:border-emerald-500"
                                  />
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1 font-bold text-zinc-200">
                                      <span>#{item.os_number}</span>
                                      {item.plate && item.plate !== 'N/I' && item.plate !== 'SEM PLACA' && (
                                        <span className="text-[10px] text-zinc-500 font-normal">({item.plate})</span>
                                      )}
                                    </div>
                                    {item.isMissingFromReport && (
                                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                        <AlertTriangle size={9} />
                                        Fora do Relatório
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Data */}
                              <td className="py-2 px-3 text-zinc-400 text-[11px]">
                                {item.opened_at ? item.opened_at.split('T')[0] : targetDate}
                              </td>

                              {/* Total OS (Edição Direta Estilo Planilha) */}
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <span className="text-[10px] text-zinc-500">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.total_value === 0 && item.isNewManual ? '' : item.total_value}
                                    onChange={(e) => {
                                      const newTotal = parseFloat(e.target.value) || 0;
                                      const newPending = Math.max(0, newTotal - (item.paid_value || 0));
                                      const isFull = (item.paid_value || 0) >= newTotal - 0.05 && newTotal > 0;
                                      onChangeItem(item.id, {
                                        total_value: newTotal,
                                        pending_value: newPending,
                                        status: isFull ? 'finalizada' : (item.paid_value > 0 ? 'pago_parcial' : 'em_aberto'),
                                        isModified: true
                                      });
                                    }}
                                    placeholder="0,00"
                                    className="w-24 text-right px-1.5 py-0.5 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded text-xs font-bold text-zinc-100 focus:outline-none"
                                  />
                                </div>
                              </td>

                              {/* Pix */}
                              <td className="py-2 px-3 text-right">
                                <span className={pix > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                                  R$ {pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Crédito */}
                              <td className="py-2 px-3 text-right">
                                <span className={cred > 0 ? 'text-indigo-400 font-bold' : 'text-zinc-600'}>
                                  R$ {cred.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Débito */}
                              <td className="py-2 px-3 text-right">
                                <span className={deb > 0 ? 'text-blue-400 font-bold' : 'text-zinc-600'}>
                                  R$ {deb.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Dinheiro */}
                              <td className="py-2 px-3 text-right">
                                <span className={cash > 0 ? 'text-amber-400 font-bold' : 'text-zinc-600'}>
                                  R$ {cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Total Pago */}
                              <td className="py-2 px-3 text-right">
                                <span className={`font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                  R$ {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Restante */}
                              <td className="py-2 px-3 text-right">
                                <span className={`font-bold ${remaining > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                                  R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Ações / Lançar Pagamento */}
                              <td className="py-2 px-3 text-center relative">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isFullyPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                      <CheckCircle2 size={12} />
                                      Pago
                                    </span>
                                  ) : null}

                                  {/* Botão de Lançamento */}
                                  <button
                                    type="button"
                                    onClick={() => setActivePopoverId(activePopoverId === item.id ? null : item.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                      isFullyPaid
                                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                        : 'bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 shadow-sm shadow-emerald-950'
                                    }`}
                                  >
                                    {isFullyPaid ? 'Editar' : 'Lançar'}
                                  </button>

                                  {/* Ação Rápida: Dar Baixa se estiver fora do relatório e não quitada */}
                                  {!isFullyPaid && item.isMissingFromReport && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const tot = Number(item.total_value || 0);
                                        onChangeItem(item.id, {
                                          paid_value: tot,
                                          pending_value: 0,
                                          cash_value: tot > 0 && Number(item.cash_value || 0) === 0 && Number(item.pix_transfer_value || 0) === 0 && Number(item.credit_value || 0) === 0 && Number(item.debit_value || 0) === 0 ? tot : item.cash_value,
                                          status: 'finalizada',
                                          isModified: true
                                        });
                                        toast.success(`OS #${item.os_number} baixada com sucesso!`);
                                      }}
                                      className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                                      title="Dar baixa integral nesta OS fora do relatório"
                                    >
                                      <Check size={11} />
                                      Baixar
                                    </button>
                                  )}

                                  {/* Botão Remover se for OS nova avulsa */}
                                  {item.isNewManual && onRemoveManualOs && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveManualOs(item.id)}
                                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Remover OS"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>

                                {/* Mini Popover de Lançamento Flutuante */}
                                <PaymentPopover
                                  osItem={item}
                                  isOpen={activePopoverId === item.id}
                                  onClose={() => setActivePopoverId(null)}
                                  onSavePayment={(method, val) => handleApplyPayment(item, method, val)}
                                  onClearPayments={() => handleClearPayments(item)}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* RODAPÉ DA TABELA COM TOTAIS DA LOJA */}
                    {filteredItems.length > 0 && (
                      <tfoot>
                        <tr className="bg-zinc-900/80 font-bold text-zinc-200 border-t border-zinc-800 text-xs">
                          <td colSpan={2} className="py-2.5 px-3 uppercase font-mono text-[10px] text-zinc-400">
                            Total {store.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            R$ {storeTotalOs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={4} className="py-2.5 px-3 text-center text-zinc-500 font-mono text-[10px]">
                            {storeItems.filter(x => x.paid_value > 0).length} quitadas
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                            R$ {storeTotalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                            R$ {storeTotalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleAddNewRowForStore(store.id)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono hover:underline cursor-pointer"
                            >
                              + Nova linha
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
