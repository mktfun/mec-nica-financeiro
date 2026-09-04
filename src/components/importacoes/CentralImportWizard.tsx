import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/Card';
import { AgentStage, AgentStageItem } from './AgentStageItem';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AgentRunnerModal } from './AgentRunnerModal';
import { MatchManualOsPendente } from './MatchManualOsPendente';
import { MarcoZeroWizard } from './MarcoZeroWizard';
import { AuditoriaPassivoWizard } from './AuditoriaPassivoWizard';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { 
  UploadCloud, CheckCircle2, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft, 
  Database, Search, X, AlertCircle, CreditCard, FileText, 
  Terminal, Sparkles, FileSpreadsheet, RefreshCcw, Loader2, Code2, Copy, Check, Lock, Unlock, Receipt,
  Car
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CentralImportResults, parseCentralImports } from '@/lib/parsers/centralImportManager';
import { traceLog, generateSessionId } from '@/lib/logger';
import { generateDeterministicHash } from '@/lib/parsers/hashUtils';
import { useCentralImport, UnifiedImportResult } from '@/hooks/useCentralImport';
import { useBulkInsertTransactions, useCreateImportBatch, useBulkInsertConciliationMatches } from '@/hooks/useTransactions';
import { useSaveDailySnapshot, usePreviousDaySnapshot } from '@/hooks/useDailySnapshot';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@tanstack/react-router';
import { savePatioOsAndReceivables, ParsedReceivable } from '@/hooks/useImportProcessor';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useContasAPagarImport } from '@/hooks/useContasAPagarImport';
import { useAiSettings } from '@/hooks/useAiSettings';
import { reconcileRedeWithOfxViaGemini } from '@/lib/llm-matcher';
import { Step1UnregisteredPayments } from './wizard/Step1UnregisteredPayments';
import { Step2NonRevenueJustifications } from './wizard/Step2NonRevenueJustifications';
import { Step3CashVaultDaniel } from './wizard/Step3CashVaultDaniel';
import { Step4FinalAuditAndClose } from './wizard/Step4FinalAuditAndClose';
import { RevenueAdjustmentsCard } from './wizard/RevenueAdjustmentsCard';
import { convertOcrToOsImportResults, convertManualPatioToOsImportResults } from '@/lib/parsers/ocrOsAdapter';
import { AssistedRevenueCalculator } from './wizard/AssistedRevenueCalculator';
import { useOcrOsProcessor, ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';
import { OcrBatchStoreCarryoverList, PendingPatioOsItem } from './OcrBatchStoreCarryoverList';
import { OcrBatchDropzoneAndPaste } from './OcrBatchDropzoneAndPaste';
import { OcrBatchProgressBar } from './OcrBatchProgressBar';
import { OcrBatchReviewGrid } from './OcrBatchReviewGrid';
import { PatioManagementDualModal } from './patio/PatioManagementDualModal';
import { PatioManualStoreGrid, EditablePatioOsItem } from './patio/PatioManualStoreGrid';
import { executeAutoMatchingEngine, PendingUnmatchedTransaction } from '@/lib/matchers/autoMatchingEngine';
import { executeExpenseAutoMatching } from '@/lib/expenseMatcher';
import { useQueryClient } from '@tanstack/react-query';
import { ImportExecutionTerminal, ImportLogEntry } from './ImportExecutionTerminal';
import { ExecutionErrorBanner } from './ExecutionErrorBanner';
import { MissingPatioOsEditor, MissingPatioOsEdit } from './MissingPatioOsEditor';
export type { MissingPatioOsEdit };

const INITIAL_STAGES: AgentStage[] = [
  { id: 'os',         title: 'Importando OS do pátio',             status: 'pending', subSteps: [] },
  { id: 'maquininha', title: 'Lendo maquininha / Rede',            status: 'pending', subSteps: [] },
  { id: 'ofx',        title: 'Processando extratos OFX',           status: 'pending', subSteps: [] },
  { id: 'salvar',     title: 'Salvando conciliação no banco',      status: 'pending', subSteps: [] },
  { id: 'auto_healing', title: 'Auditoria Pericial & Auto-Cura',   status: 'pending', subSteps: [] },
];

export function CentralImportWizard({ onCancel, initialDate }: { onCancel: () => void, initialDate?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping } = useStoreFileMappings(stores);
  const { processFiles, isProcessing, results, setResults } = useCentralImport();
  const { mutateAsync: saveTransactions } = useBulkInsertTransactions();
  const { mutateAsync: createImportBatch } = useCreateImportBatch();
  const { mutateAsync: insertConciliationMatches } = useBulkInsertConciliationMatches();
  const saveSnapshot = useSaveDailySnapshot();
  const { saveBills } = useContasAPagarImport();
  const { data: aiSettings } = useAiSettings();

  const [step, setStep] = useState<1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8>(1);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [targetDate, setTargetDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialDate) {
      setTargetDate(initialDate);
    }
  }, [initialDate]);

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [needsFallback, setNeedsFallback] = useState(false);
  const [showMarcoZero, setShowMarcoZero] = useState(false);
  const [hasDailySnapshots, setHasDailySnapshots] = useState(false);
  const [manualOsMatches, setManualOsMatches] = useState<{ ofxTx: any, osId: string }[]>([]);
  const [cloudOsData, setCloudOsData] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [unmappedAliases, setUnmappedAliases] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Manual inputs globais
  const [manualDinheiroMp, setManualDinheiroMp] = useState<number>(0);
  const [isDinheiroMpUserEdited, setIsDinheiroMpUserEdited] = useState<boolean>(false);
  const [manualAReceber, setManualAReceber] = useState<number>(0);

  // Encadeamento do Fechamento Anterior
  const { data: previousSnapshot } = usePreviousDaySnapshot(targetDate);
  const [manualFaturamentoMesAnterior, setManualFaturamentoMesAnterior] = useState<number>(0);

  useEffect(() => {
    if (previousSnapshot?.metadata && (previousSnapshot.metadata as any).faturamento_mes_anterior) {
      setManualFaturamentoMesAnterior(Number((previousSnapshot.metadata as any).faturamento_mes_anterior));
    }
  }, [previousSnapshot]);

  const previousOdometro = useMemo(() => {
    if (!previousSnapshot) return 0;
    const meta = (previousSnapshot.metadata as any) || {};
    return Number(meta.odometro_hoje ?? meta.faturamento_anterior ?? meta.odometro_anterior ?? previousSnapshot.faturamento ?? 0);
  }, [previousSnapshot]);

  const previousDinheiroMp = useMemo(() => {
    if (!previousSnapshot) return 0;
    return Number(previousSnapshot.dinheiro_mp || 0);
  }, [previousSnapshot]);

  // Ingestão OCR Embutida (Step 1.5)
  const { isProcessing: isOcrProcessing, progress: ocrProgress, processBatchQueue: processOcrBatchQueue } = useOcrOsProcessor();
  const [step15Tab, setStep15Tab] = useState<'manual' | 'ocr'>('manual');
  const [manualPatioItems, setManualPatioItems] = useState<EditablePatioOsItem[]>([]);
  const [pendingOcrOsList, setPendingOcrOsList] = useState<PendingPatioOsItem[]>([]);
  const [extraOcrOsList, setExtraOcrOsList] = useState<PendingPatioOsItem[]>([]);
  const [selectedOcrStoreId, setSelectedOcrStoreId] = useState<string>('ALL');
  const [extractedOcrItems, setExtractedOcrItems] = useState<ExtractedOcrOsItem[]>([]);
  const [isOcrInjecting, setIsOcrInjecting] = useState<boolean>(false);

  // Motor de Auto-Match em Memória (alimenta o Step 4)
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<PendingUnmatchedTransaction[]>([]);
  const [autoMatchedCount, setAutoMatchedCount] = useState<number>(0);
  const [resolvedMatches, setResolvedMatches] = useState<Array<{ storeId: string; osNumber: string; sourceId: string; type: string; amount: number; paymentMethod: string }>>([]);

  // OSs ausentes / órfãs detectadas para ajuste manual livre
  const [missingOsList, setMissingOsList] = useState<MissingPatioOsEdit[]>([]);
  const [isLoadingMissingOs, setIsLoadingMissingOs] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const updateMissingOs = (id: string, field: 'total_value' | 'paid_value' | 'status', value: any) => {
    setMissingOsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const [missingOsSearch, setMissingOsSearch] = useState('');

  const [isSavingMissingOs, setIsSavingMissingOs] = useState(false);

  // Detecção de OSs ativas no banco que não vieram no relatório importado do mês
  const detectMissingOs = useCallback(async () => {
    const mappedStoreIds = Object.values(mapping).filter(id => id && id !== 'GLOBAL');
    if (mappedStoreIds.length === 0) return;

    setIsLoadingMissingOs(true);
    try {
      const { data: dbActiveOs, error } = await supabase
        .from('patio_os')
        .select('id, os_number, plate, store_id, store_name, total_value, paid_value, status, opened_at, days_open')
        .in('store_id', mappedStoreIds)
        .or('status.ilike.%aberto%,status.ilike.%parcial%,status.ilike.%pendente%,status.eq.ABERTA,status.eq.PENDENTE');

      if (error) {
        console.error("Erro ao buscar OSs ativas no banco:", error);
        return;
      }

      const importedOsNumbersByStore = new Set<string>();
      results.osFiles.filter(f => f.success).forEach(file => {
        const storeId = mapping[file.storeAlias];
        file.osArray.forEach(os => {
          const cleanNum = String(os.os_number || '').trim();
          if (storeId) importedOsNumbersByStore.add(`${storeId}_${cleanNum}`);
          importedOsNumbersByStore.add(cleanNum);
        });
      });

      const normalizeStatus = (st: string): 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada' => {
        const lower = (st || '').toLowerCase();
        if (lower.includes('finaliz') || lower.includes('paga') || lower.includes('conclu')) return 'finalizada';
        if (lower.includes('cancel')) return 'cancelada';
        if (lower.includes('parcial')) return 'pago_parcial';
        return 'em_aberto';
      };

      const missing: MissingPatioOsEdit[] = (dbActiveOs || [])
        .filter(dbOs => {
          const cleanNum = String(dbOs.os_number || '').trim();
          const hasWithStore = importedOsNumbersByStore.has(`${dbOs.store_id}_${cleanNum}`);
          const hasDirect = importedOsNumbersByStore.has(cleanNum);
          return !hasWithStore && !hasDirect;
        })
        .map(dbOs => ({
          id: dbOs.id,
          os_number: String(dbOs.os_number),
          plate: dbOs.plate || '-',
          store_id: dbOs.store_id,
          store_name: dbOs.store_name || stores.find(s => s.id === dbOs.store_id)?.name || 'Loja',
          original_total_value: Number(dbOs.total_value) || 0,
          original_paid_value: Number(dbOs.paid_value) || 0,
          original_status: dbOs.status || 'em_aberto',
          total_value: Number(dbOs.total_value) || 0,
          paid_value: Number(dbOs.paid_value) || 0,
          status: normalizeStatus(dbOs.status),
          opened_at: dbOs.opened_at,
          days_open: dbOs.days_open
        }));

      setMissingOsList(missing);
    } catch (err) {
      console.error("Erro ao detectar OSs ausentes:", err);
    } finally {
      setIsLoadingMissingOs(false);
    }
  }, [mapping, results.osFiles, stores]);

  useEffect(() => {
    if (step === 2 || step === 2.5 || step === 3) {
      detectMissingOs();
    }
  }, [step, detectMissingOs]);

  const handleSaveAndAdvanceMissingOs = async () => {
    const modified = missingOsList.filter(
      os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
    );
    if (modified.length > 0) {
      setIsSavingMissingOs(true);
      try {
        for (const item of modified) {
          await supabase
            .from('patio_os')
            .update({
              total_value: item.total_value,
              paid_value: item.paid_value,
              status: item.status,
              closed_at: (item.status === 'finalizada' || item.status === 'cancelada') ? targetDate : null,
              last_payment_date: item.paid_value > item.original_paid_value ? targetDate : undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }
        toast.success(`${modified.length} OSs do pátio atualizadas com sucesso!`);
      } catch (e: any) {
        console.error('Erro ao salvar OSs ausentes:', e);
        toast.error('Erro ao salvar atualizações das OSs.');
      } finally {
        setIsSavingMissingOs(false);
      }
    }
    setStep(3);
  };

  // Auto-popula A Receber e Dinheiro MP para a data alvo
  useEffect(() => {
    async function loadDefaultsForDate() {
      try {
        const { data: snap } = await supabase
          .from('daily_snapshots')
          .select('dinheiro_mp, a_receber_manual')
          .eq('date', targetDate)
          .maybeSingle();

        if (snap && snap.dinheiro_mp !== null && snap.dinheiro_mp !== undefined && Number(snap.dinheiro_mp) > 0) {
          if (!isDinheiroMpUserEdited) {
            setManualDinheiroMp(Number(snap.dinheiro_mp));
          }
        } else if (previousSnapshot?.dinheiro_mp !== undefined && previousSnapshot?.dinheiro_mp !== null) {
          if (!isDinheiroMpUserEdited) {
            setManualDinheiroMp(Number(previousSnapshot.dinheiro_mp));
          }
        }

        if (snap && snap.a_receber_manual !== null && snap.a_receber_manual !== undefined && Number(snap.a_receber_manual) > 0) {
          setManualAReceber(Number(snap.a_receber_manual));
        } else if (previousSnapshot?.a_receber_manual !== undefined && previousSnapshot?.a_receber_manual !== null && Number(previousSnapshot.a_receber_manual) > 0) {
          setManualAReceber(Number(previousSnapshot.a_receber_manual));
        } else {
          // Se não houver snapshot anterior nem atual, busca soma dos recebíveis pendentes cadastrados para a data específica
          const { data: recs } = await supabase
            .from('receivables')
            .select('value')
            .eq('date', targetDate)
            .eq('status', 'pendente');

          if (recs && recs.length > 0) {
            const totalRec = recs.reduce((acc, r) => acc + Number(r.value || 0), 0);
            if (totalRec > 0) {
              setManualAReceber(Number(totalRec.toFixed(2)));
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar padrões para targetDate:', err);
      }
    }

    loadDefaultsForDate();
  }, [targetDate, previousSnapshot, isDinheiroMpUserEdited]);

  // Carrega lista de OSs pendentes do pátio para o Step 1.5 (Guia de Missão OCR & Gestão Manual)
  useEffect(() => {
    if (step !== 1.5) return;
    async function fetchOcrPendingPatio() {
      try {
        const { data, error } = await supabase.rpc('get_pending_patio_os_for_ocr', {
          p_target_date: targetDate || new Date().toISOString().split('T')[0]
        });
        if (!error && data) {
          setPendingOcrOsList(data as PendingPatioOsItem[]);
          const mapped: EditablePatioOsItem[] = (data as any[]).map(os => ({
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
          setManualPatioItems(mapped);
        }
      } catch (e) {
        console.warn('Erro ao carregar OSs pendentes para OCR / Manual:', e);
      }
    }
    fetchOcrPendingPatio();
  }, [step, targetDate]);

  const handleChangeManualPatioItem = (id: string, updates: Partial<EditablePatioOsItem>) => {
    setManualPatioItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates, isModified: true };
      merged.pending_value = Math.max(0, (merged.total_value || 0) - (merged.paid_value || 0));
      return merged;
    }));
  };

  const handleQuickPayManualPatioItem = (id: string, method: PaymentMethodOption) => {
    setManualPatioItems(prev => prev.map(item => {
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

  const handleAddManualPatioOs = (storeId: string, os: Partial<EditablePatioOsItem>) => {
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
    setManualPatioItems(prev => [newItem, ...prev]);
    toast.success(`OS #${newItem.os_number} inserida no pátio!`);
  };

  const handleRemoveManualPatioOs = (id: string) => {
    setManualPatioItems(prev => prev.filter(x => x.id !== id));
  };

  const handleStartOcrProcessing = async (images: Array<{ id: string; base64: string; name: string }>) => {
    const itemsToProcess = images.map(img => ({
      ...img,
      storeId: selectedOcrStoreId !== 'ALL' ? selectedOcrStoreId : undefined,
    }));
    const extracted = await processOcrBatchQueue(itemsToProcess, stores, { batchSize: 2, delayMs: 1500 });
    setExtractedOcrItems(prev => [...prev, ...extracted]);
    if (extracted.length > 0) {
      toast.success(`${extracted.length} print(s) extraído(s) com sucesso pelo Mistral Vision!`);
    }
  };

  const handleAddExtraOcrOs = (storeId: string, osData: Partial<PendingPatioOsItem>) => {
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
    setExtraOcrOsList(prev => [...prev, newExtra]);
    toast.success(`OS #${newExtra.os_number} adicionada ao checklist!`);
  };

  const handleChangeOcrItem = (id: string, field: keyof ExtractedOcrOsItem, value: any) => {
    setExtractedOcrItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteOcrItem = (id: string) => {
    setExtractedOcrItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveAndAdvanceOcr = async () => {
    if (extractedOcrItems.length === 0) {
      toast.error('Nenhum print de OS foi extraído ainda.');
      return;
    }
    setIsOcrInjecting(true);
    try {
      // 1. Converter itens OCR em OsImportResult[]
      const convertedOsFiles = convertOcrToOsImportResults(extractedOcrItems, stores, targetDate);
      
      // 2. Persistir IMEDIATAMENTE no banco (patio_os, receivables, store_cash_vault) de forma atômica e resiliente
      for (const file of convertedOsFiles) {
        const storeObj = stores.find(s => s.name === file.storeAlias || s.id === file.storeAlias);
        const storeId = storeObj ? storeObj.id : file.storeAlias;
        const storeName = storeObj ? storeObj.name : file.storeAlias;

        if (storeId && file.osArray.length > 0) {
          await savePatioOsAndReceivables(storeId, storeName, file.osArray, file.receivablesArray || [], targetDate);
        }
      }

      // 3. Dispara auto-pareamento bancário pós-ingestão em background
      try {
        await supabase.rpc('auto_match_daily_transactions', { p_date: targetDate });
      } catch (matchErr) {
        console.warn('Auto match pós OCR:', matchErr);
      }

      // 4. Injetar no estado de results do Wizard de forma não destrutiva
      setResults(prev => ({
        ...prev,
        osFiles: convertedOsFiles
      }));

      // 5. Auto-mapear as lojas das OSs extraídas
      convertedOsFiles.forEach(file => {
        const storeObj = stores.find(s => s.name === file.storeAlias || s.id === file.storeAlias);
        if (storeObj) {
          updateMapping(file.storeAlias, storeObj.id, storeObj.name);
        }
      });

      toast.success(`✅ ${extractedOcrItems.length} OS(s) do OCR salvas no banco de dados e integradas na esteira!`);

      // 6. Se houver outros arquivos (OFX/Rede) com aliases não mapeados, vai pro Step 2; senão vai pro Step 3
      const hasUnmappedOfx = results.ofxResults.some(o => !mapping[o.alias]);
      const hasUnmappedRede = results.redeResults.some(r => r.transactions.some(t => !mapping[t.storeName]));

      if (hasUnmappedOfx || hasUnmappedRede) {
        setStep(2);
      } else {
        setStep(3);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao persistir e integrar OSs do OCR.');
    } finally {
      setIsOcrInjecting(false);
    }
  };

  const handleSaveAndAdvanceStep15 = async () => {
    // Se estiver na aba OCR e tiver prints extraídos
    if (step15Tab === 'ocr' && extractedOcrItems.length > 0) {
      await handleSaveAndAdvanceOcr();
      return;
    }

    // Se estiver na aba Manual e tiver itens modificados
    const modifiedItems = manualPatioItems.filter(x => x.isModified);
    if (modifiedItems.length > 0) {
      setIsOcrInjecting(true);
      try {
        const byStore: Record<string, any[]> = {};
        modifiedItems.forEach(item => {
          if (!byStore[item.store_id]) byStore[item.store_id] = [];
          byStore[item.store_id].push({
            os_number: item.os_number,
            plate: item.plate,
            client_name: item.client_name,
            total_value: item.total_value,
            paid_value: Number(item.paid_value || 0),
            credit_value: Number(item.credit_value || (item.payment_method === 'CARTAO_CREDITO' ? item.paid_value : 0)),
            debit_value: Number(item.debit_value || (item.payment_method === 'CARTAO_DEBITO' ? item.paid_value : 0)),
            pix_val: Number(item.pix_transfer_value || (item.payment_method === 'PIX' ? item.paid_value : 0)),
            cash_val: Number(item.cash_value || (item.payment_method === 'DINHEIRO' ? item.paid_value : 0)),
            status: item.status,
            raw_status: item.status,
            opened_at: item.opened_at || targetDate,
            payment_method: item.payment_method
          });
        });

        for (const storeId of Object.keys(byStore)) {
          await supabase.rpc('batch_upsert_patio_os', {
            p_store_id: storeId,
            p_target_date: targetDate,
            p_os_records: byStore[storeId]
          });
        }

        try {
          await supabase.rpc('auto_match_daily_transactions', { p_date: targetDate });
        } catch (matchErr) {
          console.warn('Auto match pós pátio manual:', matchErr);
        }

        const manualOsFiles = convertManualPatioToOsImportResults(manualPatioItems, stores, targetDate);
        if (manualOsFiles.length > 0) {
          setResults(prev => ({
            ...prev,
            osFiles: manualOsFiles
          }));
        }

        toast.success(`${modifiedItems.length} OS(s) atualizadas com formas de pagamento no pátio!`);
      } catch (err: any) {
        console.error('Erro ao salvar pátio manual no step 1.5:', err);
        toast.error(`Falha ao salvar pátio: ${err.message}`);
      } finally {
        setIsOcrInjecting(false);
      }
    } else if (manualPatioItems.length > 0 && results.osFiles.length === 0) {
      const manualOsFiles = convertManualPatioToOsImportResults(manualPatioItems, stores, targetDate);
      if (manualOsFiles.length > 0) {
        setResults(prev => ({
          ...prev,
          osFiles: manualOsFiles
        }));
      }
    }

    const hasUnmapped = results.ofxResults.some(o => !mapping[o.alias]) ||
                        results.redeResults.some(r => r.transactions.some(t => !mapping[t.storeName]));
    setStep(hasUnmapped ? 2 : 3);
  };

  // Terminal logs state
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const [importStages, setImportStages] = useState<AgentStage[]>(INITIAL_STAGES);
  const [auditTrailUrl, setAuditTrailUrl] = useState<string | null>(null);
  const [saveFinished, setSaveFinished] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { canImport } = useUserPermissions();

  // Manual inputs extras com trava
  const [odometroHoje, setOdometroHoje] = useState<number>(0);
  const [contasManual, setContasManual] = useState<number>(0);
  const [totalRevenueAdjustments, setTotalRevenueAdjustments] = useState<number>(0);
  const [isManualLocked, setIsManualLocked] = useState<boolean>(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [autoHealingData, setAutoHealingData] = useState<any>(null);

  const deltaFaturamentoCalculado = useMemo(() => {
    if (!odometroHoje) return 0;
    if (previousOdometro > 0 && odometroHoje >= previousOdometro) {
      return odometroHoje - previousOdometro;
    }
    return odometroHoje;
  }, [odometroHoje, previousOdometro]);

  // Computados e Hook do Motor de Diagnóstico Pré-Fechamento
  const computedTotalOfxIn = useMemo(() => {
    return results.ofxResults.flatMap(r => r.transactions).filter(t => t.type === 'in').reduce((a, b) => a + b.amount, 0);
  }, [results.ofxResults]);

  const computedTotalPatioEstoque = useMemo(() => {
    let sum = 0;
    results.osFiles.filter(r => r.success).forEach(f => {
      f.osArray.forEach(os => {
        const isPendente = os.status?.toLowerCase().includes('em_aberto') || os.status?.toLowerCase().includes('pago_parcial') || os.status === 'ABERTA' || os.status === 'PENDENTE';
        if (isPendente) {
          sum += Math.max(0, (os.total_value || 0) - (os.paid_value || 0));
        }
      });
    });
    missingOsList.forEach(m => {
      const isPendente = m.status?.toLowerCase().includes('em_aberto') || m.status?.toLowerCase().includes('pago_parcial') || m.status === 'ABERTA' || m.status === 'PENDENTE';
      if (isPendente) {
        sum += Math.max(0, (m.total_value || 0) - (m.paid_value || 0));
      }
    });
    return sum;
  }, [results.osFiles, missingOsList]);

  const computedJurosRede = useMemo(() => {
    return results.redeResults.filter(r => r.success).reduce((acc, r) => {
      return acc + r.transactions.reduce((sum, t) => sum + (t.interest || 0), 0);
    }, 0);
  }, [results.redeResults]);

  // Sincroniza automaticamente o valor de Contas a Pagar quando importado analiticamente
  useEffect(() => {
    if (results.contasPagarResults && results.contasPagarResults.length > 0) {
      const total = results.contasPagarResults.reduce((acc, c) => acc + c.totalAmount, 0);
      if (total > 0) {
        setContasManual(Number(total.toFixed(2)));
      }
    }
  }, [results.contasPagarResults]);

  // Executa pré-matching em memória de saídas bancárias com contas a pagar
  useEffect(() => {
    if (results.ofxResults?.length > 0 && results.contasPagarResults?.length > 0) {
      executeExpenseAutoMatching(results.ofxResults, results.contasPagarResults, mapping, stores);
    }
  }, [results.ofxResults, results.contasPagarResults, mapping, stores]);

  // Helper para resolver a loja correta por mapping direto, conta bancária ou prefixo do arquivo
  const resolveStoreForOfx = useCallback((ofx: { alias: string; fileName?: string }): string => {
    if (mapping[ofx.alias]) return mapping[ofx.alias];

    // 1. Tenta por chave direta de dígitos contínuos
    const cleanDigits = (ofx.alias || '').replace(/\D/g, '');
    if (cleanDigits && mapping[cleanDigits]) return mapping[cleanDigits];

    // 2. Extrai padrão Extrato_{agencia}_{conta} ou {agencia}_{conta} do nome do arquivo ou do alias
    const sourceStr = `${ofx.fileName || ''} ${ofx.alias || ''}`;
    const fileMatch = sourceStr.match(/(\d{4})_(\d{5,8})/);
    if (fileMatch) {
      const agency = fileMatch[1];
      const account = fileMatch[2];
      const combined = `${agency}${account}`;
      if (mapping[combined]) return mapping[combined];
      if (mapping[`${agency}_${account}`]) return mapping[`${agency}_${account}`];
      if (mapping[account]) return mapping[account];
    }

    // 3. Match por 8 a 12 dígitos contínuos
    const acctMatch = ofx.alias.match(/(\d{8,12})/);
    if (acctMatch && mapping[acctMatch[1]]) return mapping[acctMatch[1]];

    // 4. Mnemônicos no nome do arquivo
    if (ofx.fileName) {
      const upper = ofx.fileName.toUpperCase();
      if (upper.includes('_DP') || upper.includes('DOM PEDRO') || upper.includes('DOM_PEDRO')) return 'st-01';
      if (upper.includes('_JAB') || upper.includes('JABAQUARA')) return 'st-02';
      if (upper.includes('_JB') || upper.includes('JORGE') || upper.includes('BERETTA')) return 'st-03';
      if (upper.includes('_MP') || upper.includes('KENNEDY')) return 'st-04';
      if (upper.includes('_EMP') || upper.includes('PIRAPORINHA') || upper.includes('EMPORIO')) return 'st-05';
      if (upper.includes('_BRA') || upper.includes('PLANALTO') || upper.includes('BRASICAR')) return 'st-06';
      if (upper.includes('_CAP') || upper.includes('RUDGE') || upper.includes('CAPAO')) return 'st-07';
      if (upper.includes('_HD') || upper.includes('SANTO ANDRE') || upper.includes('SANTO_ANDRE')) return 'st-08';
      if (upper.includes('_RM') || upper.includes('REI DO MODULO') || upper.includes('MODULO')) return 'st-09';
      if (upper.includes('_MHE') || upper.includes('MAUA') || upper.includes('REI DO OLEO') || upper.includes('REI_DO_OLEO')) return '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
    }
    return '';
  }, [mapping]);

  // Auto-associação e persistência de OFX quando identificados
  useEffect(() => {
    if (results.ofxResults && results.ofxResults.length > 0) {
      results.ofxResults.forEach(ofx => {
        if (!mapping[ofx.alias]) {
          const resolvedId = resolveStoreForOfx(ofx);
          if (resolvedId) {
            const storeObj = stores.find(s => s.id === resolvedId);
            updateMapping(ofx.alias, resolvedId, storeObj?.name);
          }
        }
      });
    }
  }, [results.ofxResults, mapping, resolveStoreForOfx, stores, updateMapping]);

  const handleCloudDataSuccess = (cloudData: any[], fallback: boolean) => {
    setIsAgentModalOpen(false);
    setCloudOsData(cloudData);
    setNeedsFallback(fallback);
    
    if (fallback) {
      toast.success(`${cloudData.length} faturamentos extraídos via OCR/LLM.`);
    } else {
      toast.success(`${cloudData.length} faturamentos encontrados e processados.`);
    }
    
    const aliases = new Set<string>();
    results.osFiles.filter(r => r.success).forEach(r => aliases.add(r.storeAlias));
    results.maquininhaItems.forEach(i => aliases.add(i.storeName));
    results.ofxResults.forEach(o => aliases.add(o.alias));
    results.redeResults.filter(r => r.success).forEach(r => {
      r.transactions.forEach(t => aliases.add(t.storeName));
    });
    
    if (Array.from(aliases).length > 0) {
      setStep(2); // NUNCA pular o mapeamento se houver lojas para mapear
    } else {
      setStep(fallback ? 3.5 : 3);
    }
  };


  
  const updateStage = (stageIdx: number, status: 'pending'|'running'|'success'|'error', subLabel?: string) => {
    setImportStages(prev => {
      if (stageIdx < 0 || stageIdx >= prev.length) return prev; // guard: índice fora do range
      const newStages = prev.map(s => ({ ...s, subSteps: [...s.subSteps] })); // deep clone seguro
      newStages[stageIdx].status = status;
      if (subLabel) {
        newStages[stageIdx].subSteps.push({ id: crypto.randomUUID(), label: subLabel, status });
      }
      return newStages;
    });
  };

  const addLog = (
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    meta?: { source?: ImportLogEntry['source']; error?: any; details?: any }
  ) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    let structuredError: any;
    if (meta?.error) {
      structuredError = {
        code: meta.error.code || meta.error.status || undefined,
        message: meta.error.message || String(meta.error),
        details: meta.error.details || undefined,
        hint: meta.error.hint || undefined,
        stack: meta.error.stack || undefined,
        payload: meta.details
      };
    }

    setImportLogs(prev => [...prev, { 
      id: crypto.randomUUID(), 
      timestamp, 
      type, 
      message,
      source: meta?.source,
      error: structuredError,
      details: meta?.details
    }]);
  };

  useEffect(() => {
    const checkSnapshots = async () => {
      const { count } = await supabase
        .from('daily_snapshots')
        .select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        setHasDailySnapshots(true);
      }
    };
    checkSnapshots();
  }, []);

  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canImport) {
      toast.error('Você não possui permissão para importar arquivos.');
      return;
    }
    if (acceptedFiles.length === 0) return;
    
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    
    traceLog('1_UPLOAD', 'INFO', 'Iniciando processo de importação centralizada', newSessionId, {
      files_received: acceptedFiles.map(f => ({ filename: f.name, size_bytes: f.size }))
    });

    setPendingFiles(acceptedFiles);
    const parsedResults = await processFiles(acceptedFiles, { sessionId: newSessionId });
    
    if (parsedResults) {
      // Auto-Detecção: Se não há planilha de OSs (virada de pátio), avança direto para o Step 1.5 (OCR)
      const hasOsFiles = parsedResults.osFiles && parsedResults.osFiles.filter(r => r.success).length > 0;
      
      if (!hasOsFiles) {
        toast.info('Nenhuma planilha .xls de OS detectada (Virada de Pátio). Avançando automaticamente para Ingestão OCR...', { duration: 4000 });
        setStep(1.5);
        return;
      }

      const aliases = new Set<string>();
      parsedResults.osFiles.filter(r => r.success).forEach(r => aliases.add(r.storeAlias));
      parsedResults.maquininhaItems.forEach(i => aliases.add(i.storeName));
      parsedResults.ofxResults.forEach(o => aliases.add(o.alias));
      parsedResults.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => aliases.add(t.storeName));
      });

      if (aliases.size > 0) {
        setStep(2); // tem lojas para mapear
      } else {
        setStep(3); // sem aliases — vai direto para confirmação
      }
    }
  }, [processFiles]);



  const handleDevAutoLoad = async () => {
    try {
      const { mockFiles } = await import('../../__mocks__/importFiles');
      
      const fileObjects = mockFiles.map((mock: any) => {
        const byteCharacters = atob(mock.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mock.type });
        return new File([blob], mock.name, { type: mock.type });
      });

      onDrop(fileObjects);
    } catch (e) {
      console.error("Erro ao carregar mocks", e);
      addLog("Erro ao carregar mocks. Execute o generate-mocks.mjs", "error");
    }
  };

  

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-ofx': ['.ofx'],
      'text/plain': ['.ofx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf']
    }
  });

  const fetchRealUnmatchedTransactions = async (tDate: string): Promise<PendingUnmatchedTransaction[]> => {
    const storeNameMap = new Map<string, string>();
    stores.forEach(s => storeNameMap.set(s.id, s.name));

    const unmatched: PendingUnmatchedTransaction[] = [];

    try {
      // 1. OFX PIX / Depósitos sem OS (Filtro Estrito por target_date)
      const { data: ofxTxs, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .select('id, store_id, amount, target_date, occurred_at, bank_name, counterpart_name, type, manual_category')
        .eq('target_date', tDate)
        .eq('type', 'in')
        .is('matched_os_number', null);

      if (ofxErr) console.warn('Erro ao consultar ofx_transactions pendentes:', ofxErr);

      (ofxTxs || []).forEach((t: any) => {
        // Se já possui categoria corporativa (Empréstimo, Seguros, Transferência, Rendimento), vai para o Step 2
        if (t.manual_category && t.manual_category !== 'PIX / Recebimento OS') {
          return;
        }

        const desc = `${t.counterpart_name || ''} ${t.bank_name || ''}`.toUpperCase();
        if (desc.includes('REDE') || desc.includes('CIELO') || desc.includes('STONE') || desc.includes('PAGSEGURO') || desc.includes('REND') || desc.includes('APLIC') || desc.includes('EMPREST') || desc.includes('CAPITAL DE GIRO') || desc.includes('SEGURO') || desc.includes('EMPORIO DO OLEO')) {
          return;
        }
        const sid = t.store_id || '';
        unmatched.push({
          id: t.id,
          source: 'ofx_pix',
          storeId: sid,
          storeName: storeNameMap.get(sid) || 'Filial',
          date: t.target_date || tDate,
          description: t.counterpart_name || t.bank_name || 'Depósito Bancário / PIX',
          paymentMethod: 'PIX',
          amount: Math.abs(Number(t.amount || 0)),
          status: 'pendente'
        });
      });

      // 2. Transações REDE sem OS (Filtro Estrito por target_date)
      const { data: posTxs, error: posErr } = await supabase
        .from('pos_transactions')
        .select('id, store_id, net_amount, gross_amount, target_date, occurred_at, payment_method, machine_name')
        .eq('target_date', tDate)
        .is('matched_os_number', null);

      if (posErr) console.warn('Erro ao consultar pos_transactions pendentes:', posErr);

      (posTxs || []).forEach((t: any) => {
        const sid = t.store_id || '';
        unmatched.push({
          id: t.id,
          source: 'rede',
          storeId: sid,
          storeName: storeNameMap.get(sid) || 'Filial',
          date: t.target_date || tDate,
          description: t.machine_name || `Venda Cartão ${t.payment_method || 'REDE'}`.trim(),
          paymentMethod: t.payment_method || 'CARTAO',
          amount: Math.abs(Number(t.net_amount || t.gross_amount || 0)),
          status: 'pendente'
        });
      });
    } catch (err) {
      console.warn('Erro no fetchRealUnmatchedTransactions DB, usando fallback em memória:', err);
    }

    // Fallback inteligente para o motor de match em memória caso o DB ainda não tenha indexado
    if (unmatched.length === 0 && results) {
      const memoryMatch = executeAutoMatchingEngine(results, mapping, stores, tDate);
      return memoryMatch.unmatchedTransactions;
    }

    return unmatched;
  };

  const handleConfirm = async (advanceToWizard: boolean = false) => {
    if (!canImport) {
      toast.error('Você não possui permissão para importar e gravar dados.');
      return;
    }
    setIsSaving(true);
    setStep(8);
    setImportStages(JSON.parse(JSON.stringify(INITIAL_STAGES)));
    setAuditTrailUrl(null);
    setSaveFinished(false);

    try {
      updateStage(0, 'running', 'Iniciando gravação...');
      await new Promise(r => setTimeout(r, 200));

      // 0. Gravar alterações em lote nas OSs ausentes ajustadas manualmente pelo operador
      const modifiedMissingOs = missingOsList.filter(
        os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
      );

      if (modifiedMissingOs.length > 0) {
        addLog(`Atualizando ${modifiedMissingOs.length} OSs ausentes ajustadas manualmente...`, 'info');
        const updatePromises = modifiedMissingOs.map(os => 
          supabase
            .from('patio_os')
            .update({
              total_value: os.total_value,
              paid_value: os.paid_value,
              status: os.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', os.id)
        );
        await Promise.all(updatePromises);
        addLog(`${modifiedMissingOs.length} OSs ausentes atualizadas com sucesso.`, 'success');
      }

      const txsToInsert: any[] = [];
      const storeBankBalances: Record<string, number> = {};
      const storePreviousBalances: Record<string, number> = {};

      // 1. OSs do Pátio e Recebíveis
      const osCountTotal = results.osFiles.filter(r => r.success).reduce((acc, curr) => acc + curr.osArray.length, 0);
      updateStage(0, 'running', `Registrando OSs (${osCountTotal} ordens)...`);
      
      const osPromises = results.osFiles.filter(r => r.success).map(osResult => {
        let store_id: string | null = mapping[osResult.storeAlias];
        if (store_id === 'GLOBAL') store_id = null;
        if (!store_id) return Promise.resolve();
        return savePatioOsAndReceivables(store_id, osResult.storeAlias, osResult.osArray, osResult.receivablesArray || [], targetDate);
      });

      // Maquininha (fallback)
      const maqByStore: Record<string, any[]> = {};
      results.maquininhaItems.forEach(item => {
        let sid: string = mapping[item.storeName] || 'GLOBAL';
        if (!maqByStore[sid]) maqByStore[sid] = [];
        maqByStore[sid].push(item);
      });
      const maqPromises = Object.entries(maqByStore).map(([sid, items]) => {
        const storeName = items[0].storeName;
        const targetSid = sid === 'GLOBAL' ? null : sid;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: 'Cartão Crédito',
          value: item.amount,
          date: item.dateVenda || targetDate,
          due_date: item.dateCredito || targetDate,
          status: 'recebido'
        }));
        return savePatioOsAndReceivables(targetSid, storeName, [], parsedRecs, targetDate);
      });

      // Rede
      const redeCount = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.transactions.length, 0);
      updateStage(1, 'running', `Processando Rede (${redeCount} transações)...`);

      const redeByStore: Record<string, any[]> = {};
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => {
          let sid: string = mapping[t.storeName] || 'GLOBAL';
          if (!redeByStore[sid]) redeByStore[sid] = [];
          redeByStore[sid].push(t);
        });
      });
      const redePromises = Object.entries(redeByStore).map(([sid, items]) => {
        const storeName = items[0].storeName;
        const targetSid = sid === 'GLOBAL' ? null : sid;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: item.method,
          value: item.netAmount,
          date: item.date || targetDate,
          due_date: item.date || targetDate,
          status: 'recebido'
        }));
        return savePatioOsAndReceivables(targetSid, storeName, [], parsedRecs, targetDate);
      });

      await Promise.all([...osPromises, ...maqPromises, ...redePromises]);
      updateStage(0, 'success', 'OSs e Recebíveis salvos!');
      updateStage(1, 'success', 'Maquininhas processadas!');
      
      // Snapshot Na Loja OS Canônico direto de patio_os (Spec 270)
      const { data: activePatio } = await supabase
        .from('patio_os')
        .select('store_id, total_value, paid_value, status')
        .lte('opened_at', `${targetDate}T23:59:59`);

      if (activePatio) {
        const activeList = activePatio.filter(os => {
          const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
          const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
          return !isClosed && saldo > 0;
        });

        const totalPatioReal = activeList.reduce((acc, os) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

        // Atualiza daily_snapshots.total_patio
        await supabase
          .from('daily_snapshots')
          .upsert({
            date: targetDate,
            total_patio: totalPatioReal
          }, { onConflict: 'date' });

        // Atualiza reconciliations por loja
        const storeMapTotals: Record<string, number> = {};
        activeList.forEach(os => {
          if (os.store_id) {
            storeMapTotals[os.store_id] = (storeMapTotals[os.store_id] || 0) + (Number(os.total_value || 0) - Number(os.paid_value || 0));
          }
        });

        const storeUpdates = Object.entries(storeMapTotals).map(([sid, naLojaOs]) => {
          return supabase.from('reconciliations').upsert({
            store_id: sid,
            date: targetDate,
            na_loja_os: naLojaOs
          }, { onConflict: 'store_id,date' });
        });
        await Promise.all(storeUpdates);
      }
      
      await new Promise(r => setTimeout(r, 200));

      // 2. Transações e OFX
      const ofxCount = results.ofxResults.reduce((acc, curr) => acc + curr.transactions.length, 0);
      updateStage(2, 'running', `Conciliando OFX (${ofxCount} lançamentos)...`);
      addLog(`🏦 Conciliando Extratos OFX (${ofxCount} lançamentos bancários)...`, "info", { source: 'ofx' });

      const validAmounts = new Set<number>();
      results.osFiles.filter(r => r.success).forEach(r => r.osArray.forEach(os => {
        if (os.paid_value) validAmounts.add(os.paid_value);
        if (os.pix_transfer_value) validAmounts.add(os.pix_transfer_value);
      }));

      const storeRedeTotals: Record<string, number> = {};
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(tx => {
          if (tx.netAmount) validAmounts.add(tx.netAmount);
          let sid: string | null = mapping[tx.storeName];
          if (sid) storeRedeTotals[sid] = (storeRedeTotals[sid] || 0) + tx.netAmount;
        });
      });
      Object.values(storeRedeTotals).forEach(total => validAmounts.add(total));

      const autoMatchMap: Record<string, any[]> = {};
      results.osFiles.filter(r => r.success).forEach(osResult => {
         let store_id = mapping[osResult.storeAlias];
         if (store_id === 'GLOBAL') store_id = null;
         if (store_id) {
           if (!autoMatchMap[store_id]) autoMatchMap[store_id] = [];
           autoMatchMap[store_id].push(...osResult.osArray);
         }
      });
      const matchesToInsert: any[] = [];

      // Insere Maquininhas e Rede na tabela transactions para a Conciliação Diária
      Object.entries(maqByStore).forEach(([sid, items]) => {
        const targetSid = sid === 'GLOBAL' ? null : sid;
        items.forEach(item => {
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: targetSid,
            store_name: item.storeName,
            title: item.title || 'Importação Maquininha',
            subtitle: item.storeName,
            amount: item.amount || 0, // Fallback/Legacy
            gross_amount: item.amount || 0,
            fee_amount: 0,
            type: 'in',
            occurred_at: `${targetDate}T12:00:00Z`,
            target_date: targetDate,
            icon_type: 'card',
            source: 'maquininha',
            dedup_hash: generateDeterministicHash(targetDate, item.amount || 0, item.title || 'Importação Maquininha', 'pos')
          });
        });
      });

      Object.entries(redeByStore).forEach(([sid, items]) => {
        const targetSid = sid === 'GLOBAL' ? null : sid;
        items.forEach((item, idx) => {
          const uniqueId = item.nsu 
            ? `nsu_${item.nsu}_${item.authorization || ''}`
            : (item.authorization ? `auth_${item.authorization}` : (item.tid ? `tid_${item.tid}` : `${item.method || 'rede'}_${item.grossAmount || 0}_${idx}`));
          
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: targetSid,
            store_name: item.storeName,
            title: item.title || (item.nsu ? `Rede NSU ${item.nsu}` : 'Importação Rede'),
            subtitle: item.storeName,
            amount: item.netAmount || 0,
            gross_amount: item.grossAmount || item.netAmount || 0,
            fee_amount: item.interest || 0,
            type: 'in',
            occurred_at: item.date || `${targetDate}T12:00:00Z`,
            target_date: targetDate,
            icon_type: 'card',
            source: 'rede',
            dedup_hash: generateDeterministicHash(item.date || targetDate, item.netAmount || 0, `${sid}_${uniqueId}`, 'pos')
          });
        });
      });


      results.ofxResults.forEach(ofx => {
        let store_id: string | null = resolveStoreForOfx(ofx) || mapping[ofx.alias] || null;
        if (store_id === 'GLOBAL') store_id = null;
        const dictKey = store_id || 'global_account';
        
        // Acumula somando saldos para filiais com mais de uma conta
        if (ofx.bankBalance !== undefined) {
          storeBankBalances[dictKey] = (storeBankBalances[dictKey] || 0) + ofx.bankBalance;
        }
        if (ofx.previousBalance !== undefined) {
          storePreviousBalances[dictKey] = (storePreviousBalances[dictKey] || 0) + ofx.previousBalance;
        }

        let globalStoreId: string | null = store_id;
        if (globalStoreId === 'GLOBAL') globalStoreId = null;

        const uniqueOfxTxs = new Map();
        ofx.transactions.forEach((tx: any) => {
          // fitid is now already the deterministic hash generated by ofxParser, but we use it safely
          let fitidToUse = tx.fitid;
          uniqueOfxTxs.set(fitidToUse, tx);
        });
        
        Array.from(uniqueOfxTxs.values()).forEach((tx: any) => {
          let matched_store_id = globalStoreId;
          let matched_os_number = null;
          
          if (tx.type === 'in') {
            const isRendimento = /REND|APLIC|RESG|CDB|LCA|LCI|TESOURO|JUROS|IOF|AUT APR/i.test(`${tx.title || ''} ${tx.counterpart_name || ''}`);
            const isAdquirente = /REDE|CIELO|GETNET|STONE|REDECARD|MAST|VISA|ELO|PAGSEGURO|ADQ|CART/i.test(`${tx.title || ''} ${tx.counterpart_name || ''}`);
            const isEligibleForMatch = Number(tx.amount || 0) >= 10.0 && !isRendimento && !isAdquirente;

            let foundMatch = false;
            if (isEligibleForMatch && matched_store_id && autoMatchMap[matched_store_id]) {
              const matchedOs = autoMatchMap[matched_store_id].find(os => {
                 const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                 const pixVal = Number(os.pix_transfer_value || 0) > 0 ? Number(os.pix_transfer_value) : Number(delta || 0);
                 if (pixVal <= 0) return false;
                 return Math.abs(pixVal - Number(tx.amount || 0)) < 0.10;
              });
              if (matchedOs) {
                matched_os_number = matchedOs.os_number;
                autoMatchMap[matched_store_id] = autoMatchMap[matched_store_id].filter(os => os.os_number !== matchedOs.os_number);
                foundMatch = true;
              }
            }
            
            if (isEligibleForMatch && !foundMatch) {
              for (const [s_id, osList] of Object.entries(autoMatchMap)) {
                const matchedOs = osList.find(os => {
                   const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                   const pixVal = Number(os.pix_transfer_value || 0) > 0 ? Number(os.pix_transfer_value) : Number(delta || 0);
                   if (pixVal <= 0) return false;
                   return Math.abs(pixVal - Number(tx.amount || 0)) < 0.10;
                });
                if (matchedOs) {
                  matched_store_id = s_id;
                  matched_os_number = matchedOs.os_number;
                  autoMatchMap[s_id] = osList.filter(os => os.os_number !== matchedOs.os_number);
                  break;
                }
              }
            }
          }
          
          const txId = crypto.randomUUID();
          const isPix = tx.title?.toUpperCase().includes('PIX') ? 'pix' : null;
          const realTxDate = targetDate; // Força a data alvo da conciliação
          txsToInsert.push({
            id: txId,
            store_id: matched_store_id,
            store_name: matched_store_id ? matched_store_id : ofx.alias,
            title: tx.title || 'Importação OFX',
            subtitle: tx.counterpart_name || ofx.alias,
            amount: Math.abs(tx.amount || 0),
            type: (tx.type === 'in' || tx.type === 'income' || tx.amount > 0) ? 'in' : 'out',
            occurred_at: tx.date || targetDate || new Date().toISOString(),
            date: tx.date || targetDate,
            target_date: realTxDate,
            icon_type: 'bank',
            source: 'ofx',
            os_number: matched_os_number,
            fitid: tx.fitid || null,
            cnpj_cpf: tx.cnpj_cpf || null,
            counterpart_name: tx.counterpart_name || null,
            payment_method: isPix,
          });
          
          if (matched_os_number && matched_store_id) {
            matchesToInsert.push({
              store_id: matched_store_id,
              target_date: realTxDate,
              system_os_number: matched_os_number,
              ofx_transaction_id: txId,
              _fitid: tx.fitid || null,
              status: 'perfect_match',
              divergence_amount: 0
            });
          }
        });
      });

      updateStage(2, 'success', 'Extratos processados!');
      updateStage(3, 'running', `Gravando batch de ${txsToInsert.length} transações...`);
      addLog(`⚙️ Gravando batch de ${txsToInsert.length} transações no banco...`, "info", { source: 'database' });
      const batch = await createImportBatch({ target_date: targetDate });
      
      await saveTransactions({ transactions: txsToInsert, storeBankBalances, storePreviousBalances, import_batch_id: batch.id } as any);
      addLog("✅ Transações do extrato e adquirente salvas com sucesso!", "success", { source: 'database' });

      if (matchesToInsert.length > 0) {
        addLog(`🔗 Vinculando ${matchesToInsert.length} pares perfeitos de conciliação...`, "info", { source: 'database' });
        
        try {
          // 1. Coletar fitids para consultar o DB
          const allFitids = Array.from(new Set(
            matchesToInsert.map((m: any) => m._fitid).filter(Boolean)
          ));

          const fitidToDbIdMap = new Map<string, string>();
          if (allFitids.length > 0) {
            const { data: dbTxs } = await supabase
              .from('transactions')
              .select('id, store_id, fitid')
              .in('fitid', allFitids as string[]);

            dbTxs?.forEach((t: any) => {
              if (t.fitid) {
                fitidToDbIdMap.set(`${t.store_id || 'null'}_${t.fitid}`, t.id);
              }
            });
          }

          // 2. Remapear IDs sintéticos para IDs do DB
          const mappedMatches = matchesToInsert.map((m: any) => {
            let realOfxId = m.ofx_transaction_id;
            if (m._fitid) {
              const key = `${m.store_id || 'null'}_${m._fitid}`;
              if (fitidToDbIdMap.has(key)) {
                realOfxId = fitidToDbIdMap.get(key)!;
              }
            }
            return { ...m, ofx_transaction_id: realOfxId };
          });

          // 3. Checagem Física de Existência na tabela transactions
          const checkIds = Array.from(new Set(
            mappedMatches.flatMap((m: any) => [m.ofx_transaction_id, m.rede_transaction_id]).filter(Boolean)
          ));

          let validDbIdSet = new Set<string>();
          if (checkIds.length > 0) {
            const { data: existingTxs } = await supabase
              .from('transactions')
              .select('id')
              .in('id', checkIds as string[]);

            validDbIdSet = new Set(existingTxs?.map((t: any) => t.id) || []);
          }

          const sanitizedMatches = mappedMatches.map((m: any) => ({
            store_id: m.store_id,
            target_date: m.target_date,
            system_os_number: m.system_os_number,
            ofx_transaction_id: (m.ofx_transaction_id && validDbIdSet.has(m.ofx_transaction_id)) ? m.ofx_transaction_id : null,
            rede_transaction_id: (m.rede_transaction_id && validDbIdSet.has(m.rede_transaction_id)) ? m.rede_transaction_id : null,
            status: m.status || 'perfect_match',
            divergence_amount: m.divergence_amount || 0
          }));

          await insertConciliationMatches(sanitizedMatches);
          addLog("✅ Pares de conciliação salvos com sucesso!", "success", { source: 'database' });
        } catch (matchErr: any) {
          console.warn("Aviso ao salvar pares de conciliação:", matchErr);
          addLog(`⚠️ Pares de conciliação salvos parcialmente (transações garantidas no banco).`, "warning", { source: 'database', error: matchErr });
        }
      }

      if (manualOsMatches.length > 0) {
        addLog(`🔧 Dando baixa em ${manualOsMatches.length} OSs do Estoque Passivo...`, "info", { source: 'patio' });
        try {
          const osIds = manualOsMatches.map(m => m.osId);
          await supabase
            .from('estoque_os_pendente')
            .update({ status: 'PAGA', data_baixa: new Date().toISOString() })
            .in('id', osIds);
          addLog("✅ OSs do passivo baixadas com sucesso!", "success", { source: 'patio' });
        } catch (err: any) {
          console.error("Erro ao baixar OS passiva", err);
          addLog("⚠️ Erro ao dar baixa em OSs do passivo.", "warning", { source: 'patio', error: err });
        }
      }

      // Salvar atualizações manuais de OSs ausentes
      if (missingOsList.length > 0) {
        const modifiedMissing = missingOsList.filter(o => 
          o.total_value !== o.original_total_value || 
          o.paid_value !== o.original_paid_value || 
          o.status !== o.original_status
        );

        if (modifiedMissing.length > 0) {
          addLog(`🔧 Atualizando ${modifiedMissing.length} OSs ausentes editadas pelo operador...`, "info", { source: 'patio' });
          for (const item of modifiedMissing) {
            try {
              await supabase
                .from('patio_os')
                .update({
                  total_value: item.total_value,
                  paid_value: item.paid_value,
                  status: item.status,
                  closed_at: (item.status === 'finalizado' || item.status === 'cancelado') ? targetDate : null,
                  last_payment_date: item.paid_value > item.original_paid_value ? targetDate : undefined,
                })
                .eq('id', item.id);
            } catch (err: any) {
              console.warn("Erro ao atualizar OS ausente:", err);
            }
          }
          addLog("✅ OSs ausentes atualizadas com sucesso no banco!", "success", { source: 'patio' });

          // Re-sincroniza o snapshot do pátio e reconciliações com as alterações manuais
          const { data: updatedPatio } = await supabase
            .from('patio_os')
            .select('store_id, total_value, paid_value, status')
            .lte('opened_at', `${targetDate}T23:59:59`);

          if (updatedPatio) {
            const activeList = updatedPatio.filter(os => {
              const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
              const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
              return !isClosed && saldo > 0;
            });

            const totalPatioReal = activeList.reduce((acc, os) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

            await supabase
              .from('daily_snapshots')
              .upsert({ date: targetDate, total_patio: totalPatioReal }, { onConflict: 'date' });

            const storeMapTotals: Record<string, number> = {};
            activeList.forEach(os => {
              if (os.store_id) {
                storeMapTotals[os.store_id] = (storeMapTotals[os.store_id] || 0) + (Number(os.total_value || 0) - Number(os.paid_value || 0));
              }
            });

            const storeUpdates = Object.entries(storeMapTotals).map(([sid, naLojaOs]) => {
              return supabase.from('reconciliations').upsert({
                store_id: sid,
                date: targetDate,
                na_loja_os: naLojaOs
              }, { onConflict: 'store_id,date' });
            });
            await Promise.all(storeUpdates);
          }
        }
      }

      // Log de Importação
      addLog("📋 Atualizando histórico de importação (import_logs)...", "info", { source: 'system' });
      
      const logsByStore = new Map<string, any>();
      
      // Inicializar com as lojas mapeadas
      Object.values(mapping).forEach(sId => {
        if (sId !== 'GLOBAL') {
          logsByStore.set(sId, {
            store_id: sId,
            store_name: Object.keys(mapping).find(k => mapping[k] === sId) || sId,
            target_date: targetDate,
            total_os: 0,
            os_count: 0,
            total_paid_all: 0,
            receivables_count: 0
          });
        }
      });
      
      // Fallback
      if (logsByStore.size === 0) {
          logsByStore.set('GLOBAL', {
              store_id: 'GLOBAL',
              store_name: 'Conciliação Centralizada',
              target_date: targetDate,
              total_os: 0,
              os_count: 0,
              total_paid_all: 0,
              receivables_count: 0
          });
      }

      // Adicionar Faturamento (OSs)
      results.osFiles.filter(r => r.success).forEach(r => {
          let sId = mapping[r.storeAlias] || 'GLOBAL';
          if (!logsByStore.has(sId)) {
             logsByStore.set(sId, { store_id: sId, store_name: r.storeAlias, target_date: targetDate, total_os: 0, os_count: 0, total_paid_all: 0, receivables_count: 0 });
          }
          const log = logsByStore.get(sId)!;
          log.os_count += r.osArray.length;
          log.total_os += r.osArray.reduce((sum, os) => sum + (os.total_value || 0), 0);
      });
      
      // Adicionar Totais Pagos e Recebíveis
      txsToInsert.forEach(t => {
          let sId = t.store_id || 'GLOBAL';
          if (!logsByStore.has(sId)) {
             logsByStore.set(sId, { store_id: sId, store_name: t.store_name || sId, target_date: targetDate, total_os: 0, os_count: 0, total_paid_all: 0, receivables_count: 0 });
          }
          const log = logsByStore.get(sId)!;
          log.total_paid_all += (t.amount || 0);
          if (t.source === 'maquininha' || t.source === 'rede') {
              log.receivables_count += 1;
          }
      });

      const logsToInsert = Array.from(logsByStore.values());

      const { error: upsertErr } = await supabase.from('import_logs').upsert(logsToInsert, { onConflict: 'store_id,target_date' });
      if (upsertErr) console.warn("Erro ao registrar import log", upsertErr);

      // 4. Salvar Daily Snapshot (Valores Globais)
      addLog("Calculando fechamento diario (auto-save)...", "info");
      
      let saldoBancosPositivo = 0;
      let saldoNegativoItau = 0;
      let totalOfxOut = 0;

      results.ofxResults.forEach(ofx => {
        const bal = typeof ofx.bankBalance === 'number' ? ofx.bankBalance : 0;
        if (bal < 0) {
          saldoNegativoItau += Math.abs(bal);
        } else {
          saldoBancosPositivo += bal;
        }
        ofx.transactions.forEach((t: any) => {
          if (t.type === 'out') totalOfxOut += Math.abs(t.amount);
        });
      });

      const saldoBancosLiquido = saldoBancosPositivo - saldoNegativoItau;

      let jurosRedeTotal = 0;
      results.redeResults.forEach(r => {
        if (r.success) {
          r.transactions.forEach(t => {
             jurosRedeTotal += t.interest || 0;
          });
        }
      });

      
      let faturamentoAtual = 0;
      let veiculosPatioValor = 0;
      let reconciliationsToUpsert: any[] = [];
      
      // Process manual and cloud OS data for Patio & Faturamento
      const processOsItems = (items: any[], isManualFallback: boolean) => {
        items.forEach(c => {
          let sId = c.store_id || 'GLOBAL';
          const totalValue = Number(c.valor_original) || Number(c.valor_total) || 0;
          const openValue = Number(c.valor_em_aberto) || 0;
          const paidValue = isManualFallback ? (Number(c.valor_pago) || 0) : (totalValue - openValue);
          
          if (paidValue > 0) faturamentoAtual += paidValue;
          
          const isPendente = isManualFallback ? (openValue > 0 || (totalValue > paidValue)) : (c.status !== 'FIN' && c.status !== 'CAN');
          if (isPendente) {
            const pendente = isManualFallback ? (totalValue - paidValue) : openValue;
            if (pendente > 0) {
              veiculosPatioValor += pendente;
              if (sId !== 'GLOBAL') {
                const existing = reconciliationsToUpsert.find(r => r.store_id === sId);
                if (existing) {
                  existing.na_loja_os = (existing.na_loja_os || 0) + pendente;
                } else {
                  reconciliationsToUpsert.push({
                    store_id: sId,
                    date: targetDate,
                    na_loja_os: pendente,
                    status: 'validated'
                  });
                }
              }
            }
          }
        });
      };

      if (needsFallback && cloudOsData.length > 0) {
         processOsItems(cloudOsData, true);
      } else if (!needsFallback && cloudOsData.length > 0) {
         processOsItems(cloudOsData, false);
      }

      
      results.osFiles.filter(r => r.success).forEach(r => {
        let storePatioValor = 0;
        let sId = mapping[r.storeAlias] || 'GLOBAL';

        r.osArray.forEach(os => {
           const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
           if (delta > 0) faturamentoAtual += delta;
           
           const isPendente = os.status?.toLowerCase().includes('em_aberto') || os.status?.toLowerCase().includes('pago_parcial');
           if (isPendente) {
              const valorPendente = (os.total_value || 0) - (os.paid_value || 0);
              if (valorPendente > 0) storePatioValor += valorPendente;
           }
        });
        
        veiculosPatioValor += storePatioValor;
        if (sId !== 'GLOBAL') {
          reconciliationsToUpsert.push({
            store_id: sId,
            date: targetDate,
            na_loja_os: storePatioValor,
            status: 'validated'
          });
        }
      });

      if (reconciliationsToUpsert.length > 0) {
        addLog("Gravando valores de patio (reconciliations)...", "info");
        await supabase.from('reconciliations').upsert(reconciliationsToUpsert, { onConflict: 'store_id,date' });
      }

      // Calcula o Pátio Global Real incluindo o passivo/histórico de OSs ativas em aberto no banco apenas como fallback se veiculosPatioValor estiver zerado
      try {
        if (veiculosPatioValor === 0) {
          const { data: allActiveOs } = await supabase
            .from('patio_os')
            .select('store_id, total_value, paid_value, status')
            .lte('opened_at', `${targetDate}T23:59:59`)
            .gte('opened_at', `${new Date(new Date(targetDate).getTime() - 90 * 86400000).toISOString().split('T')[0]}`)
            .not('os_number', 'ilike', '%faturamento%')
            .not('os_number', 'ilike', '%fat%');
          if (allActiveOs && allActiveOs.length > 0) {
            const activeList = allActiveOs.filter(os => {
              const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
              const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
              return !isClosed && saldo > 0.05 && Number(os.total_value || 0) < 100000;
            });
            if (activeList.length > 0) {
              const totalPatioReal = activeList.reduce((acc, os) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);
              if (totalPatioReal > 0) {
                veiculosPatioValor = totalPatioReal;
              }
            }
          }
        }
      } catch (patioErr) {
        console.warn("Erro ao consolidar passivo de patio:", patioErr);
      }

      // Salvar Lotes Analíticos de Contas a Pagar
      if (results.contasPagarResults && results.contasPagarResults.length > 0) {
        addLog(`📑 Salvando ${results.contasPagarResults.length} lote(s) de Contas a Pagar no banco...`, "info", { source: 'contas' });
        for (const cResult of results.contasPagarResults) {
          try {
            await saveBills({ parseResult: cResult, targetDate });
            addLog(`✅ ${cResult.totalBills} contas salvas com sucesso! Total: R$ ${cResult.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, "success", { source: 'contas' });
          } catch (cErr: any) {
            console.warn("Erro ao salvar contas a pagar:", cErr);
            addLog(`⚠️ Falha ao salvar contas a pagar: ${cErr.message}`, "warning", { source: 'contas', error: cErr });
          }
        }
      }

      const totalRecebiveis = manualDinheiroMp + manualAReceber;
      const caixaAtualCalculado = saldoBancosPositivo + totalRecebiveis + veiculosPatioValor - saldoNegativoItau;

      addLog("Auto-salvando Fechamento do Dia...", "info");
      const totalImportedContas = results.contasPagarResults?.reduce((acc, c) => acc + c.totalAmount, 0) || 0;
      const finalContasManual = contasManual > 0 ? contasManual : (totalImportedContas > 0 ? totalImportedContas : totalOfxOut);
      const finalFaturamento = odometroHoje > 0 ? odometroHoje : faturamentoAtual;

      // Puxa snapshot anterior para compor DRE completa
      const { data: prevSnap } = await supabase
        .from('daily_snapshots')
        .select('*')
        .lt('date', targetDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isNoOsMode = results.osFiles.filter(r => r.success && r.osArray.length > 0).length === 0;
      const mapaMetasVal = results.mapaMetasResults?.[0]?.totalFaturamento || 0;

      const caixaAnt = Number(prevSnap?.caixa_atual || 0);
      const fatAnt = Number(prevSnap?.faturamento || (prevSnap?.metadata as any)?.odometro_hoje || 0);
      
      let fatOiBase = 0;
      if (!isNoOsMode) {
        fatOiBase = (odometroHoje > 0 && fatAnt > 0 && odometroHoje > fatAnt) ? (odometroHoje - fatAnt) : (odometroHoje > 0 ? odometroHoje : faturamentoAtual);
      } else {
        if (mapaMetasVal > 0) {
          fatOiBase = mapaMetasVal;
        } else if (odometroHoje > 0 && fatAnt > 0 && odometroHoje > fatAnt) {
          fatOiBase = odometroHoje - fatAnt;
        } else {
          fatOiBase = odometroHoje > 0 ? odometroHoje : faturamentoAtual;
        }
      }

      const fatTotalComAjustes = fatOiBase + totalRevenueAdjustments;
      const fluxoCalculado = caixaAtualCalculado - caixaAnt;
      const valorDispCalculado = fatTotalComAjustes - fluxoCalculado;
      const subtotalContasCalculado = finalContasManual + jurosRedeTotal;
      const diferencaCalculada = valorDispCalculado - subtotalContasCalculado;

      try {
        const payload = {
          date: targetDate,
          caixa_atual: caixaAtualCalculado,
          faturamento: finalFaturamento + totalRevenueAdjustments,
          dinheiro_mp: manualDinheiroMp,
          total_recebiveis: totalRecebiveis,
          total_patio: veiculosPatioValor,
          saldo_bancario: saldoBancosLiquido,
          a_receber_manual: manualAReceber,
          faturamento_outros_valor: totalRevenueAdjustments,
          faturamento_outros_desc: totalRevenueAdjustments > 0 ? 'Receitas Extras e Ajustes DRE' : null,
          contas_a_pagar: finalContasManual,
          provisao: 0,
          saldo_negativo_itau: saldoNegativoItau,
          juros_rede: jurosRedeTotal,
          is_closed: true,
          closed_at: new Date().toISOString(),
          notes: isNoOsMode ? 'Fechamento Assistido via Mapa de Metas (Sem Arquivo de OS)' : 'Valores calculados via Importacao Centralizada',
          metadata: {
            caixa_atual: caixaAtualCalculado,
            caixa_anterior: caixaAnt,
            fluxo_caixa: fluxoCalculado,
            faturamento_anterior: fatAnt,
            faturamento_mes_anterior: manualFaturamentoMesAnterior,
            faturamento_oi_base: fatOiBase,
            faturamento_ajustes: totalRevenueAdjustments,
            odometro_hoje: odometroHoje,
            faturamento_periodo: fatTotalComAjustes,
            source_mode: isNoOsMode ? 'mapa_metas' : 'odometro_os',
            has_os_files: !isNoOsMode,
            valor_disp_contas: valorDispCalculado,
            subtotal_contas: subtotalContasCalculado,
            diferenca_final: diferencaCalculada,
            total_saldo_banco: saldoBancosPositivo,
            saldo_bancos_ofx: saldoBancosLiquido,
            saldo_bancos_positivo: saldoBancosPositivo,
            saldo_negativo_itau: saldoNegativoItau,
            dinheiro_mp: manualDinheiroMp,
            a_receber_manual: manualAReceber,
            total_patio: veiculosPatioValor,
            status_geral: Math.abs(diferencaCalculada) <= 50 ? 'approved' : 'divergent',
            is_closed: true,
          }
        };
        await saveSnapshot.mutateAsync(payload);
        addLog("Historico de conciliacao atualizado automaticamente!", "success");
      } catch (snapErr) {
        console.warn("Erro ao salvar daily_snapshot:", snapErr);
        addLog("Aviso: Falha ao gravar fechamento do dia.", "warning");
      }

      addLog("🤖 Pareando Vendas Rede, PIX e Contas a Pagar com OSs em aberto por loja...", "info");
      try {
        const { data: matchData, error: matchErr } = await supabase.rpc('auto_match_daily_transactions', { p_date: targetDate });
        if (matchErr) {
          console.warn("auto_match_daily_transactions retornou erro (não crítico):", matchErr);
          addLog(`Pareamento automático parcial: ${matchErr.message}`, "warning");
        } else {
          const posCount = (matchData as any)?.matched_pos_count || 0;
          const pixCount = (matchData as any)?.matched_pix_count || 0;
          const saidasCount = (matchData as any)?.saidas_result?.matched_saidas_count || 0;
          addLog(`🤖 Pareamento Inteligente Concluído: ${posCount} Venda(s) REDE e ${pixCount} PIX casados com OSs em pátio! (${saidasCount} despesas conciliadas)`, "success");
        }
      } catch (rpcErr: any) {
        console.warn("Erro ao chamar auto_match_daily_transactions:", rpcErr);
        addLog("Pareamento automático finalizado com observações.", "warning");
      }

      // 4.1. Auditoria Inteligente de Cartões & Banco via Google Gemini
      addLog("✨ Executando Auditoria Inteligente de Cartões da Rede via Google Gemini...", "info");
      try {
        const redeEntries = Object.entries(redeByStore);
        if (redeEntries.length > 0) {
          for (const [sId, redeItems] of redeEntries) {
            const storeOfx = results.ofxResults.filter(o => (resolveStoreForOfx(o) || mapping[o.alias]) === sId);
            const ofxCredits = storeOfx.flatMap(o => o.transactions.filter((t: any) => t.type === 'in' || t.amount > 0).map((t: any) => ({
              fitid: t.fitid || '',
              title: t.title || t.memo || '',
              amount: Math.abs(t.amount || 0),
              date: t.date || targetDate
            })));

            const redeSaleItems = redeItems.map(item => ({
              nsu: item.nsu,
              authorization: item.authorization,
              grossAmount: item.grossAmount || item.amount || 0,
              feeAmount: item.interest || item.feeAmount || 0,
              netAmount: item.netAmount || item.amount || 0,
              method: item.method || 'rede',
              dateVenda: item.date || targetDate
            }));

            const reconResult = await reconcileRedeWithOfxViaGemini(
              sId,
              redeItems[0]?.storeName || sId,
              targetDate,
              redeSaleItems,
              ofxCredits,
              aiSettings?.api_key,
              aiSettings?.model || 'gemini-2.5-flash'
            );

            if (reconResult.salesStatus && reconResult.salesStatus.length > 0) {
              const entrouItems = reconResult.salesStatus.filter(s => s.status === 'entrou');
              if (entrouItems.length > 0) {
                await supabase
                  .from('pos_transactions')
                  .update({ settlement_status: 'entrou', settled_date: targetDate })
                  .eq('store_id', sId)
                  .eq('target_date', targetDate);
              }
            }

            if (reconResult.aiUsed) {
              addLog(`🤖 Gemini reconciliou ${reconResult.storeName}: R$ ${reconResult.totalCreditadoOfx.toFixed(2)} confirmados no banco!`, "success");
            }
          }
        }
      } catch (geminiErr: any) {
        console.warn("[Wizard] Erro Gemini:", geminiErr);
      }

      addLog("📸 Sincronizando Fechamento Consolidado do Dia...", "info");
      try {
        const payload = {
          date: targetDate,
          caixa_atual: caixaAtualCalculado,
          faturamento: finalFaturamento,
          dinheiro_mp: manualDinheiroMp,
          total_recebiveis: totalRecebiveis,
          total_patio: veiculosPatioValor,
          saldo_bancario: saldoBancosLiquido,
          a_receber_manual: manualAReceber,
          faturamento_outros_valor: 0,
          contas_a_pagar: finalContasManual,
          provisao: 0,
          saldo_negativo_itau: saldoNegativoItau,
          juros_rede: jurosRedeTotal,
          is_closed: advanceToWizard ? false : true,
          closed_at: advanceToWizard ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            caixa_atual: caixaAtualCalculado,
            caixa_anterior: caixaAnt,
            fluxo_caixa: fluxoCalculado,
            faturamento_anterior: fatAnt,
            faturamento_oi_base: fatOiBase,
            odometro_hoje: odometroHoje,
            faturamento_periodo: fatOiBase,
            valor_disp_contas: valorDispCalculado,
            subtotal_contas: subtotalContasCalculado,
            diferenca_final: diferencaCalculada,
            total_saldo_banco: saldoBancosPositivo,
            saldo_bancos_ofx: saldoBancosLiquido,
            saldo_bancos_positivo: saldoBancosPositivo,
            saldo_negativo_itau: saldoNegativoItau,
            dinheiro_mp: manualDinheiroMp,
            a_receber_manual: manualAReceber,
            total_patio: veiculosPatioValor,
            status_geral: Math.abs(diferencaCalculada) <= 50 ? 'approved' : 'divergent',
            is_closed: advanceToWizard ? false : true,
          }
        };
        await supabase.from('daily_snapshots').upsert(payload, { onConflict: 'date' });
        addLog("✅ Histórico de conciliação atualizado automaticamente!", "success");
      } catch (metricsErr) {
        console.warn("Erro ao gerar snapshot automático", metricsErr);
      }

      // 5. Motor Autônomo de Auditoria Pericial & Auto-Healing
      addLog("🤖 Acionando Motor Pericial de Auto-Healing...", "info");
      updateStage(4, 'running', 'Auditando fechamento e verificando contrapartidas...');
      try {
        const { data: autoHealingResult, error: autoErr } = await supabase.rpc('run_autonomous_reconciliation_loop', {
          p_date: targetDate
        });
        if (autoErr) throw autoErr;

        setAutoHealingData(autoHealingResult);

        if (autoHealingResult?.is_conforme) {
          addLog(`✅ Fechamento pericial aprovado! Diferença final: R$ ${Number(autoHealingResult.final_delta).toFixed(2)}`, "success");
          updateStage(4, 'success', `Fechamento Conforme! Delta: R$ ${Number(autoHealingResult.final_delta).toFixed(2)}`);
        } else {
          addLog(`⚠️ Fechamento com divergência residual de R$ ${Number(autoHealingResult?.final_delta || 0).toFixed(2)}`, "warning");
          updateStage(4, 'warning', `Diferença residual: R$ ${Number(autoHealingResult?.final_delta || 0).toFixed(2)}`);
        }
      } catch (autoErr: any) {
        console.warn("Aviso na auditoria pericial:", autoErr);
        updateStage(4, 'warning', 'Auditoria pericial concluída com observações.');
      }

      addLog("✅ TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!", "success");
      
      // Generate JSON Trail
      const auditData = {
        timestamp: new Date().toISOString(),
        targetDate,
        mapping,
        manualInputs: { manualDinheiroMp, manualAReceber },
        results,
        insertedData: {
          txsToInsert,
          matchesToInsert
        }
      };
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
      setAuditTrailUrl(URL.createObjectURL(blob));
      
      updateStage(0, 'success', 'OSs e Recebíveis salvos!');
      updateStage(1, 'success', 'Maquininhas processadas!');
      updateStage(2, 'success', 'OFX conciliado!');
      setImportStages(prev => prev.map(s => ({ 
        ...s, 
        status: s.id === 'auto_healing' ? s.status : 'success', 
        subSteps: s.subSteps.map(sub => ({ ...sub, status: 'success' })) 
      })));

      if (advanceToWizard) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['pending-ofx-outflows', targetDate] }),
          queryClient.invalidateQueries({ queryKey: ['pending-ofx-inflows', targetDate] }),
          queryClient.invalidateQueries({ queryKey: ['open-bills-for-step2', targetDate] }),
          queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] }),
          queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        ]);
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['pending-ofx-outflows', targetDate] }),
          queryClient.refetchQueries({ queryKey: ['pending-ofx-inflows', targetDate] }),
          queryClient.refetchQueries({ queryKey: ['open-bills-for-step2', targetDate] }),
        ]);
        const realUnmatched = await fetchRealUnmatchedTransactions(targetDate);
        setUnmatchedTransactions(realUnmatched);
        if (realUnmatched.length > 0) {
          toast.info(`Automações e IA concluídas! ${realUnmatched.length} transação(ões) pendentes para revisão manual.`);
        } else {
          toast.success('🎉 100% das transações e OSs foram conciliadas automaticamente pelo motor e IA!');
        }
        setStep(4);
      } else {
        setSaveFinished(true);
      }
    } catch(e: any) {
      console.error(e);
      setImportStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      addLog(`❌ Erro ao confirmar importação: ${e.message || 'Falha no banco de dados.'}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeClosing = async () => {
    setIsSaving(true);
    try {
      addLog("🔒 Homologando e selando fechamento definitivo do dia...", "info");
      const { data, error } = await supabase.rpc('close_daily_snapshot', {
        p_date: targetDate,
        p_notes: 'Fechamento homologado via Central de Conciliação',
        p_metadata: {
          odometro_hoje: odometroHoje || 0,
          manual_dinheiro_mp: manualDinheiroMp || 0,
          manual_a_receber: manualAReceber || 0,
        }
      });

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] }),
      ]);

      toast.success('🎉 Fechamento homologado e snapshot selado com sucesso!');
      navigate({ to: '/conciliacao' });
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao finalizar fechamento: ${err.message || 'Falha no banco'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Totais (Com Filtro Estrito para Preview)
  let filteredOsCount = 0;
  let allOsCount = 0;
  let totalOsMaqGlobal = 0;
  let totalOsBancoGlobal = 0;
  let totalPatioEstoqueGlobal = 0;

  const totalOs = results.osFiles.reduce((acc, curr) => {
     let sum = 0;
     curr.osArray.forEach(os => {
        allOsCount++;
        const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
        const totalVal = os.total_value || os.paid_value || 0;
        totalPatioEstoqueGlobal += totalVal;

        if (delta > 0) {
          const totalOsValue = os.paid_value > 0 ? os.paid_value : 1;
          const creditRatio = (os.parsed_credit_debit || 0) / totalOsValue;
          const pixRatio = (os.parsed_pix_transfer || 0) / totalOsValue;

          if (creditRatio > 0 || pixRatio > 0) {
            totalOsMaqGlobal += (delta * creditRatio);
            totalOsBancoGlobal += (delta * pixRatio);
          } else {
            const methodLower = (os.payment_method || '').toLowerCase();
            if (methodLower.includes('pix') || methodLower.includes('transf') || methodLower.includes('dinheiro')) {
              totalOsBancoGlobal += delta;
            } else {
              totalOsMaqGlobal += delta;
            }
          }
          sum += delta;
          filteredOsCount++;
        }
     });
     return acc + sum;
  }, 0);

  const redeFiltered = results.redeResults.filter(r => r.success).flatMap(r => r.transactions);
  const totalRedeGross = redeFiltered.reduce((acc, curr) => acc + curr.grossAmount, 0);
  const totalRedeNet = redeFiltered.reduce((acc, curr) => acc + curr.netAmount, 0);

  const totalMaqFallback = results.maquininhaItems.reduce((acc, item) => acc + item.amount, 0);
  const totalMaq = totalMaqFallback + totalRedeNet;

  const allOfxTx = results.ofxResults.flatMap(r => r.transactions);
  const totalOfxOut = allOfxTx.filter(t => t.type === 'out').reduce((a,b) => a + b.amount, 0);
  const totalOfxIn = allOfxTx.filter(t => t.type === 'in').reduce((a,b) => a + b.amount, 0);

  const WIZARD_PHASES = [
    { id: 1, name: 'Upload Global', desc: 'OFX, Rede, OS, Contas', stepTarget: 1, matches: (s: number) => s === 1 || s === 1.5 },
    { id: 2, name: 'Mapeamento & Preview', desc: 'Lojas e Inputs Manuais', stepTarget: 3, matches: (s: number) => s === 2 || s === 2.5 || s === 3 || s === 3.5 || (s === 8 && isSaving) },
    { id: 3, name: 'Pagamentos sem OS', desc: 'Vínculo Rede e PIX', stepTarget: 4, matches: (s: number) => s === 4 },
    { id: 4, name: 'Justificativas', desc: 'Entradas e Saídas', stepTarget: 5, matches: (s: number) => s === 5 },
    { id: 5, name: 'Cofre & Fechamento', desc: 'Auditoria 5 Pilares', stepTarget: 6, matches: (s: number) => s === 6 || s === 7 || (s === 8 && saveFinished) },
  ];

  const currentPhaseIndex = WIZARD_PHASES.findIndex(p => p.matches(step));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel} 
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-zinc-100"
            title="Voltar ao início"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Central de Importação e Conciliação
            </h2>
            <p className="text-xs text-zinc-400">
              Ingestão de OSs do Pátio, Vendas da Rede, Contas a Pagar e Extratos Bancários (OFX).
            </p>
          </div>
        </div>

        {import.meta.env.DEV && (
          <button 
            onClick={handleDevAutoLoad} 
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all text-xs font-semibold shadow-sm"
          >
            <Sparkles size={14} />
            Auto-Load Mocks
          </button>
        )}
      </div>

      {/* STEPPER SUPERIOR UNIFICADO DE 5 FASES */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-2.5 sm:p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WIZARD_PHASES.map((phase, idx) => {
            const isActive = phase.matches(step);
            const isCompleted = currentPhaseIndex > idx;
            const isClickable = isCompleted || isActive;

            return (
              <button
                key={phase.id}
                type="button"
                disabled={!isClickable}
                onClick={() => {
                  if (isCompleted) {
                    setStep(phase.stepTarget as any);
                  }
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-zinc-800/90 border border-emerald-500/40 shadow-sm shadow-emerald-950/40' 
                    : isCompleted 
                    ? 'hover:bg-zinc-800/50 cursor-pointer border border-transparent' 
                    : 'opacity-40 cursor-not-allowed border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/40'
                    : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {isCompleted ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate leading-tight ${
                    isActive ? 'text-zinc-100' : isCompleted ? 'text-emerald-300' : 'text-zinc-500'
                  }`}>
                    {phase.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate hidden sm:block">
                    {phase.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {step === 1 && !showMarcoZero && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
          <div className={`grid grid-cols-1 ${!hasDailySnapshots ? 'md:grid-cols-2' : ''} gap-6`}>
            
            {/* Dropzone Principal */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                ${isDragActive 
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/50' 
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4 shadow-sm">
                <UploadCloud size={28} />
              </div>
              <h3 className="font-bold text-lg mb-1.5 text-center text-zinc-100">
                {isDragActive ? 'Solte os arquivos aqui para importar' : 'Importar Lote de Arquivos do Dia'}
              </h3>
              <p className="text-zinc-400 text-xs text-center max-w-sm mb-5 leading-relaxed">
                Arraste todos os arquivos da pasta do dia de uma só vez ou clique para selecionar:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-[11px] font-mono text-sky-300 font-semibold">
                  Extratos (.ofx)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-semibold">
                  Ordens de Serviço (.xls)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-semibold">
                  Vendas Rede (.xlsx)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300 font-semibold">
                  Contas a Pagar (.xls)
                </span>
              </div>
            </div>
            
            {/* Marco Zero (Se aplicável) */}
            {!hasDailySnapshots && (
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-8 flex flex-col items-center justify-between text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-zinc-100">
                    Implantação Inicial (Marco Zero)
                  </h3>
                  <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
                    Carregue a planilha histórica para inicializar os saldos das lojas e estoque pendente pela primeira vez.
                  </p>
                </div>

                <Button 
                  onClick={() => setShowMarcoZero(true)}
                  variant="outline"
                  className="w-full mt-6 text-xs h-10 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  <FileSpreadsheet className="mr-2" size={15} /> Abrir Assistente Marco Zero
                </Button>
              </div>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-8 flex justify-center">
               <div className="flex items-center gap-3 animate-pulse text-zinc-400 text-sm">
                 <LoadingSpinner size="sm" text="" /> 
                 <span>Analisando Padrões e Integridade dos Arquivos...</span>
               </div>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 1.5: Ingestão OCR Embutida (Seamless) */}
      {/* STEP 1.5: Gestão Unificada de Pátio & Ingestão OCR (Sem Planilha XLS) */}
      {step === 1.5 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
          {/* Header Subtitle da Etapa de Pátio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 mb-2 px-1 gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-400" />
                Gestão de Pátio & Veículos
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Data: <span className="font-mono text-emerald-400 font-bold">{targetDate}</span> · Baixe as OSs pendentes por filial ou adicione avulsas.
              </p>
            </div>

            {/* Controle de Abas no Step 1.5 */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setStep15Tab('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  step15Tab === 'manual'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📋 Registro Manual ({manualPatioItems.length})
              </button>

              <button
                type="button"
                onClick={() => setStep15Tab('ocr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  step15Tab === 'ocr'
                    ? 'bg-zinc-800 text-indigo-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📸 Print / OCR {extractedOcrItems.length > 0 && `(${extractedOcrItems.length})`}
              </button>
            </div>
          </div>

          {/* Conteúdo da Aba 1: Gestão Manual por Filial */}
          {step15Tab === 'manual' && (
            <div className="p-1">
              <PatioManualStoreGrid
                stores={stores}
                selectedStoreId={selectedOcrStoreId}
                onSelectStore={setSelectedOcrStoreId}
                osItems={manualPatioItems}
                onChangeItem={handleChangeManualPatioItem}
                onQuickPay={handleQuickPayManualPatioItem}
                onAddManualOs={handleAddManualPatioOs}
                onRemoveManualOs={handleRemoveManualPatioOs}
                targetDate={targetDate}
              />
            </div>
          )}

          {/* Conteúdo da Aba 2: OCR por Imagem */}
          {step15Tab === 'ocr' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
                {/* Guia Lateral */}
                <div className="lg:col-span-5 h-[540px]">
                  <OcrBatchStoreCarryoverList
                    stores={stores}
                    pendingOsList={pendingOcrOsList}
                    extraOsList={extraOcrOsList}
                    extractedItems={extractedOcrItems}
                    selectedStoreId={selectedOcrStoreId}
                    onSelectStore={setSelectedOcrStoreId}
                    onAddExtraOs={handleAddExtraOcrOs}
                    targetDate={targetDate}
                  />
                </div>

                {/* Dropzone e Grid */}
                <div className="lg:col-span-7 flex flex-col h-[540px] space-y-3">
                  <OcrBatchDropzoneAndPaste
                    onStartProcessing={handleStartOcrProcessing}
                    isProcessing={isOcrProcessing}
                    selectedStoreName={selectedOcrStoreId !== 'ALL' ? stores.find(s => s.id === selectedOcrStoreId)?.name : undefined}
                  />

                  <OcrBatchProgressBar progress={ocrProgress} isProcessing={isOcrProcessing} />

                  <div className="flex-1 min-h-0">
                    <OcrBatchReviewGrid
                      items={extractedOcrItems}
                      stores={stores}
                      onChangeItem={handleChangeOcrItem}
                      onDeleteItem={handleDeleteOcrItem}
                      onInject={handleSaveAndAdvanceOcr}
                      isInjecting={isOcrInjecting}
                      onClearAll={() => setExtractedOcrItems([])}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barra de Navegação Inferior do Step 1.5 */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              ← Voltar para Upload
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const hasUnmapped = results.ofxResults.some(o => !mapping[o.alias]) ||
                                      results.redeResults.some(r => r.transactions.some(t => !mapping[t.storeName]));
                  setStep(hasUnmapped ? 2 : 3);
                }}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Pular Pátio (Continuar sem OSs)
              </Button>

              <Button
                type="button"
                onClick={handleSaveAndAdvanceStep15}
                disabled={isOcrInjecting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                {isOcrInjecting ? 'Salvando Pátio no Banco...' : 'Salvar Alterações e Avançar →'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {showMarcoZero && (
        <MarcoZeroWizard 
          onComplete={() => setShowMarcoZero(false)}
          onCancel={() => setShowMarcoZero(false)}
        />
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-8">
            <h3 className="font-display text-xl font-semibold mb-6">Mapeamento de Lojas</h3>
            
            {/* BLOCO 1: OFX */}
            {subStep === 1 && (() => {
              const ofxAliases = Array.from(new Set(results.ofxResults.map(o => o.alias)));
              
              return (
                <div className="mb-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="font-bold text-base text-emerald-400 flex items-center gap-2 mb-4">
                    <Database size={18} /> 1. Extratos Bancários (OFX)
                  </h4>
                  {ofxAliases.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                      Nenhum arquivo OFX importado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ofxAliases.map(alias => {
                        const ofx = results.ofxResults.find(o => o.alias === alias);
                        const fileName = ofx?.fileName;
                        const effectiveStoreId = mapping[alias] || (ofx ? resolveStoreForOfx(ofx) : '');
                        const matchedStore = stores.find(st => st.id === effectiveStoreId);

                        // Identifica agência e conta formatada se presente
                        const acctInfoMatch = `${alias} ${fileName || ''}`.match(/(\d{4})_(\d{5,8})/) || 
                                              `${alias} ${fileName || ''}`.match(/(\d{4})(\d{5,8})/);
                        const formattedAcct = acctInfoMatch ? `Itaú • Ag. ${acctInfoMatch[1]} / Conta ${acctInfoMatch[2]}` : null;

                        return (
                          <div key={`ofx-${alias}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Identificado no Extrato</span><br/>
                              <span className="font-mono text-base font-bold text-zinc-100 break-all">{alias}</span>
                              {formattedAcct && (
                                <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                                  {formattedAcct}
                                </div>
                              )}
                              {fileName && fileName !== alias && (
                                <div className="mt-0.5 text-xs text-zinc-500 truncate">
                                  <span className="font-semibold text-zinc-400">Origem:</span> {fileName}
                                </div>
                              )}
                            </div>
                            <LinkIcon className="text-emerald-500/50 shrink-0 hidden sm:block" size={20} />
                            <div className="flex-1 w-full sm:w-auto">
                              <select 
                                value={effectiveStoreId} 
                                onChange={e => {
                                  const s = stores.find(st => st.id === e.target.value);
                                  updateMapping(alias, e.target.value, s?.name);
                                }}
                                className={`w-full bg-zinc-900 border rounded-xl p-2.5 text-xs font-semibold focus:outline-none transition-all
                                  ${effectiveStoreId ? 'border-emerald-500/50 text-emerald-300' : 'border-amber-500/50 text-amber-300 animate-pulse'}`}
                              >
                                <option value="">-- Selecione a Loja do Sistema --</option>
                                <option value="GLOBAL">-- CONTA GLOBAL / INTERNA --</option>
                                {stores.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              {matchedStore && (
                                <div className="mt-1 text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5">
                                  <span>✓ Vinculada: <strong>{matchedStore.name}</strong></span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tabela de Auditoria e Diagnóstico de Saldos Bancários OFX */}
                  {results.ofxResults.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-zinc-800 space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          Auditoria de Saldos dos Extratos (.OFX) Extraídos
                        </h5>
                        <Badge variant="outline" className="text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-400">
                          {results.ofxResults.length} contas lidas
                        </Badge>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                            <tr>
                              <th className="p-3">Arquivo / Conta</th>
                              <th className="p-3">Filial Vinculada</th>
                              <th className="p-3 text-right">Saldo Anterior</th>
                              <th className="p-3 text-right">Entradas (+)</th>
                              <th className="p-3 text-right">Saídas (-)</th>
                              <th className="p-3 text-right">Saldo Final (OFX)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-mono">
                            {results.ofxResults.map((ofx, idx) => {
                              const storeId = resolveStoreForOfx(ofx) || mapping[ofx.alias];
                              const storeObj = stores.find(s => s.id === storeId);
                              const totalIn = ofx.transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
                              const totalOut = ofx.transactions.filter(t => t.type === 'out').reduce((s, t) => s + Math.abs(t.amount), 0);

                              return (
                                <tr key={idx} className="hover:bg-zinc-800/30">
                                  <td className="p-3 font-sans">
                                    <div className="font-semibold text-zinc-100">{ofx.fileName || 'Extrato'}</div>
                                    <div className="text-[10px] text-zinc-500">{ofx.alias}</div>
                                  </td>
                                  <td className="p-3 font-sans">
                                    {storeObj ? (
                                      <span className="text-emerald-400 font-semibold">{storeObj.name}</span>
                                    ) : (
                                      <span className="text-amber-400 font-medium flex items-center gap-1">
                                        <AlertCircle size={12} /> Não vinculada
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right text-zinc-400 tabular-nums">
                                    {ofx.previousBalance !== undefined ? (
                                      ofx.previousBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    ) : '-'}
                                  </td>
                                  <td className="p-3 text-right text-emerald-400 tabular-nums font-semibold">
                                    +{totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="p-3 text-right text-rose-400 tabular-nums font-semibold">
                                    -{totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="p-3 text-right font-bold text-sky-400 tabular-nums">
                                    {ofx.bankBalance !== undefined ? (
                                      ofx.bankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-zinc-900/60 border-t border-zinc-800 font-bold">
                            <tr>
                              <td colSpan={2} className="p-3 font-sans text-right text-zinc-400 uppercase text-[11px]">
                                Total Geral Consolidado ({results.ofxResults.length} Contas):
                              </td>
                              <td className="p-3 text-right text-zinc-400 tabular-nums">
                                {results.ofxResults.reduce((s, o) => s + (o.previousBalance || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-emerald-400 tabular-nums font-bold">
                                +{results.ofxResults.reduce((s, o) => s + o.transactions.filter(t => t.type === 'in').reduce((st, t) => st + t.amount, 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-rose-400 tabular-nums font-bold">
                                -{results.ofxResults.reduce((s, o) => s + o.transactions.filter(t => t.type === 'out').reduce((st, t) => st + Math.abs(t.amount), 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-sm text-sky-400 font-bold tabular-nums">
                                {results.ofxResults.reduce((s, o) => s + (o.bankBalance || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setSubStep(2)} className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs">
                      Próximo: OS (Pátio) →
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* BLOCO 2: OS */}
            {subStep === 2 && (() => {
              const osAliases = new Set<string>();
              results.osFiles.filter(r => r.success).forEach(r => osAliases.add(r.storeAlias));
              const aliasArray = Array.from(osAliases);

              return (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="font-bold text-base text-amber-400 flex items-center gap-2 mb-4">
                    <FileText size={18} /> 2. Ordens de Serviço (Pátio)
                  </h4>
                  {aliasArray.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                      Nenhuma planilha de OS identificada.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aliasArray.map(alias => (
                        <div key={`os-${alias}`} className="flex items-center gap-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Loja na Planilha</span><br/>
                            <span className="font-mono text-base font-bold text-zinc-100">{alias}</span>
                          </div>
                          <LinkIcon className="text-amber-500/50 shrink-0" size={20} />
                          <div className="flex-1">
                            <select 
                              value={mapping[alias] || ''} 
                              onChange={e => {
                                const s = stores.find(st => st.id === e.target.value);
                                updateMapping(alias, e.target.value, s?.name);
                              }}
                              className={`w-full bg-zinc-900 border rounded-xl p-2.5 text-xs font-semibold focus:outline-none 
                                ${mapping[alias] ? 'border-amber-500/50 text-zinc-100' : 'border-rose-500/50 text-rose-300'}`}
                            >
                              <option value="">-- Selecione a Loja Correspondente --</option>
                              <option value="GLOBAL">-- NÃO VINCULAR / IGNORAR --</option>
                              {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button variant="ghost" onClick={() => setSubStep(1)} className="text-zinc-400 hover:text-white text-xs">
                      ← Voltar para OFX
                    </Button>
                    <Button onClick={() => setSubStep(3)} className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs">
                      Próximo: Maquininhas (Rede) →
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* BLOCO 3: REDE */}
            {subStep === 3 && (() => {
              const redeAliases = new Set<string>();
              results.maquininhaItems.forEach(i => redeAliases.add(i.storeName));
              results.redeResults.filter(r => r.success).forEach(r => {
                r.transactions.forEach(t => redeAliases.add(t.storeName));
              });

              const aliasArray = Array.from(redeAliases);

              return (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="font-bold text-base text-teal-400 flex items-center gap-2 mb-4">
                    <CreditCard size={18} /> 3. Maquininhas (Rede)
                  </h4>
                  {aliasArray.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                      Nenhum relatório de maquininha identificado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aliasArray.map(alias => (
                        <div key={`rede-${alias}`} className="flex items-center gap-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Nº de Estabelecimento / Loja</span><br/>
                            <span className="font-mono text-base font-bold text-zinc-100">{alias}</span>
                          </div>
                          <LinkIcon className="text-teal-500/50 shrink-0" size={20} />
                          <div className="flex-1">
                            <select 
                              value={mapping[alias] || ''} 
                              onChange={e => {
                                const s = stores.find(st => st.id === e.target.value);
                                updateMapping(alias, e.target.value, s?.name);
                              }}
                              className={`w-full bg-zinc-900 border rounded-xl p-2.5 text-xs font-semibold focus:outline-none 
                                ${mapping[alias] ? 'border-teal-500/50 text-zinc-100' : 'border-rose-500/50 text-rose-300'}`}
                            >
                              <option value="">-- Selecione a Loja Correspondente --</option>
                              <option value="GLOBAL">-- NÃO VINCULAR / IGNORAR --</option>
                              {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button variant="ghost" onClick={() => setSubStep(2)} className="text-zinc-400 hover:text-white text-xs">
                      ← Voltar para OS
                    </Button>
                    <Button 
                      onClick={() => setStep(needsFallback ? 3.5 : 2.5)}
                      className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs"
                    >
                      Avançar para OSs do Pátio (Ausentes) →
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      )}

      {step === 2.5 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-6 bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                    ETAPA 2.5
                  </span>
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <Car className="text-sky-400" size={20} />
                    Atualização de OSs do Pátio (Ausentes no Relatório)
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Revise e atualize os veículos que constavam no pátio de dias anteriores e não vieram nas planilhas importadas de hoje antes de preencher os valores manuais.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => detectMissingOs()}
                  className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5 rounded-xl cursor-pointer"
                >
                  <RefreshCcw size={13} className={isLoadingMissingOs ? "animate-spin" : ""} />
                  Recarregar OSs
                </Button>
              </div>
            </div>

            {isLoadingMissingOs ? (
              <div className="p-12 text-center text-zinc-400 flex flex-col items-center gap-3">
                <LoadingSpinner size="md" />
                <p className="text-xs">Cruzando banco de dados com os relatórios importados...</p>
              </div>
            ) : missingOsList.length > 0 ? (
              <MissingPatioOsEditor
                missingList={missingOsList}
                onChangeList={setMissingOsList}
              />
            ) : (
              <div className="p-8 text-center rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-zinc-200">Zero OSs Ausentes no Relatório</h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Todas as ordens de serviço ativas no banco de dados foram encontradas nas planilhas importadas de hoje. Não há pendências antigas de pátio a baixar.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ← Voltar para Mapeamento de Lojas
              </Button>

              <Button
                type="button"
                onClick={handleSaveAndAdvanceMissingOs}
                disabled={isSavingMissingOs}
                className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs flex items-center gap-2"
              >
                {isSavingMissingOs ? <LoadingSpinner size="xs" text="" /> : <ArrowRight size={15} />}
                Salvar OSs e Avançar para Valores Manuais (Step 3) →
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      
        {step === 3.5 && (() => {
          const firstStoreId = Object.values(mapping).find(id => id && id !== 'GLOBAL');
          const allOfx = results.ofxResults.flatMap(r => r.transactions);
          
          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MatchManualOsPendente 
                storeId={firstStoreId || ''} 
                ofxTransactions={allOfx}
                onComplete={(matchedPairs) => {
                  setManualOsMatches(matchedPairs);
                  setStep(3); // volta pro step de preview
                }}
                onSkip={() => {
                  setStep(3);
                }}
              />
            </div>
          );
        })()}

        {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-zinc-900/60 border border-zinc-800 border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total OS (Recebimentos do Dia)</span>
                <FileText size={18} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                <AnimatedNumber value={totalOs} format="currency" />
              </p>
              <div className="flex flex-col gap-0.5 mt-1 text-xs text-zinc-400">
                <span>{filteredOsCount} novos pagamentos no dia</span>
                {totalPatioEstoqueGlobal > 0 && (
                  <span className="text-[11px] font-mono font-medium text-emerald-400 tabular-nums">
                    Estoque em Pátio: {totalPatioEstoqueGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({allOsCount} OSs)
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-zinc-900/60 border border-zinc-800 border-l-4 border-l-teal-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Maquininha (Rede Líquido)</span>
                <CreditCard size={18} className="text-teal-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                <AnimatedNumber value={totalMaq} format="currency" />
              </p>
              <p className="text-xs text-zinc-400 mt-1">{redeFiltered.length} transações de cartão</p>
            </Card>

            <Card className="p-5 bg-zinc-900/60 border border-zinc-800 border-l-4 border-l-sky-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Saldo Total Bancário (OFX)</span>
                <Database size={18} className="text-sky-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                <AnimatedNumber value={totalOfxIn} format="currency" />
              </p>
              <p className="text-xs text-zinc-400 mt-1">{allOfxTx.length} lançamentos no total dos extratos</p>
            </Card>
          </div>

          <Card className="p-6 bg-zinc-900/60 border border-zinc-800 space-y-6">
            {/* Início: Valores Manuais Globais */}
            {(() => {
              const hasNoOsFiles = results.osFiles.filter(r => r.success && r.osArray.length > 0).length === 0;
              const mapaMetasFaturamentoTotal = results.mapaMetasResults?.[0]?.totalFaturamento || 0;
              const previousMonthClosing = previousSnapshot?.faturamento ? Number(previousSnapshot.faturamento) : 0;

              const baseMesAnterior = Math.max(0, previousOdometro - previousMonthClosing);
              const suggestedRevenue = (baseMesAnterior + mapaMetasFaturamentoTotal > 0)
                ? (baseMesAnterior + mapaMetasFaturamentoTotal)
                : (previousOdometro + mapaMetasFaturamentoTotal);

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                        Valores Manuais do Dia
                        {hasNoOsFiles && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border-amber-500/30">
                            Sem Planilhas de OS (Modo Assistido)
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Preencha os dados abaixo para o fechamento diário.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStep(2.5)}
                        className="text-xs bg-zinc-900 border-zinc-800 text-sky-400 hover:bg-zinc-800 hover:text-sky-300 flex items-center gap-1.5 rounded-xl shadow-sm cursor-pointer"
                      >
                        <Car size={13} />
                        OSs Ausentes ({missingOsList.length})
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsOcrModalOpen(true)}
                        className="text-xs bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 flex items-center gap-1.5 rounded-xl shadow-sm cursor-pointer"
                      >
                        <Car size={13} />
                        Gerenciar Pátio & Baixas
                      </Button>

                      <button
                        type="button"
                        onClick={() => setIsManualLocked(!isManualLocked)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          isManualLocked 
                            ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700' 
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/30'
                        }`}
                      >
                        {isManualLocked ? <Lock size={13} /> : <Unlock size={13} />}
                        {isManualLocked ? 'Trava Ativa' : 'Destravado'}
                      </button>
                    </div>
                  </div>

                  {/* SELEÇÃO CONDICIONAL: SE SEM OS -> MODO ASSISTIDO COMPLETO; SE COM OS -> GRID CLÁSSICO */}
                  {hasNoOsFiles ? (
                    <div className="space-y-4">
                      <AssistedRevenueCalculator
                        previousOdometro={previousOdometro}
                        initialFaturamentoMesAnterior={manualFaturamentoMesAnterior || Number((previousSnapshot?.metadata as any)?.faturamento_mes_anterior || 0)}
                        initialMapaMetasFaturamento={mapaMetasFaturamentoTotal}
                        odometroHoje={odometroHoje}
                        onApplyCalculatedValue={(val) => {
                          setOdometroHoje(Number(val.toFixed(2)));
                          toast.success(`Faturamento calculado de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicado ao dia!`);
                        }}
                        isLocked={isManualLocked}
                        onToggleLock={() => setIsManualLocked(!isManualLocked)}
                        onChangeOdometro={val => setOdometroHoje(Number(val.toFixed(2)))}
                        deltaFaturamento={deltaFaturamentoCalculado}
                        onChangeFaturamentoMesAnterior={val => setManualFaturamentoMesAnterior(Number(val.toFixed(2)))}
                      />

                      {/* GRID DE 3 COLUNAS COM DEMAIS VALORES DO DIA */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                        {/* 1. Dinheiro MP */}
                        <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between min-h-[22px]">
                              <label className="block text-[11px] font-bold uppercase text-zinc-400 font-sans">Dinheiro MP</label>
                              {previousDinheiroMp > 0 && (
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  Ontem: {previousDinheiroMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                            </div>
                            <input 
                              type="number" 
                              step="0.01"
                              disabled={isManualLocked}
                              value={manualDinheiroMp || ''} 
                              onChange={e => {
                                setManualDinheiroMp(Number(e.target.value));
                                setIsDinheiroMpUserEdited(true);
                              }}
                              placeholder="0,00"
                              className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                            />
                          </div>
                        </div>

                        {/* 2. A Receber */}
                        <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between min-h-[22px]">
                              <label className="block text-[11px] font-bold uppercase text-zinc-400 font-sans">A Receber</label>
                              {manualAReceber > 0 && (
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                  Pendente
                                </span>
                              )}
                            </div>
                            <input 
                              type="number" 
                              step="0.01"
                              disabled={isManualLocked}
                              value={manualAReceber || ''} 
                              onChange={e => setManualAReceber(Number(e.target.value))}
                              placeholder="0,00"
                              className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                            />
                          </div>
                        </div>

                        {/* 3. Contas a Pagar */}
                        <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between min-h-[22px]">
                              <label className="text-[11px] font-bold uppercase text-zinc-400 font-sans">Contas a Pagar</label>
                              {results.contasPagarResults && results.contasPagarResults.length > 0 && (
                                <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                                  <Receipt size={10} /> ({results.contasPagarResults.reduce((acc, c) => acc + c.totalBills, 0)} contas)
                                </span>
                              )}
                            </div>
                            <input 
                              type="number" 
                              step="0.01"
                              disabled={isManualLocked}
                              value={contasManual ? Number(contasManual.toFixed(2)) : (results.contasPagarResults?.reduce((acc, c) => acc + c.totalAmount, 0) ? Number(results.contasPagarResults.reduce((acc, c) => acc + c.totalAmount, 0).toFixed(2)) : '')} 
                              onChange={e => setContasManual(Number(Number(e.target.value).toFixed(2)))}
                              placeholder="0,00"
                              className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* GRID CLÁSSICO ORIGINAL (QUANDO HÁ ARQUIVOS DE OS IMPORTADOS) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                      {/* 1. Odômetro OI (Acumulado) */}
                      <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between min-h-[22px]">
                            <label className="block text-[11px] font-bold uppercase text-zinc-400 font-sans">
                              Odômetro OI (Acumulado)
                            </label>
                            {previousOdometro > 0 && (
                              <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">
                                Ant: {previousOdometro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </div>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={isManualLocked}
                            value={odometroHoje || ''} 
                            onChange={e => setOdometroHoje(Number(e.target.value))}
                            placeholder="0,00"
                            className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                          />
                        </div>

                        {odometroHoje > 0 && previousOdometro > 0 && (
                          <p className="text-[11px] font-mono text-emerald-400 pt-0.5">
                            Δ Faturamento: <span className="font-bold tabular-nums">{deltaFaturamentoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </p>
                        )}
                      </div>

                      {/* 2. Dinheiro MP */}
                      <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between min-h-[22px]">
                            <label className="block text-[11px] font-bold uppercase text-zinc-400 font-sans">Dinheiro MP</label>
                            {previousDinheiroMp > 0 && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Ontem: {previousDinheiroMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </div>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={isManualLocked}
                            value={manualDinheiroMp || ''} 
                            onChange={e => {
                              setManualDinheiroMp(Number(e.target.value));
                              setIsDinheiroMpUserEdited(true);
                            }}
                            placeholder="0,00"
                            className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                          />
                        </div>
                      </div>

                      {/* 3. A Receber */}
                      <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between min-h-[22px]">
                            <label className="block text-[11px] font-bold uppercase text-zinc-400 font-sans">A Receber</label>
                            {manualAReceber > 0 && (
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                Pendente
                              </span>
                            )}
                          </div>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={isManualLocked}
                            value={manualAReceber || ''} 
                            onChange={e => setManualAReceber(Number(e.target.value))}
                            placeholder="0,00"
                            className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                          />
                        </div>
                      </div>

                      {/* 4. Contas a Pagar */}
                      <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between min-h-[22px]">
                            <label className="text-[11px] font-bold uppercase text-zinc-400 font-sans">Contas a Pagar</label>
                            {results.contasPagarResults && results.contasPagarResults.length > 0 && (
                              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                                <Receipt size={10} /> ({results.contasPagarResults.reduce((acc, c) => acc + c.totalBills, 0)} contas)
                              </span>
                            )}
                          </div>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={isManualLocked}
                            value={contasManual ? Number(contasManual.toFixed(2)) : (results.contasPagarResults?.reduce((acc, c) => acc + c.totalAmount, 0) ? Number(results.contasPagarResults.reduce((acc, c) => acc + c.totalAmount, 0).toFixed(2)) : '')} 
                            onChange={e => setContasManual(Number(Number(e.target.value).toFixed(2)))}
                            placeholder="0,00"
                            className="w-full bg-zinc-900 border border-zinc-700/80 disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold text-zinc-100 tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bloco Unificado: Receitas Extras e Ajustes DRE */}
                  <div className="pt-3">
                    <RevenueAdjustmentsCard
                      targetDate={targetDate}
                      stores={stores}
                      isLocked={isManualLocked}
                      onTotalChange={(total) => setTotalRevenueAdjustments(total)}
                    />
                  </div>
                </div>
              );
            })()}
            {/* Fim: Valores Manuais Globais */}

            {/* Bloco: OSs Ausentes / Carryover do Pátio */}
            {missingOsList.length > 0 && (
              <div className="pt-2">
                <MissingPatioOsEditor
                  missingList={missingOsList}
                  onChangeList={setMissingOsList}
                />
              </div>
            )}

            {/* Inspetor JSON de Conciliação */}
            <div className="pt-4 border-t border-zinc-800">
              <details className="group p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <summary className="cursor-pointer flex items-center justify-between text-xs font-mono text-zinc-300 select-none hover:text-zinc-100">
                  <span className="flex items-center gap-2">
                    <Code2 size={16} className="text-emerald-400" />
                    Inspetor de Conciliação (Payload JSON que será enviado ao Backend)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(JSON.stringify({
                          target_date: targetDate,
                          manual_inputs: {
                            odometro_hoje: odometroHoje,
                            dinheiro_mp: manualDinheiroMp,
                            a_receber: manualAReceber,
                            contas_manual: contasManual
                          },
                          file_mappings: mapping,
                          orphan_os_modifications: missingOsList.filter(
                            os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
                          ),
                          ofx_results_count: results.ofxResults.length,
                          os_files_count: results.osFiles.length,
                          rede_results_count: results.redeResults.length
                        }, null, 2));
                        setCopiedJson(true);
                        toast.success('JSON de conciliação copiado!');
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono rounded flex items-center gap-1 cursor-pointer"
                    >
                      {copiedJson ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copiedJson ? 'Copiado!' : 'Copiar JSON'}
                    </button>
                    <span className="text-[10px] text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="mt-3 p-3 bg-zinc-950 border-t border-zinc-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60">
                  <pre>{JSON.stringify({
                    target_date: targetDate,
                    manual_inputs: {
                      odometro_hoje: odometroHoje,
                      dinheiro_mp: manualDinheiroMp,
                      a_receber: manualAReceber,
                      contas_manual: contasManual
                    },
                    file_mappings: mapping,
                    orphan_os_modifications: missingOsList.filter(
                      os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
                    ),
                    ofx_results_count: results.ofxResults.length,
                    os_files_count: results.osFiles.length,
                    rede_results_count: results.redeResults.length
                  }, null, 2)}</pre>
                </div>
              </details>
            </div>

            {/* Rodapé com Navegação */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(2.5)}
                  className="text-zinc-400 hover:text-white text-xs self-start sm:self-auto"
                >
                  ← Voltar para OSs do Pátio
                </Button>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Data Base da Conciliação</label>
                  <input 
                    type="date" 
                    value={targetDate} 
                    onChange={e => setTargetDate(e.target.value)} 
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <Button
                  onClick={() => handleConfirm(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto py-3 px-6 text-sm font-bold rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isSaving ? <LoadingSpinner size="xs" text="" /> : <ArrowRight size={16} className="text-zinc-950 stroke-[2.5]" />}
                  Processar e Avançar Conciliação →
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* STEP 4 (Tela A): Vínculo de Pagamentos sem Lançamento na OS */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Step1UnregisteredPayments
            unmatchedTransactions={unmatchedTransactions}
            results={results}
            mapping={mapping}
            targetDate={targetDate}
            stores={stores}
            resolvedMatches={resolvedMatches}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        </motion.div>
      )}

      {/* STEP 5 (Tela B): Justificativas de Não-Faturamento por Loja */}
      {step === 5 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Step2NonRevenueJustifications
            results={results}
            mapping={mapping}
            targetDate={targetDate}
            stores={stores}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        </motion.div>
      )}

      {/* STEP 6 (Tela C): Conferência de Cofre do Daniel */}
      {step === 6 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Step3CashVaultDaniel
            targetDate={targetDate}
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        </motion.div>
      )}

      {/* STEP 7 (Tela D): Auditoria Final dos 5 Pilares & Gravação */}
      {step === 7 && (() => {
        const manualInputs = {
          odometroHoje: odometroHoje || 0,
          manualDinheiroMp,
          manualAReceber,
          contasManual: contasManual || 0,
        };

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Step4FinalAuditAndClose
              results={results}
              mapping={mapping}
              targetDate={targetDate}
              stores={stores}
              manualInputs={manualInputs}
              missingOsList={missingOsList}
              isSaving={isSaving}
              onFinish={handleFinalizeClosing}
              onBack={() => setStep(6)}
            />
          </motion.div>
        );
      })()}

      {/* STEP 8: PAINEL EXECUTIVO DE PROGRESSO & GRAVAÇÃO (10/10 DESIGN) */}
      {step === 8 && (() => {

        const totalOsCount = results.osFiles.filter(r => r.success).reduce((acc, curr) => acc + curr.osArray.length, 0);
        const totalRedeCount = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.transactions.length, 0);
        const totalOfxCount = results.ofxResults.reduce((acc, curr) => acc + curr.transactions.length, 0);
        const formattedTargetDate = targetDate.split('-').reverse().join('/');

        const progressPct = saveFinished ? 100 : (
          importLogs.some(l => l.message.includes('Vinculando')) ? 85 :
          importLogs.some(l => l.message.includes('extrato')) ? 65 :
          importLogs.some(l => l.message.includes('Rede')) ? 40 :
          importLogs.some(l => l.message.includes('Pátio')) ? 20 : 10
        );

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
            
            {/* HERO BANNER (Quando Concluído) */}
            {saveFinished ? (
              <motion.div 
                initial={{ opacity: 0, y: 4 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 text-center space-y-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={28} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
                    Importação e Conciliação Concluída com Sucesso
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Os arquivos foram auditados, as OSs e transações foram persistidas no banco e os saldos consolidados para {formattedTargetDate}.
                  </p>
                </div>

                {/* 4 Cards de Métricas do Lote */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-1">
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-sans">OSs Gravadas</span>
                    <p className="text-lg font-bold font-mono text-zinc-100 mt-0.5 tabular-nums">{totalOsCount}</p>
                    <span className="text-[10px] text-zinc-500">{results.osFiles.length} arquivos</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-sans">Vendas Rede</span>
                    <p className="text-lg font-bold font-mono text-zinc-100 mt-0.5 tabular-nums">{totalRedeCount}</p>
                    <span className="text-[10px] text-zinc-500">{results.redeResults.length} relatórios</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-sans">Extratos OFX</span>
                    <p className="text-lg font-bold font-mono text-zinc-100 mt-0.5 tabular-nums">{totalOfxCount}</p>
                    <span className="text-[10px] text-zinc-500">{results.ofxResults.length} contas</span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-sans">Data Base</span>
                    <p className="text-lg font-bold font-mono text-zinc-100 mt-0.5 tabular-nums">{formattedTargetDate}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">Consolidado</span>
                  </div>
                </div>

                {/* Banner de Auditoria Pericial & Auto-Healing */}
                {autoHealingData && (
                  <div className={`p-4 rounded-xl border text-left max-w-2xl mx-auto ${
                    autoHealingData.is_conforme 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className={autoHealingData.is_conforme ? 'text-emerald-400' : 'text-amber-400'} />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                          Auditoria Pericial & Auto-Healing
                        </span>
                      </div>
                      <Badge variant={autoHealingData.is_conforme ? 'default' : 'outline'} className={`text-[10px] ${autoHealingData.is_conforme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                        {autoHealingData.is_conforme ? 'Fechamento Conforme ✅' : 'Divergência Residual'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mb-2">
                      <span>Delta Inicial: <b className="text-zinc-100">R$ {Number(autoHealingData.initial_delta).toFixed(2)}</b></span>
                      <span>➔</span>
                      <span>Delta Final: <b className={autoHealingData.is_conforme ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>R$ {Number(autoHealingData.final_delta).toFixed(2)}</b></span>
                      <span className="text-[10px] text-zinc-500">({autoHealingData.iterations_count} {autoHealingData.iterations_count === 1 ? 'iteração' : 'iterações'})</span>
                    </div>

                    {autoHealingData.steps_executed && autoHealingData.steps_executed.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-[11px]">
                        {autoHealingData.steps_executed.map((st: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-zinc-400">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{st.details}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Botões de Ação Final */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-lg mx-auto">
                  <Button
                    onClick={() => setStep(4)}
                    variant="outline"
                    className="w-full sm:w-auto text-xs py-2.5 px-4 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                  >
                    Revisar Órfãos & Diferença (Wizard) →
                  </Button>

                  <Button
                    onClick={() => navigate({ to: '/conciliacao' })}
                    className="w-full sm:w-auto flex-1 py-2.5 px-5 font-bold text-xs bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-xl shadow-md shadow-emerald-950/50"
                  >
                    Ir para a Conciliação do Dia →
                  </Button>

                  {auditTrailUrl && (
                    <a href={auditTrailUrl} download={`auditoria-conciliacao-${new Date().getTime()}.json`} className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full text-xs py-2.5 px-4 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
                        <Download size={14} className="mr-1.5" />
                        Auditoria JSON
                      </Button>
                    </a>
                  )}

                  <Button
                    onClick={() => setStep(1)}
                    variant="ghost"
                    className="w-full sm:w-auto text-xs py-2.5 px-3 text-zinc-500 hover:text-zinc-300"
                  >
                    Nova Importação
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* CARD DE PROCESSAMENTO EM ANDAMENTO */
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">
                      Processamento dos Arquivos
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Ingestão de OSs, auditoria de taxas e conciliação para {formattedTargetDate}.
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs font-mono px-3 py-1 bg-zinc-950 border-zinc-800 text-zinc-400">
                    {progressPct}% Concluído
                  </Badge>
                </div>

                {/* Lista dos Agentes */}
                <div className="space-y-3">
                  {importStages.map((stage) => (
                    <AgentStageItem key={stage.id} stage={stage} />
                  ))}
                </div>
              </div>
            )}

            {/* Banner de Erro Estruturado */}
            {importLogs.some(l => l.type === 'error') && !saveFinished && (
              <ExecutionErrorBanner
                error={importLogs.slice().reverse().find(l => l.type === 'error')?.error || importLogs.slice().reverse().find(l => l.type === 'error')?.message || 'Erro desconhecido'}
                isRetrying={isSaving}
                onRetry={() => handleConfirm(true)}
              />
            )}

            {/* Terminal de Logs Profissional */}
            {importLogs.length > 0 && (
              <ImportExecutionTerminal
                logs={importLogs}
                isRunning={isSaving}
                isFinished={saveFinished}
                hasError={importLogs.some(l => l.type === 'error')}
                onRetry={() => handleConfirm(true)}
                targetDate={targetDate}
              />
            )}

          </motion.div>
        );
      })()}

      <AgentRunnerModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onSuccess={handleCloudDataSuccess}
        runLocalFiles={async () => {
          if (pendingFiles.length > 0) {
            await processFiles(pendingFiles);
          }
        }}
      />

      <PatioManagementDualModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        targetDate={targetDate}
        stores={stores}
        onSuccess={() => {
          toast.success('Pátio sincronizado com sucesso!');
        }}
      />
    </div>
  );
}


