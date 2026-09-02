import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import { useOcrOsProcessor, ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';
import { OcrBatchStoreCarryoverList, PendingPatioOsItem } from './OcrBatchStoreCarryoverList';
import { OcrBatchDropzoneAndPaste } from './OcrBatchDropzoneAndPaste';
import { OcrBatchProgressBar } from './OcrBatchProgressBar';
import { OcrBatchReviewGrid } from './OcrBatchReviewGrid';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface OcrBatchOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  onSuccess?: () => void;
}

export const OcrBatchOsModal: React.FC<OcrBatchOsModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  onSuccess,
}) => {
  const { data: stores = [] } = useStores();
  const { isProcessing, progress, processBatchQueue } = useOcrOsProcessor();

  const [pendingOsList, setPendingOsList] = useState<PendingPatioOsItem[]>([]);
  const [extraOsList, setExtraOsList] = useState<PendingPatioOsItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [extractedItems, setExtractedItems] = useState<ExtractedOcrOsItem[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Fetch pending OSs from previous patio closings via RPC
  useEffect(() => {
    if (!isOpen) return;

    async function fetchPendingPatio() {
      setIsLoadingPending(true);
      try {
        const { data, error } = await supabase.rpc('get_pending_patio_os_for_ocr', {
          p_target_date: targetDate || new Date().toISOString().split('T')[0]
        });

        if (error) {
          console.warn('Erro ao chamar RPC get_pending_patio_os_for_ocr, usando fallback:', error);
          // Fallback query
          const { data: fallbackData } = await supabase
            .from('patio_os')
            .select('*')
            .order('os_number');
          
          if (fallbackData) {
            const mapped = (fallbackData as any[]).map(os => ({
              id: os.id,
              os_number: os.os_number,
              store_id: os.store_id || 'st-01',
              store_name: os.store_name || 'Filial',
              client_name: os.client_name || 'Cliente',
              plate: os.plate || 'S/ Placa',
              total_value: Number(os.total_value) || 0,
              paid_value: Number(os.paid_value) || 0,
              pending_value: Math.max(0, (Number(os.total_value) || 0) - (Number(os.paid_value) || 0)),
              days_open: Number(os.days_open) || 1,
              opened_at: os.opened_at || targetDate,
              status: os.status || 'em_aberto',
              raw_status: os.raw_status
            })).filter(x => x.pending_value > 0.05);

            setPendingOsList(mapped);
          }
        } else if (data) {
          setPendingOsList(data as PendingPatioOsItem[]);
        }
      } catch (err) {
        console.error('Falha ao buscar OSs pendentes:', err);
      } finally {
        setIsLoadingPending(false);
      }
    }

    fetchPendingPatio();
  }, [isOpen, targetDate]);

  const handleStartProcessing = async (images: Array<{ id: string; base64: string; name: string }>) => {
    const itemsToProcess = images.map(img => ({
      ...img,
      storeId: selectedStoreId !== 'ALL' ? selectedStoreId : undefined,
    }));

    const results = await processBatchQueue(itemsToProcess, stores, { batchSize: 2, delayMs: 1500 });
    setExtractedItems(prev => [...prev, ...results]);

    if (results.length > 0) {
      toast.success(`${results.length} print(s) extraído(s) com sucesso pelo Mistral Vision!`);
    }
  };

  const handleAddExtraOs = (storeId: string, osData: Partial<PendingPatioOsItem>) => {
    const newExtra: PendingPatioOsItem = {
      id: `extra-${Date.now()}-${osData.os_number}`,
      os_number: String(osData.os_number || '').trim(),
      store_id: storeId,
      store_name: osData.store_name || stores.find(s => s.id === storeId)?.name || 'Filial',
      client_name: osData.client_name || 'Cliente Avulso',
      plate: (osData.plate || 'S/ Placa').toUpperCase(),
      total_value: Number(osData.total_value) || 0,
      paid_value: 0,
      pending_value: Number(osData.total_value) || 0,
      days_open: 1,
      opened_at: targetDate,
      status: 'em_aberto',
      isExtraManual: true
    };

    setExtraOsList(prev => [...prev, newExtra]);
    toast.success(`OS #${newExtra.os_number} adicionada ao checklist de ${newExtra.store_name}!`);
  };

  const handleChangeItem = (id: string, field: keyof ExtractedOcrOsItem, value: any) => {
    setExtractedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setExtractedItems([]);
  };

  // Ingest into Database & Trigger Auto-Match
  const handleInjectAll = async () => {
    if (extractedItems.length === 0) return;
    setIsInjecting(true);

    try {
      // Group by store_id
      const byStore: Record<string, ExtractedOcrOsItem[]> = {};
      extractedItems.forEach((item) => {
        if (!byStore[item.store_id]) byStore[item.store_id] = [];
        byStore[item.store_id].push(item);
      });

      let totalInserted = 0;
      let totalUpdated = 0;

      for (const [storeId, items] of Object.entries(byStore)) {
        const osRecords = items.map((i) => ({
          os_number: i.os_number,
          client_name: i.client_name,
          plate: i.plate,
          total_value: i.total_value,
          paid_value: i.paid_value,
          credit_value: i.credit_value,
          debit_value: i.debit_value,
          pix_transfer_value: i.pix_transfer_value,
          cash_value: i.cash_value,
          payment_method: i.payment_method,
          raw_status: i.raw_status,
          status: i.status,
          opened_at: i.opened_at,
          closed_at: i.closed_at,
        }));

        const { data, error } = await supabase.rpc('batch_upsert_patio_os', {
          p_store_id: storeId,
          p_target_date: targetDate || new Date().toISOString().split('T')[0],
          p_os_records: osRecords,
        });

        if (error) {
          console.error(`Error upserting OSs for store ${storeId}:`, error);
        } else if (data) {
          totalInserted += data.inserted_new_os || 0;
          totalUpdated += data.updated_existing_os || 0;
        }
      }

      // Trigger automatic matching engine with REDE and PIX
      const matchDate = targetDate || new Date().toISOString().split('T')[0];
      await supabase.rpc('auto_match_daily_transactions', { p_date: matchDate }).catch(() => {});

      toast.success(`✅ Ingestão OCR Concluída! ${totalInserted} nova(s) OS(s) inserida(s), ${totalUpdated} atualizada(s) e auto-pareamento com REDE/PIX executado.`);

      setExtractedItems([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar OSs no banco.');
    } finally {
      setIsInjecting(false);
    }
  };

  const selectedStoreName = selectedStoreId !== 'ALL' ? stores.find(s => s.id === selectedStoreId)?.name : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guia Ativo de Cobrança de Prints & Ingestão OCR (Virada de Pátio)"
      size="full"
    >
      <div className="flex flex-col h-[82vh] -mx-6 -my-5 p-4 overflow-y-auto custom-scrollbar bg-zinc-950">
        {/* Header Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 px-2 gap-2">
          <div>
            <p className="text-xs text-zinc-300">
              Data do Fechamento: <span className="font-mono text-indigo-300 font-bold">{targetDate}</span> · Abra cada OS no Oficina Inteligente e dê <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">Ctrl + V</kbd> do print da aba <strong className="text-emerald-400">Pagamentos</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Mistral Pixtral-12B (JSON Mode)
            </span>
          </div>
        </div>

        {/* 2 Columns Body: Left (5 cols: Active Guide) | Right (7 cols: Dropzone + Progress + Grid) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Mission Guide by Store (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <OcrBatchStoreCarryoverList
              stores={stores}
              pendingOsList={pendingOsList}
              extraOsList={extraOsList}
              extractedItems={extractedItems}
              selectedStoreId={selectedStoreId}
              onSelectStore={setSelectedStoreId}
              onAddExtraOs={handleAddExtraOs}
              targetDate={targetDate}
            />
          </div>

          {/* Right Column: Dropzone, Progress & Review Grid (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full space-y-3">
            <OcrBatchDropzoneAndPaste
              onStartProcessing={handleStartProcessing}
              isProcessing={isProcessing}
              selectedStoreName={selectedStoreName}
            />

            <OcrBatchProgressBar progress={progress} isProcessing={isProcessing} />

            <OcrBatchReviewGrid
              items={extractedItems}
              stores={stores}
              onChangeItem={handleChangeItem}
              onDeleteItem={handleDeleteItem}
              onInject={handleInjectAll}
              isInjecting={isInjecting}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
