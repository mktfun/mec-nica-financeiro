import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { StoreRow, supabase } from '@/lib/supabase';
import { PatioManualStoreGrid, EditablePatioOsItem, PaymentMethodOption } from './PatioManualStoreGrid';
import { OcrBatchDropzoneAndPaste } from '../OcrBatchDropzoneAndPaste';
import { OcrBatchProgressBar } from '../OcrBatchProgressBar';
import { OcrBatchReviewGrid } from '../OcrBatchReviewGrid';
import { useOcrOsProcessor, ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';
import { 
  Car, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  Layers, 
  Camera, 
  FileSpreadsheet, 
  Save, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

interface PatioManagementDualModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  stores: StoreRow[];
  onSuccess?: () => void;
  onApplyPatioResults?: (osItems: EditablePatioOsItem[]) => void;
}

export const PatioManagementDualModal: React.FC<PatioManagementDualModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  stores,
  onSuccess,
  onApplyPatioResults,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ocr'>('manual');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [osList, setOsList] = useState<EditablePatioOsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hook OCR
  const { isProcessing, progress, processBatchQueue } = useOcrOsProcessor();
  const [extractedItems, setExtractedItems] = useState<ExtractedOcrOsItem[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);

  // 1. Carregar OSs pendentes do pátio via RPC
  useEffect(() => {
    if (!isOpen) return;

    async function loadPendingPatio() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_pending_patio_os_for_ocr', {
          p_target_date: targetDate || new Date().toISOString().split('T')[0]
        });

        if (!error && data && Array.isArray(data)) {
          const mapped: EditablePatioOsItem[] = data.map((os: any) => ({
            id: os.os_id || os.id || crypto.randomUUID(),
            os_number: String(os.os_number || ''),
            store_id: os.store_id || 'st-01',
            store_name: os.store_name || 'Filial',
            client_name: os.client_name || 'Cliente',
            plate: os.plate || 'S/ PLACA',
            total_value: Number(os.total_value) || 0,
            paid_value: Number(os.paid_value) || 0,
            pending_value: Number(os.pending_value) || 0,
            days_open: Number(os.days_open) || 0,
            opened_at: os.opened_at || targetDate,
            status: (os.status || 'em_aberto') as any,
            payment_method: 'EM_ABERTO',
            pix_transfer_value: 0,
            credit_value: 0,
            debit_value: 0,
            cash_value: 0,
            isModified: false
          }));
          setOsList(mapped);
        } else {
          // Fallback query direto
          const { data: rawList } = await supabase
            .from('patio_os')
            .select('*')
            .order('os_number');

          if (rawList) {
            const mappedFallback: EditablePatioOsItem[] = (rawList as any[]).map(os => ({
              id: os.id,
              os_number: os.os_number,
              store_id: os.store_id || 'st-01',
              store_name: os.store_name || 'Filial',
              client_name: os.client_name || 'Cliente',
              plate: os.plate || 'S/ PLACA',
              total_value: Number(os.total_value) || 0,
              paid_value: Number(os.paid_value) || 0,
              pending_value: Math.max(0, (Number(os.total_value) || 0) - (Number(os.paid_value) || 0)),
              days_open: Number(os.days_open) || 0,
              opened_at: os.opened_at || targetDate,
              status: os.status || 'em_aberto',
              payment_method: (os.payment_method || 'EM_ABERTO') as any,
              pix_transfer_value: Number(os.pix_transfer_value) || 0,
              credit_value: Number(os.credit_value) || 0,
              debit_value: Number(os.debit_value) || 0,
              cash_value: Number(os.cash_value) || 0,
              isModified: false
            })).filter(x => x.pending_value > 0.05 || x.status !== 'finalizada');

            setOsList(mappedFallback);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar OSs de pátio:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPendingPatio();
  }, [isOpen, targetDate]);

  // Alteração de item
  const handleChangeItem = (id: string, updates: Partial<EditablePatioOsItem>) => {
    setOsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates, isModified: true };
      merged.pending_value = Math.max(0, (merged.total_value || 0) - (merged.paid_value || 0));
      return merged;
    }));
  };

  // Quick Pay de 1-Clique
  const handleQuickPay = (id: string, method: PaymentMethodOption) => {
    setOsList(prev => prev.map(item => {
      if (item.id !== id) return item;

      if (method === 'EM_ABERTO') {
        return {
          ...item,
          payment_method: 'EM_ABERTO',
          paid_value: 0,
          pending_value: item.total_value || 0,
          status: 'em_aberto',
          pix_transfer_value: 0,
          credit_value: 0,
          debit_value: 0,
          cash_value: 0,
          isModified: true
        };
      }

      // Quitar 100%
      const fullAmount = item.total_value > 0 ? item.total_value : (item.paid_value || 100);
      return {
        ...item,
        payment_method: method,
        paid_value: fullAmount,
        pending_value: 0,
        status: 'finalizada',
        pix_transfer_value: method === 'PIX' || method === 'TRANSFERENCIA' ? fullAmount : 0,
        credit_value: method === 'CARTAO_CREDITO' ? fullAmount : 0,
        debit_value: method === 'CARTAO_DEBITO' ? fullAmount : 0,
        cash_value: method === 'DINHEIRO' ? fullAmount : 0,
        isModified: true
      };
    }));
  };

  // Adicionar OS Manual
  const handleAddManualOs = (storeId: string, os: Partial<EditablePatioOsItem>) => {
    const newItem: EditablePatioOsItem = {
      id: crypto.randomUUID(),
      os_number: os.os_number || '0000',
      store_id: storeId,
      store_name: os.store_name || stores.find(s => s.id === storeId)?.name || 'Filial',
      client_name: os.client_name || 'Cliente Balcão',
      plate: os.plate || 'S/ PLACA',
      total_value: os.total_value || 0,
      paid_value: os.paid_value || 0,
      pending_value: Math.max(0, (os.total_value || 0) - (os.paid_value || 0)),
      days_open: 0,
      opened_at: targetDate,
      status: os.status || 'em_aberto',
      payment_method: os.payment_method || 'EM_ABERTO',
      pix_transfer_value: os.pix_transfer_value || 0,
      credit_value: os.credit_value || 0,
      debit_value: os.debit_value || 0,
      cash_value: os.cash_value || 0,
      isNewManual: true,
      isModified: true
    };

    setOsList(prev => [newItem, ...prev]);
    toast.success(`OS #${newItem.os_number} inserida no pátio da filial!`);
  };

  // Remover OS Manual inserida
  const handleRemoveManualOs = (id: string) => {
    setOsList(prev => prev.filter(x => x.id !== id));
  };

  // OCR Processing
  const handleStartOcrProcessing = async (images: Array<{ id: string; base64: string; name: string }>) => {
    const itemsToProcess = images.map(img => ({
      ...img,
      storeId: selectedStoreId !== 'ALL' ? selectedStoreId : undefined,
    }));

    const results = await processBatchQueue(itemsToProcess, stores, { batchSize: 2, delayMs: 1500 });
    setExtractedItems(prev => [...prev, ...results]);

    if (results.length > 0) {
      toast.success(`${results.length} print(s) de OS extraído(s) com sucesso via IA!`);
    }
  };

  // OCR Injeção no Pátio
  const handleInjectOcrAll = async () => {
    if (extractedItems.length === 0) return;
    setIsInjecting(true);

    try {
      const byStore: Record<string, any[]> = {};
      extractedItems.forEach(item => {
        if (!byStore[item.store_id]) byStore[item.store_id] = [];
        byStore[item.store_id].push({
          os_number: item.os_number,
          plate: item.plate,
          client_name: item.client_name,
          total_value: item.total_value,
          paid_value: item.paid_value,
          credit_value: item.credit_value,
          debit_value: item.debit_value,
          pix_val: item.pix_transfer_value,
          cash_val: item.cash_value,
          status: item.status,
          raw_status: item.raw_status,
          opened_at: item.opened_at,
          payment_method: item.payment_method
        });
      });

      for (const storeId of Object.keys(byStore)) {
        const records = byStore[storeId];
        await supabase.rpc('batch_upsert_patio_os', {
          p_store_id: storeId,
          p_target_date: targetDate,
          p_os_records: records
        });
      }

      toast.success(`${extractedItems.length} OSs injetadas e conciliadas no banco!`);
      setExtractedItems([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro na injeção OCR:', err);
      toast.error(`Falha ao injetar OCR: ${err.message}`);
    } finally {
      setIsInjecting(false);
    }
  };

  // Salvar Baixas e Pátio Manual
  const handleSaveManualPatio = async () => {
    setIsSaving(true);
    try {
      const modifiedItems = osList.filter(x => x.isModified);

      if (modifiedItems.length > 0) {
        // Agrupar por filial e disparar batch_upsert_patio_os
        const byStore: Record<string, any[]> = {};
        modifiedItems.forEach(item => {
          if (!byStore[item.store_id]) byStore[item.store_id] = [];
          byStore[item.store_id].push({
            os_number: item.os_number,
            plate: item.plate,
            client_name: item.client_name,
            total_value: item.total_value,
            paid_value: item.paid_value,
            credit_value: item.credit_value || (item.payment_method === 'CARTAO_CREDITO' ? item.paid_value : 0),
            debit_value: item.debit_value || (item.payment_method === 'CARTAO_DEBITO' ? item.paid_value : 0),
            pix_val: item.pix_transfer_value || (item.payment_method === 'PIX' ? item.paid_value : 0),
            cash_val: item.cash_value || (item.payment_method === 'DINHEIRO' ? item.paid_value : 0),
            status: item.status,
            raw_status: item.status,
            opened_at: item.opened_at,
            payment_method: item.payment_method
          });
        });

        for (const storeId of Object.keys(byStore)) {
          const records = byStore[storeId];
          await supabase.rpc('batch_upsert_patio_os', {
            p_store_id: storeId,
            p_target_date: targetDate,
            p_os_records: records
          });
        }
      }

      if (onApplyPatioResults) {
        onApplyPatioResults(osList);
      }

      toast.success(`${modifiedItems.length} alterações de OSs e formas de pagamento salvas no pátio!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar pátio manual:', err);
      toast.error(`Erro ao salvar pátio: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPatioAberto = useMemo(() => {
    return osList.reduce((acc, item) => {
      if (item.status === 'finalizada' || item.status === 'cancelada') return acc;
      return acc + Math.max(0, (item.total_value || 0) - (item.paid_value || 0));
    }, 0);
  }, [osList]);

  const totalQuitadasHoje = useMemo(() => {
    return osList.filter(x => x.status === 'finalizada' && x.paid_value > 0).length;
  }, [osList]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-6xl w-full p-6 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* HEADER DO MODAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Car size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Gestão de Pátio & Veículos
              </h3>
              <p className="text-xs text-zinc-400">
                Data: <span className="font-mono text-emerald-400 font-bold">{targetDate}</span> · Baixe as OSs pendentes ou adicione avulsas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* CONTROLE DE ABAS (2 ABAS) */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📋 Registro Manual
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ocr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ocr'
                    ? 'bg-zinc-800 text-indigo-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📸 OCR / Prints {extractedItems.length > 0 && `(${extractedItems.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'manual' ? (
            <PatioManualStoreGrid
              stores={stores}
              selectedStoreId={selectedStoreId}
              onSelectStore={setSelectedStoreId}
              osItems={osList}
              onChangeItem={handleChangeItem}
              onQuickPay={handleQuickPay}
              onAddManualOs={handleAddManualOs}
              onRemoveManualOs={handleRemoveManualOs}
              targetDate={targetDate}
            />
          ) : (
            <div className="space-y-4">
              <OcrBatchDropzoneAndPaste
                onStartProcessing={handleStartOcrProcessing}
                isProcessing={isProcessing}
                selectedStoreName={stores.find(s => s.id === selectedStoreId)?.name}
              />

              <OcrBatchProgressBar progress={progress} isProcessing={isProcessing} />

              <OcrBatchReviewGrid
                items={extractedItems}
                stores={stores}
                onChangeItem={(id, field, value) => {
                  setExtractedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
                }}
                onDeleteItem={(id) => setExtractedItems(prev => prev.filter(item => item.id !== id))}
                onInject={handleInjectOcrAll}
                isInjecting={isInjecting}
                onClearAll={() => setExtractedItems([])}
              />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
          >
            Fechar sem Salvar
          </Button>

          {activeTab === 'manual' && (
            <Button
              type="button"
              onClick={handleSaveManualPatio}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2"
            >
              <Save size={14} />
              {isSaving ? 'Salvando Pátio no Banco...' : 'Confirmar e Salvar Pátio →'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
