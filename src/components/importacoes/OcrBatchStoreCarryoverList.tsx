import React, { useState } from 'react';
import { StoreRow } from '@/lib/supabase';
import { ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';
import { 
  Building2, Car, AlertCircle, CheckCircle2, ChevronRight, Copy, Plus, 
  Sparkles, Check, DollarSign, Calendar, MessageSquare, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export interface PendingPatioOsItem {
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
  status: string;
  raw_status?: string;
  isExtraManual?: boolean;
}

interface OcrBatchStoreCarryoverListProps {
  stores: StoreRow[];
  pendingOsList: PendingPatioOsItem[];
  extraOsList: PendingPatioOsItem[];
  extractedItems: ExtractedOcrOsItem[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  onAddExtraOs: (storeId: string, os: Partial<PendingPatioOsItem>) => void;
  onRemoveExtraOs?: (id: string) => void;
  targetDate: string;
}

export const OcrBatchStoreCarryoverList: React.FC<OcrBatchStoreCarryoverListProps> = ({
  stores,
  pendingOsList,
  extraOsList,
  extractedItems,
  selectedStoreId,
  onSelectStore,
  onAddExtraOs,
  onRemoveExtraOs,
  targetDate,
}) => {
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraOsNumber, setExtraOsNumber] = useState('');
  const [extraPlate, setExtraPlate] = useState('');
  const [extraClient, setExtraClient] = useState('');
  const [extraTotal, setExtraTotal] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Combine DB pending OSs + manually added extra OSs
  const allTargetOs = [...pendingOsList, ...extraOsList];

  // Map extracted OS numbers to check matches
  const extractedMap = new Map<string, ExtractedOcrOsItem>();
  extractedItems.forEach(item => {
    extractedMap.set(item.os_number.trim(), item);
  });

  // Group by store
  const osByStore = new Map<string, PendingPatioOsItem[]>();
  allTargetOs.forEach(os => {
    const list = osByStore.get(os.store_id) || [];
    list.push(os);
    osByStore.set(os.store_id, list);
  });

  // Global KPIs
  const totalPendingOsCount = allTargetOs.length;
  const totalCapturedCount = allTargetOs.filter(os => extractedMap.has(os.os_number.trim())).length;
  const totalRemainingCount = totalPendingOsCount - totalCapturedCount;
  const totalPendingAmount = allTargetOs.reduce((acc, os) => acc + (Number(os.pending_value) || Number(os.total_value) || 0), 0);

  // Filtered store OSs
  const activeStoreOsList = selectedStoreId === 'ALL'
    ? allTargetOs
    : (osByStore.get(selectedStoreId) || []);

  const activeStore = stores.find(s => s.id === selectedStoreId);

  // Copy list for WhatsApp Handler
  const handleCopyWhatsAppList = (storeId: string) => {
    const targetStore = stores.find(s => s.id === storeId);
    const storeOs = storeId === 'ALL' ? allTargetOs : (osByStore.get(storeId) || []);
    
    if (storeOs.length === 0) {
      toast.info('Nenhuma OS pendente nesta filial para copiar.');
      return;
    }

    const storeTitle = targetStore ? targetStore.name.toUpperCase() : 'TODAS AS FILIAIS';
    let text = `📋 *GUIA DE COBRANÇA DE PRINTS DE OS - ${storeTitle}*\n`;
    text += `📅 *Fechamento:* ${targetDate}\n`;
    text += `🚨 *Total de OSs a Buscar:* ${storeOs.length} OSs\n\n`;
    text += `*Ordens de Serviço para abrir no Oficina Inteligente e tirar print da aba PAGAMENTOS:*\n`;

    storeOs.forEach((os, idx) => {
      const isCap = extractedMap.has(os.os_number.trim());
      const statusEmoji = isCap ? '✅ [CAPTURADA]' : '⚠️ [PENDENTE]';
      const openVal = formatCurrency(Number(os.pending_value) || Number(os.total_value) || 0);
      const days = os.days_open ? `(${os.days_open} dias em pátio)` : '';
      text += `${idx + 1}️⃣ *OS #${os.os_number}* | Placa: \`${os.plate || 'S/ Placa'}\` | ${os.client_name || 'Cliente'} | *${openVal}* ${days} ${statusEmoji}\n`;
    });

    text += `\n👉 *Instrução:* Abrir cada OS no Oficina Inteligente, entrar na aba *PAGAMENTOS* (onde aparecem as parcelas de Débito/Crédito/PIX) e tirar print completo da tela!`;

    navigator.clipboard.writeText(text);
    toast.success(`Lista de ${storeOs.length} OSs copiada com sucesso para o WhatsApp!`);
  };

  const handleSaveExtraOs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraOsNumber.trim()) {
      toast.error('Informe o número da OS.');
      return;
    }

    const storeIdToUse = selectedStoreId === 'ALL' ? (stores[0]?.id || 'st-01') : selectedStoreId;
    const storeObj = stores.find(s => s.id === storeIdToUse);

    onAddExtraOs(storeIdToUse, {
      os_number: extraOsNumber.trim(),
      plate: (extraPlate || 'S/ Placa').toUpperCase().trim(),
      client_name: extraClient.trim() || 'Cliente Avulso',
      total_value: Number(extraTotal) || 0,
      paid_value: 0,
      pending_value: Number(extraTotal) || 0,
      store_id: storeIdToUse,
      store_name: storeObj?.name || 'Filial',
      days_open: 1,
      opened_at: targetDate,
      status: 'em_aberto',
      isExtraManual: true
    });

    setExtraOsNumber('');
    setExtraPlate('');
    setExtraClient('');
    setExtraTotal('');
    setIsAddingExtra(false);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3">
      {/* Top Mission Header */}
      <div className="pb-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-100">Guia de Missão por Loja</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            {totalCapturedCount} de {totalPendingOsCount} lidas
          </span>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center justify-between text-xs bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
          <div>
            <span className="text-zinc-400 text-[11px]">Pátio a liquidar:</span>
            <p className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(totalPendingAmount)}</p>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 text-[11px]">Pendências:</span>
            <p className={`font-mono font-bold text-xs ${totalRemainingCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalRemainingCount === 0 ? 'Todas Capturadas 🎉' : `${totalRemainingCount} OSs a buscar`}
            </p>
          </div>
        </div>
      </div>

      {/* Store Selector Pills */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onSelectStore('ALL')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
            selectedStoreId === 'ALL'
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm'
              : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 text-zinc-400'
          }`}
        >
          <span>Todas ({totalPendingOsCount})</span>
        </button>

        {stores.map(store => {
          const storeOsList = osByStore.get(store.id) || [];
          const count = storeOsList.length;
          const capturedInStore = storeOsList.filter(os => extractedMap.has(os.os_number.trim())).length;
          const isSelected = selectedStoreId === store.id;

          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelectStore(store.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              <span className="truncate max-w-[100px]">{store.name.split(' - ')[0]}</span>
              {count > 0 ? (
                <span className={`text-[10px] px-1 rounded font-mono ${
                  capturedInStore === count 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {capturedInStore}/{count}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600 font-mono">0</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Store Action Bar: WhatsApp Copy & Add Extra OS */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
        <Button
          type="button"
          size="sm"
          onClick={() => handleCopyWhatsAppList(selectedStoreId)}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs h-8 px-2.5 flex items-center gap-1.5"
          title="Copiar lista de OSs desta filial formatada para WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Copiar WhatsApp</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsAddingExtra(true)}
          className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs h-8 px-2.5 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>+ OS Extra</span>
        </Button>
      </div>

      {/* Form Inline: Add Extra OS */}
      {isAddingExtra && (
        <form onSubmit={handleSaveExtraOs} className="bg-zinc-900 border border-zinc-700/80 rounded-lg p-2.5 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300">Nova OS Extra na Virada:</span>
            <button
              type="button"
              onClick={() => setIsAddingExtra(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              placeholder="Nº OS (ex: 22600)"
              value={extraOsNumber}
              onChange={e => setExtraOsNumber(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="text"
              placeholder="Placa (ex: ABC1234)"
              value={extraPlate}
              onChange={e => setExtraPlate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Nome do Cliente"
              value={extraClient}
              onChange={e => setExtraClient(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor Total R$"
              value={extraTotal}
              onChange={e => setExtraTotal(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3"
            >
              Adicionar ao Checklist
            </Button>
          </div>
        </form>
      )}

      {/* Interactive OS Checklist Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {activeStoreOsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-zinc-800 rounded-lg">
            <Car className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs font-semibold text-zinc-400">Nenhuma OS em pátio nesta filial</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
              Se surgiu uma OS nova hoje, use o botão <strong className="text-zinc-400">+ OS Extra</strong> acima.
            </p>
          </div>
        ) : (
          activeStoreOsList.map(os => {
            const capturedItem = extractedMap.get(os.os_number.trim());
            const isCaptured = !!capturedItem;
            const openAmount = Number(os.pending_value) || Number(os.total_value) || 0;

            return (
              <div
                key={os.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isCaptured
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                    : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Header: OS Number & Status Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      #{os.os_number}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono font-medium">
                      {os.plate || 'S/ Placa'}
                    </span>
                    {os.isExtraManual && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase font-mono">
                        Extra
                      </span>
                    )}
                  </div>

                  {isCaptured ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Capturada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
                      Aguardando Print
                    </span>
                  )}
                </div>

                {/* Client & Values */}
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="truncate max-w-[150px] text-zinc-400" title={os.client_name}>
                    {os.client_name || 'Cliente'}
                  </span>
                  <span className="font-mono font-bold text-zinc-200">
                    {formatCurrency(openAmount)}
                  </span>
                </div>

                {/* Extracted Payments or Waiting Instruction */}
                {isCaptured && capturedItem ? (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-1">
                    {capturedItem.debit_value > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                        Déb: {formatCurrency(capturedItem.debit_value)}
                      </span>
                    )}
                    {capturedItem.credit_value > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 font-mono">
                        Créd: {formatCurrency(capturedItem.credit_value)}
                      </span>
                    )}
                    {capturedItem.pix_transfer_value > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 font-mono">
                        PIX: {formatCurrency(capturedItem.pix_transfer_value)}
                      </span>
                    )}
                    {capturedItem.cash_value > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                        Din: {formatCurrency(capturedItem.cash_value)}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-400 ml-auto font-medium">
                      {capturedItem.status === 'finalizada' ? '🟢 Finalizada' : '🟡 Pago Parcial'}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{os.days_open ? `${os.days_open} dias em pátio` : 'Pátio anterior'}</span>
                    <span className="text-amber-400/80 font-medium">Aba Pagamentos → Print</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
