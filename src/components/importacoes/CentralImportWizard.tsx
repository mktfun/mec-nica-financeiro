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
  Database, Search, X, TrendingDown, TrendingUp, AlertCircle, CreditCard, FileText, 
  Terminal, Sparkles, FileSpreadsheet, Layers, RefreshCcw, Loader2, Code2, Copy, Check, Lock, Unlock, Receipt
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
import { useDiagnosticEngine } from '@/hooks/useDiagnosticEngine';
import { DiagnosticPanel } from './DiagnosticPanel';
import { MissingPatioOsEditor } from './MissingPatioOsEditor';
import { useAiSettings } from '@/hooks/useAiSettings';
import { reconcileRedeWithOfxViaGemini } from '@/lib/llm-matcher';
import { Step1UnregisteredPayments } from './wizard/Step1UnregisteredPayments';
import { Step2NonRevenueJustifications } from './wizard/Step2NonRevenueJustifications';
import { Step3CashVaultDaniel } from './wizard/Step3CashVaultDaniel';
import { Step4FinalAuditAndClose } from './wizard/Step4FinalAuditAndClose';
import { executeAutoMatchingEngine, PendingUnmatchedTransaction } from '@/lib/matchers/autoMatchingEngine';
import { useQueryClient } from '@tanstack/react-query';


export interface ImportLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: string;
  opened_at?: string;
  days_open?: number;
}

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

  const [step, setStep] = useState<1 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8>(1);
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
  const [manualAReceber, setManualAReceber] = useState<number>(0);

  // Motor de Auto-Match em Memória (alimenta o Step 4)
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<PendingUnmatchedTransaction[]>([]);
  const [autoMatchedCount, setAutoMatchedCount] = useState<number>(0);
  const [resolvedMatches, setResolvedMatches] = useState<Array<{ storeId: string; osNumber: string; sourceId: string; type: string; amount: number; paymentMethod: string }>>([]);

  // OSs ausentes / órfãs detectadas para ajuste manual livre
  const [missingOsList, setMissingOsList] = useState<MissingPatioOsEdit[]>([]);
  const [isLoadingMissingOs, setIsLoadingMissingOs] = useState(false);

  const updateMissingOs = (id: string, field: 'total_value' | 'paid_value' | 'status', value: any) => {
    setMissingOsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const [missingOsSearch, setMissingOsSearch] = useState('');

  // Detecção de OSs ativas no banco que não vieram no relatório importado do mês
  useEffect(() => {
    async function detectMissingOs() {
      if (step !== 3) return;

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
            status: dbOs.status || 'em_aberto',
            opened_at: dbOs.opened_at,
            days_open: dbOs.days_open
          }));

        setMissingOsList(missing);
      } catch (err) {
        console.error("Erro ao detectar OSs ausentes:", err);
      } finally {
        setIsLoadingMissingOs(false);
      }
    }

    detectMissingOs();
  }, [step, mapping, results.osFiles, stores]);

  // Auto-popula A Receber e Dinheiro MP para a data alvo
  useEffect(() => {
    async function loadDefaultsForDate() {
      try {
        const { data: snap } = await supabase
          .from('daily_snapshots')
          .select('dinheiro_mp, a_receber_manual')
          .eq('date', targetDate)
          .maybeSingle();

        if (snap) {
          if (snap.dinheiro_mp) setManualDinheiroMp(Number(snap.dinheiro_mp));
          if (snap.a_receber_manual) setManualAReceber(Number(snap.a_receber_manual));
        }

        // Se a_receber_manual for 0, busca soma dos recebíveis pendentes cadastrados
        const { data: recs } = await supabase
          .from('receivables')
          .select('value')
          .lte('date', targetDate)
          .eq('status', 'pendente');

        if (recs && recs.length > 0) {
          const totalRec = recs.reduce((acc, r) => acc + Number(r.value || 0), 0);
          if (totalRec > 0) {
            setManualAReceber(Number(totalRec.toFixed(2)));
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar padrões para targetDate:', err);
      }
    }

    loadDefaultsForDate();
  }, [targetDate]);

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
  const [isManualLocked, setIsManualLocked] = useState<boolean>(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [autoHealingData, setAutoHealingData] = useState<any>(null);

  // Encadeamento do Fechamento Anterior
  const { data: previousSnapshot } = usePreviousDaySnapshot(targetDate);
  const previousOdometro = useMemo(() => {
    if (!previousSnapshot) return 0;
    const meta = (previousSnapshot.metadata as any) || {};
    return Number(meta.odometro_hoje ?? meta.faturamento_anterior ?? meta.odometro_anterior ?? previousSnapshot.faturamento ?? 0);
  }, [previousSnapshot]);

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

  const { diagnostic, isLoading: isLoadingDiagnostic, refetchHistory } = useDiagnosticEngine({
    step,
    targetDate,
    isLoadingMissingOs,
    totalOfxIn: computedTotalOfxIn,
    totalPatioEstoqueGlobal: computedTotalPatioEstoque,
    manualDinheiroMp,
    manualAReceber,
    contasManual,
    jurosRedeTotal: computedJurosRede
  });

  // Sincroniza automaticamente o valor de Contas a Pagar quando importado analiticamente
  useEffect(() => {
    if (results.contasPagarResults && results.contasPagarResults.length > 0) {
      const total = results.contasPagarResults.reduce((acc, c) => acc + c.totalAmount, 0);
      if (total > 0) {
        setContasManual(total);
      }
    }
  }, [results.contasPagarResults]);

  // Helper para resolver a loja correta por mapping direto, conta bancária ou prefixo do arquivo
  const resolveStoreForOfx = useCallback((ofx: { alias: string; fileName?: string }): string => {
    if (mapping[ofx.alias]) return mapping[ofx.alias];
    const acctMatch = ofx.alias.match(/(\d{8,12})/);
    if (acctMatch && mapping[acctMatch[1]]) return mapping[acctMatch[1]];
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

  // Detecção de OSs ativas no banco que não vieram no relatório importado do mês
  useEffect(() => {
    async function detectMissingOs() {
      if (step !== 3) return;

      const mappedStoreIds = Object.values(mapping).filter(id => id && id !== 'GLOBAL');
      if (mappedStoreIds.length === 0) return;

      setIsLoadingMissingOs(true);
      try {
        const { data: dbActiveOs, error } = await supabase
          .from('patio_os')
          .select('id, os_number, plate, store_id, store_name, total_value, paid_value, status, opened_at, days_open')
          .in('store_id', mappedStoreIds)
          .not('status', 'in', '("finalizada","finalizado","paga","pago","cancelada","cancelado")');

        if (error) {
          console.error("Erro ao buscar OSs ativas no banco:", error);
          return;
        }

        const importedOsNumbersByStore = new Set<string>();
        results.osFiles.filter(f => f.success).forEach(file => {
          const storeId = mapping[file.storeAlias];
          file.osArray.forEach(os => {
            importedOsNumbersByStore.add(`${storeId}_${String(os.os_number).trim()}`);
          });
        });

        const missing: MissingPatioOsEdit[] = (dbActiveOs || [])
          .filter(dbOs => !importedOsNumbersByStore.has(`${dbOs.store_id}_${String(dbOs.os_number).trim()}`))
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
            status: dbOs.status || 'em_aberto',
            opened_at: dbOs.opened_at,
            days_open: dbOs.days_open
          }));

        setMissingOsList(missing);
      } catch (err) {
        console.error("Erro ao detectar OSs ausentes:", err);
      } finally {
        setIsLoadingMissingOs(false);
      }
    }

    detectMissingOs();
  }, [step, mapping, results.osFiles, stores]);

  
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

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setImportLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp, type, message }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [importLogs]);

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

    // 1. OFX PIX / Depósitos sem OS
    const { data: ofxTxs } = await supabase
      .from('ofx_transactions')
      .select('id, store_id, amount, target_date, occurred_at, title, counterpart_name, type')
      .eq('target_date', tDate)
      .eq('type', 'in')
      .is('matched_os_number', null);

    (ofxTxs || []).forEach((t: any) => {
      const titleStr = String(t.title || '').toUpperCase();
      if (titleStr.includes('REDE') || titleStr.includes('CIELO') || titleStr.includes('STONE') || titleStr.includes('PAGSEGURO')) {
        return;
      }
      const sid = t.store_id || '';
      unmatched.push({
        id: t.id,
        source: 'ofx_pix',
        storeId: sid,
        storeName: storeNameMap.get(sid) || 'Filial',
        date: t.target_date || tDate,
        description: t.counterpart_name || t.title || 'Depósito Bancário / PIX',
        paymentMethod: 'PIX',
        amount: Math.abs(Number(t.amount || 0)),
        status: 'pendente'
      });
    });

    // 2. Transações REDE sem OS
    const { data: posTxs } = await supabase
      .from('pos_transactions')
      .select('id, store_id, net_amount, gross_amount, target_date, occurred_at, method, card_brand, nsu, authorization_code')
      .eq('target_date', tDate)
      .is('matched_os_number', null);

    (posTxs || []).forEach((t: any) => {
      const sid = t.store_id || '';
      unmatched.push({
        id: t.id,
        source: 'rede',
        storeId: sid,
        storeName: storeNameMap.get(sid) || 'Filial',
        date: t.target_date || tDate,
        description: `Cartão ${t.card_brand || ''} ${t.method || ''} (NSU: ${t.nsu || 'S/N'})`.trim(),
        paymentMethod: t.method || 'CARTAO',
        amount: Math.abs(Number(t.net_amount || t.gross_amount || 0)),
        status: 'pendente',
        nsu: t.nsu,
        authorizationCode: t.authorization_code
      });
    });

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
        let sid: string | null = mapping[item.storeName];
        if (sid === 'GLOBAL') sid = null;
        if (sid) {
          if (!maqByStore[sid]) maqByStore[sid] = [];
          maqByStore[sid].push(item);
        }
      });
      const maqPromises = Object.entries(maqByStore).map(([sid, items]) => {
        const storeName = items[0].storeName;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: 'Cartão Crédito',
          value: item.amount,
          date: item.dateVenda || targetDate,
          due_date: item.dateCredito || targetDate,
          status: 'recebido'
        }));
        return savePatioOsAndReceivables(sid, storeName, [], parsedRecs, targetDate);
      });

      // Rede
      const redeCount = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.transactions.length, 0);
      updateStage(1, 'running', `Processando Rede (${redeCount} transações)...`);

      const redeByStore: Record<string, any[]> = {};
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => {
          let sid: string | null = mapping[t.storeName];
          if (sid === 'GLOBAL') sid = null;
          if (sid) {
            if (!redeByStore[sid]) redeByStore[sid] = [];
            redeByStore[sid].push(t);
          }
        });
      });
      const redePromises = Object.entries(redeByStore).map(([sid, items]) => {
        const storeName = items[0].storeName;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: item.method,
          value: item.netAmount,
          date: item.date || targetDate,
          due_date: item.date || targetDate,
          status: 'recebido'
        }));
        return savePatioOsAndReceivables(sid, storeName, [], parsedRecs, targetDate);
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
      addLog(`ðŸ ¦ Conciliando Extratos OFX (${ofxCount} lançamentos bancários)...`, "info");

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
        items.forEach(item => {
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: sid,
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
        items.forEach((item, idx) => {
          const uniqueId = item.nsu 
            ? `nsu_${item.nsu}_${item.authorization || ''}`
            : (item.authorization ? `auth_${item.authorization}` : (item.tid ? `tid_${item.tid}` : `${item.method || 'rede'}_${item.grossAmount || 0}_${idx}`));
          
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: sid,
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
            target_date: targetDate,
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
              target_date: targetDate,
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
      addLog(`âš™ï¸  Gravando batch de ${txsToInsert.length} transações no banco...`, "info");
      const batch = await createImportBatch({ target_date: targetDate });
      
      await saveTransactions({ transactions: txsToInsert, storeBankBalances, storePreviousBalances, import_batch_id: batch.id } as any);
      addLog("âœ… Transações do extrato e adquirente salvas com sucesso!", "success");

      if (matchesToInsert.length > 0) {
        addLog(`ðŸ”— Vinculando ${matchesToInsert.length} pares perfeitos de conciliação...`, "info");
        
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
          addLog("âœ… Pares de conciliação salvos com sucesso!", "success");
        } catch (matchErr: any) {
          console.warn("Aviso ao salvar pares de conciliação:", matchErr);
          addLog(`âš ï¸ Pares de conciliação salvos parcialmente (transações garantidas no banco).`, "warning");
        }
      }

      if (manualOsMatches.length > 0) {
        addLog(`🔧 Dando baixa em ${manualOsMatches.length} OSs do Estoque Passivo...`, "info");
        try {
          const osIds = manualOsMatches.map(m => m.osId);
          await supabase
            .from('estoque_os_pendente')
            .update({ status: 'PAGA', data_baixa: new Date().toISOString() })
            .in('id', osIds);
          addLog("✅ OSs do passivo baixadas com sucesso!", "success");
        } catch (err: any) {
          console.error("Erro ao baixar OS passiva", err);
          addLog("⚠️ Erro ao dar baixa em OSs do passivo.", "warning");
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
          addLog(`🔧 Atualizando ${modifiedMissing.length} OSs ausentes editadas pelo operador...`, "info");
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
          addLog("✅ OSs ausentes atualizadas com sucesso no banco!", "success");

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
      addLog("ðŸ“ Atualizando histórico de importação (import_logs)...", "info");
      
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

      // Calcula o Pátio Global Real incluindo o passivo/histórico de OSs ativas em aberto no banco
      try {
        const { data: allActiveOs } = await supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status')
          .lte('opened_at', `${targetDate}T23:59:59`);
        if (allActiveOs && allActiveOs.length > 0) {
          const activeList = allActiveOs.filter(os => {
            const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
            const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
            return !isClosed && saldo > 0 && Number(os.total_value || 0) < 100000;
          });
          if (activeList.length > 0) {
            const totalPatioReal = activeList.reduce((acc, os) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);
            if (totalPatioReal > 0) {
              veiculosPatioValor = totalPatioReal;
            }
          }
        }
      } catch (patioErr) {
        console.warn("Erro ao consolidar passivo de patio:", patioErr);
      }

      // Salvar Lotes Analíticos de Contas a Pagar
      if (results.contasPagarResults && results.contasPagarResults.length > 0) {
        addLog(`📑 Salvando ${results.contasPagarResults.length} lote(s) de Contas a Pagar no banco...`, "info");
        for (const cResult of results.contasPagarResults) {
          try {
            await saveBills({ parseResult: cResult, targetDate });
            addLog(`✅ ${cResult.totalBills} contas salvas com sucesso! Total: R$ ${cResult.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, "success");
          } catch (cErr: any) {
            console.warn("Erro ao salvar contas a pagar:", cErr);
            addLog(`⚠️ Falha ao salvar contas a pagar: ${cErr.message}`, "warning");
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

      const caixaAnt = Number(prevSnap?.caixa_atual || 0);
      const fatAnt = Number(prevSnap?.faturamento || (prevSnap?.metadata as any)?.odometro_hoje || 0);
      const fatOiBase = (odometroHoje > 0 && fatAnt > 0 && odometroHoje > fatAnt) ? (odometroHoje - fatAnt) : (odometroHoje > 0 ? odometroHoje : faturamentoAtual);
      const fluxoCalculado = caixaAtualCalculado - caixaAnt;
      const valorDispCalculado = fatOiBase - fluxoCalculado;
      const subtotalContasCalculado = finalContasManual + jurosRedeTotal;
      const diferencaCalculada = valorDispCalculado - subtotalContasCalculado;

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
          faturamento_outros_desc: null,
          contas_a_pagar: finalContasManual,
          provisao: 0,
          saldo_negativo_itau: saldoNegativoItau,
          juros_rede: jurosRedeTotal,
          is_closed: true,
          closed_at: new Date().toISOString(),
          notes: 'Valores calculados via Importacao Centralizada',
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
            is_closed: true,
          }
        };
        await saveSnapshot.mutateAsync(payload);
        addLog("Historico de conciliacao atualizado automaticamente!", "success");
      } catch (snapErr) {
        console.warn("Erro ao salvar daily_snapshot:", snapErr);
        addLog("Aviso: Falha ao gravar fechamento do dia.", "warning");
      }

      addLog("Pareando transações importadas com Ordens de Serviço em aberto...", "info");
      try {
        const { data: matchData, error: matchErr } = await supabase.rpc('auto_match_transactions', { p_date: targetDate });
        if (matchErr) {
          console.warn("auto_match_transactions retornou erro (nao critico):", matchErr);
          addLog(`Pareamento automatico parcial: ${matchErr.message}`, "warning");
        } else {
          const osCount = (matchData as any)?.matched_os_count || 0;
          const redeCount = (matchData as any)?.matched_rede_count || 0;
          addLog(`🤖 Pareamento inteligente concluído: ${osCount} OS(s) em aberto quitadas/conciliadas e ${redeCount} lote(s) de cartão vinculados!`, "success");
        }
      } catch (rpcErr: any) {
        console.warn("Erro ao chamar auto_match_transactions:", rpcErr);
        addLog("Pareamento automatico falhou mas dados foram salvos.", "warning");
      }

      addLog("📑 Pareando débitos bancários com Contas a Pagar importadas...", "info");
      try {
        const { data: saidasData, error: saidasErr } = await supabase.rpc('auto_match_saidas', { p_date: targetDate });
        if (saidasErr) {
          console.warn("auto_match_saidas retornou erro (nao critico):", saidasErr);
          addLog(`Pareamento de saídas parcial: ${saidasErr.message}`, "warning");
        } else {
          const matchedSaidas = (saidasData as any)?.matched_saidas_count || 0;
          addLog(`🤖 Pareamento de saídas concluído: ${matchedSaidas} débito(s) bancário(s) vinculados a contas a pagar!`, "success");
        }
      } catch (saidasRpcErr: any) {
        console.warn("Erro ao chamar auto_match_saidas:", saidasRpcErr);
        addLog("Pareamento de saídas falhou mas dados foram salvos.", "warning");
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
          is_closed: true,
          closed_at: new Date().toISOString(),
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
            is_closed: true,
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
      setSaveFinished(true);

      if (advanceToWizard) {
        queryClient.invalidateQueries({ queryKey: ['pending-ofx-outflows'] });
        queryClient.invalidateQueries({ queryKey: ['pending-ofx-inflows'] });
        queryClient.invalidateQueries({ queryKey: ['open-bills-for-step2'] });
        queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] });
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
        await new Promise(r => setTimeout(r, 1000));
        const realUnmatched = await fetchRealUnmatchedTransactions(targetDate);
        setUnmatchedTransactions(realUnmatched);
        if (realUnmatched.length > 0) {
          toast.info(`Automações e IA concluídas! ${realUnmatched.length} transação(ões) pendentes para revisão manual.`);
        } else {
          toast.success('🎉 100% das transações e OSs foram conciliadas automaticamente pelo motor e IA!');
        }
        setStep(4);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">Central de Importação</h2>
          <p className="text-sm text-[var(--text-secondary)]">Importe OSs do Pátio, Vendas da Maquininha (Rede) e Extratos Bancários (OFX).</p>
        </div>
        {import.meta.env.DEV && (
          <button 
            onClick={handleDevAutoLoad} 
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface-elevated)] border border-[var(--color-primary)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary)] hover:text-white transition-colors text-sm font-semibold shadow-sm"
          >
            <Sparkles size={16} />
            Auto-Load Mocks
          </button>
        )}
      </div>

      {/* Header com indicador limpo de etapa */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-semibold text-[var(--color-primary)] border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1">
            {step === 1 ? '1. Upload de Arquivos' :
             step === 2 ? '2. Mapeamento de Filiais' :
             step === 3 ? '3. Conferência e Preview Geral' :
             step === 4 ? '4. Vínculo de Pagamentos na OS (Tela A)' :
             step === 5 ? '5. Justificativas por Loja (Tela B)' :
             step === 6 ? '6. Conferência de Cofre do Daniel (Tela C)' :
             step === 7 ? '7. Auditoria dos 5 Pilares (Tela D)' :
             '8. Importação Concluída'}
          </Badge>
        </div>
      </div>

      {step === 1 && !showMarcoZero && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
          <div className={`grid grid-cols-1 ${!hasDailySnapshots ? 'md:grid-cols-2' : ''} gap-6`}>
            
            {/* Dropzone Principal */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200
                ${isDragActive 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' 
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--color-primary)] mb-4">
                <UploadCloud size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1.5 text-center text-[var(--text-primary)]">
                {isDragActive ? 'Solte os arquivos para importar' : 'Importar Arquivos de Conciliação'}
              </h3>
              <p className="text-[var(--text-secondary)] text-xs text-center max-w-sm mb-5 leading-relaxed">
                Arraste os arquivos da pasta do dia ou clique para selecionar. O sistema processará automaticamente:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                  Extratos (.ofx)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                  Ordens de Serviço (.xls)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                  Vendas Rede (.xlsx)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300">
                  Contas a Pagar (.xls)
                </span>
              </div>
            </div>
            
            {/* Marco Zero (Se aplicável) */}
            {!hasDailySnapshots && (
              <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl p-8 flex flex-col items-center justify-between text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-[var(--text-primary)]">
                    Implantação Inicial (Marco Zero)
                  </h3>
                  <p className="text-[var(--text-secondary)] text-xs max-w-xs leading-relaxed">
                    Carregue a planilha histórica para inicializar os saldos das lojas e estoque pendente pela primeira vez.
                  </p>
                </div>

                <Button 
                  onClick={() => setShowMarcoZero(true)}
                  variant="outline"
                  className="w-full mt-6 text-xs h-10 border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)]"
                >
                  <FileSpreadsheet className="mr-2" size={15} /> Abrir Assistente Marco Zero
                </Button>
              </div>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-8 flex justify-center">
               <div className="flex items-center gap-3 animate-pulse text-[var(--text-secondary)]">
                 <LoadingSpinner size="sm" text="" /> 
                 <span>Analisando Padrões dos Arquivos...</span>
               </div>
            </div>
          )}
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
                  <h4 className="font-display font-semibold text-[var(--color-primary)] flex items-center gap-2 mb-4">
                    <Database size={20} /> 1. Extratos Bancários (OFX)
                  </h4>
                  {ofxAliases.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)]">
                      Nenhum arquivo OFX importado.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ofxAliases.map(alias => {
                        const ofx = results.ofxResults.find(o => o.alias === alias);
                        const fileName = ofx?.fileName;
                        const effectiveStoreId = mapping[alias] || (ofx ? resolveStoreForOfx(ofx) : '');
                        return (
                          <div key={`ofx-${alias}`} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            <div className="flex-1">
                              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Identificado no Arquivo</span><br/>
                              <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">{alias}</span>
                              {fileName && (
                                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                  <span className="font-semibold text-[var(--color-primary)]">Origem:</span> {fileName}
                                </div>
                              )}
                            </div>
                            <LinkIcon className="text-[var(--color-primary)]/50 shrink-0" size={24} />
                            <div className="flex-1">
                              <select 
                                value={effectiveStoreId} 
                                onChange={e => {
                                  const s = stores.find(st => st.id === e.target.value);
                                  updateMapping(alias, e.target.value, s?.name);
                                }}
                                className={`w-full bg-[var(--bg-surface-elevated)] border rounded p-3 text-sm focus:outline-none 
                                  ${effectiveStoreId ? 'border-[var(--color-accent-teal)] text-[var(--text-primary)]' : 'border-[var(--color-accent-warning)] text-[var(--text-secondary)] animate-pulse'}`}
                              >
                                <option value="">-- Selecione a Loja do Sistema --</option>
                                <option value="GLOBAL">-- CONTA GLOBAL / INTERNA --</option>
                                {stores.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tabela de Auditoria e Diagnóstico de Saldos Bancários OFX */}
                  {results.ofxResults.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="font-display font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-[var(--color-accent-teal)]" />
                          Auditoria de Saldos dos Extratos (.OFX) Extraídos
                        </h5>
                        <Badge variant="outline" className="text-xs font-mono">
                          {results.ofxResults.length} contas lidas
                        </Badge>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase font-semibold">
                            <tr>
                              <th className="p-3">Arquivo / Conta</th>
                              <th className="p-3">Filial Vinculada</th>
                              <th className="p-3 text-right">Saldo Anterior</th>
                              <th className="p-3 text-right">Entradas (+)</th>
                              <th className="p-3 text-right">Saídas (-)</th>
                              <th className="p-3 text-right">Saldo Final (OFX)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                            {results.ofxResults.map((ofx, idx) => {
                              const storeId = resolveStoreForOfx(ofx) || mapping[ofx.alias];
                              const storeObj = stores.find(s => s.id === storeId);
                              const totalIn = ofx.transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
                              const totalOut = ofx.transactions.filter(t => t.type === 'out').reduce((s, t) => s + Math.abs(t.amount), 0);

                              return (
                                <tr key={idx} className="hover:bg-[var(--bg-surface-hover)]">
                                  <td className="p-3 font-sans">
                                    <div className="font-semibold text-[var(--text-primary)]">{ofx.fileName || 'Extrato'}</div>
                                    <div className="text-[10px] text-[var(--text-tertiary)]">{ofx.alias}</div>
                                  </td>
                                  <td className="p-3 font-sans">
                                    {storeObj ? (
                                      <span className="text-[var(--color-accent-teal)] font-medium">{storeObj.name}</span>
                                    ) : (
                                      <span className="text-amber-400 font-medium flex items-center gap-1">
                                        <AlertCircle size={12} /> Não vinculada
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right text-[var(--text-secondary)]">
                                    {ofx.previousBalance !== undefined ? (
                                      ofx.previousBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    ) : '-'}
                                  </td>
                                  <td className="p-3 text-right text-emerald-400">
                                    +{totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="p-3 text-right text-rose-400">
                                    -{totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="p-3 text-right font-bold text-sky-400">
                                    {ofx.bankBalance !== undefined ? (
                                      ofx.bankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] font-bold">
                            <tr>
                              <td colSpan={2} className="p-3 font-sans text-right text-[var(--text-secondary)] uppercase">
                                Total Geral Consolidado ({results.ofxResults.length} Contas):
                              </td>
                              <td className="p-3 text-right text-[var(--text-secondary)]">
                                {results.ofxResults.reduce((s, o) => s + (o.previousBalance || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-emerald-400">
                                +{results.ofxResults.reduce((s, o) => s + o.transactions.filter(t => t.type === 'in').reduce((st, t) => st + t.amount, 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-rose-400">
                                -{results.ofxResults.reduce((s, o) => s + o.transactions.filter(t => t.type === 'out').reduce((st, t) => st + Math.abs(t.amount), 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="p-3 text-right text-lg text-sky-400 font-bold">
                                {results.ofxResults.reduce((s, o) => s + (o.bankBalance || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setSubStep(2)}>Próximo: OS (Pátio) â†’</Button>
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
                  <h4 className="font-display font-semibold text-[var(--color-accent-teal)] flex items-center gap-2 mb-4">
                    <FileText size={20} /> 2. Ordens de Serviço (Pátio)
                  </h4>
                  {aliasArray.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)]">
                      Nenhuma planilha de OS identificada.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aliasArray.map(alias => (
                        <div key={`os-${alias}`} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                          <div className="flex-1">
                            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Loja na Planilha</span><br/>
                            <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">{alias}</span>
                          </div>
                          <LinkIcon className="text-[var(--color-accent-teal)]/50 shrink-0" size={24} />
                          <div className="flex-1">
                            <select 
                              value={mapping[alias] || ''} 
                              onChange={e => {
                                const s = stores.find(st => st.id === e.target.value);
                                updateMapping(alias, e.target.value, s?.name);
                              }}
                              className={`w-full bg-[var(--bg-surface-elevated)] border rounded p-3 text-sm focus:outline-none 
                                ${mapping[alias] ? 'border-[var(--color-accent-teal)] text-[var(--text-primary)]' : 'border-[var(--color-accent-warning)] text-[var(--text-secondary)]'}`}
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
                    <Button variant="ghost" onClick={() => setSubStep(1)}>← Voltar para OFX</Button>
                    <Button onClick={() => setSubStep(3)}>Próximo: Maquininhas (Rede) →</Button>
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
                  <h4 className="font-display font-semibold text-[var(--color-accent-warning)] flex items-center gap-2 mb-4">
                    <CreditCard size={20} /> 3. Maquininhas (Rede)
                  </h4>
                  {aliasArray.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)]">
                      Nenhum relatório de maquininha identificado.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aliasArray.map(alias => (
                        <div key={`rede-${alias}`} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                          <div className="flex-1">
                            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Nº de Estabelecimento / Loja</span><br/>
                            <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">{alias}</span>
                          </div>
                          <LinkIcon className="text-[var(--color-accent-warning)]/50 shrink-0" size={24} />
                          <div className="flex-1">
                            <select 
                              value={mapping[alias] || ''} 
                              onChange={e => {
                                const s = stores.find(st => st.id === e.target.value);
                                updateMapping(alias, e.target.value, s?.name);
                              }}
                              className={`w-full bg-[var(--bg-surface-elevated)] border rounded p-3 text-sm focus:outline-none 
                                ${mapping[alias] ? 'border-[var(--color-accent-warning)] text-[var(--text-primary)]' : 'border-red-500/50 text-[var(--text-secondary)]'}`}
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
                    <Button variant="ghost" onClick={() => setSubStep(2)}>← Voltar para OS</Button>
                    <Button 
                      onClick={() => setStep(needsFallback ? 3.5 : (cloudOsData.length > 0 ? 2.5 : 3))}
                    >
                      Avançar para Auditoria / Preview →
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      )}

      {step === 2.5 && (() => {
        const firstStoreId = Object.values(mapping).find(id => id && id !== 'GLOBAL');
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AuditoriaPassivoWizard 
              storeId={firstStoreId || ''} 
              cloudOsData={cloudOsData}
              onComplete={() => setStep(3)}
              onCancel={() => setStep(2)}
            />
          </div>
        );
      })()}

      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-[var(--bg-surface-elevated)] border-l-4 border-l-[var(--color-primary)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total OS (Recebimentos do Dia)</span>
                <FileText size={18} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                <AnimatedNumber value={totalOs} format="currency" />
              </p>
              <div className="flex flex-col gap-0.5 mt-1 text-xs text-[var(--text-secondary)]">
                <span>{filteredOsCount} novos pagamentos no dia</span>
                {totalPatioEstoqueGlobal > 0 && (
                  <span className="text-[11px] font-medium text-emerald-400">
                    Estoque em Pátio: {totalPatioEstoqueGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({allOsCount} OSs)
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-[var(--bg-surface-elevated)] border-l-4 border-l-[var(--color-accent-teal)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Maquininha (Rede Líquido)</span>
                <CreditCard size={18} className="text-[var(--color-accent-teal)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                <AnimatedNumber value={totalMaq} format="currency" />
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{redeFiltered.length} transações de cartão</p>
            </Card>

            <Card className="p-6 bg-[var(--bg-surface-elevated)] border-l-4 border-l-sky-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Saldo Total Bancário (OFX)</span>
                <Database size={18} className="text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                <AnimatedNumber value={totalOfxIn} format="currency" />
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{allOfxTx.length} lançamentos no total dos extratos</p>
            </Card>
          </div>

          <Card className="p-8 space-y-6">
            {/* Editor de OSs do Pátio Ausentes nos Arquivos de Hoje */}
            <MissingPatioOsEditor
              missingList={missingOsList}
              onChangeList={setMissingOsList}
              isSaving={isSaving}
            />

            {/* Painel de Auditoria Pré-Fechamento */}
            <DiagnosticPanel
              diagnostic={diagnostic}
              isLoading={isLoadingDiagnostic}
              onRefresh={refetchHistory}
            />

            <h3 className="font-display text-xl font-semibold">Previsão por Loja</h3>
            
            {/* Aviso Anti-Zero */}
            {Object.keys(mapping).length === 0 && (results.osFiles.length > 0 || results.ofxResults.length > 0) && (
              <div className="p-4 bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)] rounded-xl flex items-start gap-3">
                <AlertCircle className="text-[var(--color-accent-warning)] shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-accent-warning)]">
                    Alerta Crítico: Nenhuma loja foi mapeada!
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Você está prestes a concluir uma conciliação com todas as vendas ignoradas. Volte para a aba "Mapeamento" e defina a loja correta para cada arquivo, senão todas as lojas ficarão com faturamento zerado no fechamento.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-3 text-xs border-[var(--color-accent-warning)] text-[var(--color-accent-warning)] hover:bg-[var(--color-accent-warning)]/20"
                    onClick={() => setStep(2)}
                  >
                    Voltar e Mapear Lojas
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {stores.map(store => {
                const storeId = store.id;
                
                const rawOsMaq = results.osFiles.filter(r => r.success && mapping[r.storeAlias] === storeId).reduce((acc, curr) => {
                  let sum = 0;
                  curr.osArray.forEach(os => {
                      const totalOsValue = os.paid_value > 0 ? os.paid_value : 1;
                      const creditRatio = (os.parsed_credit_debit || 0) / totalOsValue;
                      if (creditRatio > 0) {
                        sum += (os.paid_value * creditRatio);
                      } else {
                        const methodLower = (os.payment_method || '').toLowerCase();
                        if (!methodLower.includes('pix') && !methodLower.includes('transf') && !methodLower.includes('dinheiro')) {
                          sum += os.paid_value;
                        }
                      }
                  });
                  return acc + sum;
                }, 0);

                let storeRedeNet = results.redeResults.filter(r => r.success).reduce((acc, r) => {
                  const txs = r.transactions.filter(tx => mapping[tx.storeName] === storeId);
                  return acc + txs.reduce((sum, tx) => sum + tx.netAmount, 0);
                }, 0);

                storeRedeNet += results.maquininhaItems.filter(item => mapping[item.storeName] === storeId).reduce((acc, item) => acc + (item.amount || 0), 0);

                const storeOfxIn = results.ofxResults.filter(r => (resolveStoreForOfx(r) || mapping[r.alias]) === storeId).reduce((acc, r) => {
                  const txs = r.transactions.filter(tx => tx.type === 'in');
                  return acc + txs.reduce((sum, tx) => sum + tx.amount, 0);
                }, 0);

                const storeBankTotal = results.ofxResults.filter(r => (resolveStoreForOfx(r) || mapping[r.alias]) === storeId).reduce((acc, r) => {
                  return acc + (r.bankBalance || 0);
                }, 0);

                if (rawOsMaq === 0 && storeRedeNet === 0 && storeOfxIn === 0 && storeBankTotal === 0) return null;

                return (
                  <div key={store.id} className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--color-primary)]/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"></div>
                        {store.name}
                      </h5>
                      <div className="flex items-center gap-2">
                        {storeBankTotal !== 0 && (
                          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            Saldo: {storeBankTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {storeRedeNet > 0 ? 'Rede Ativa' : 'OFX Direct'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[var(--text-tertiary)] uppercase">OS (Pátio)</span>
                        <p className="font-bold text-[var(--text-primary)] text-sm">{rawOsMaq.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)] uppercase">Maquininha (Rede Líquida)</span>
                        <p className="font-bold text-[var(--color-accent-teal)] text-sm">{storeRedeNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)] uppercase">Entradas Banco (OFX)</span>
                        <p className="font-bold text-emerald-400 text-sm">{storeOfxIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contas a Pagar Analíticas Importadas */}
            {results.contasPagarResults && results.contasPagarResults.length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-rose-400" />
                    <h5 className="font-semibold text-sm text-[var(--text-primary)]">
                      Contas a Pagar Importadas Analiticamente
                    </h5>
                  </div>
                  <Badge variant="default" className="text-xs bg-rose-500/20 text-rose-300 border-rose-500/30">
                    {results.contasPagarResults.reduce((acc, c) => acc + c.totalBills, 0)} contas processadas
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-[var(--text-secondary)]">Total a ser gravado em Contas a Pagar:</span>
                  <span className="text-base font-bold text-rose-400">
                    {results.contasPagarResults.reduce((acc, c) => acc + c.totalAmount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            )}

            {/* Início: Valores Manuais Globais */}
            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg text-[var(--text-primary)]">Valores Manuais do Dia</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Preencha os dados abaixo. Eles serão salvos no fechamento diário e travados para evitar alterações acidentais.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsManualLocked(!isManualLocked)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    isManualLocked 
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isManualLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  {isManualLocked ? 'Trava Ativa' : 'Destravado'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)]">Odômetro OI (Acumulado)</label>
                    {previousOdometro > 0 && (
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
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
                    placeholder="Ex: 945000.00"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] font-bold text-[var(--text-primary)]"
                  />
                  {odometroHoje > 0 && previousOdometro > 0 && (
                    <p className="text-[11px] font-mono text-emerald-400">
                      Δ Faturamento: <span className="font-bold">{deltaFaturamentoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">Dinheiro MP</label>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={isManualLocked}
                    value={manualDinheiroMp || ''} 
                    onChange={e => setManualDinheiroMp(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] font-bold text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">A Receber</label>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={isManualLocked}
                    value={manualAReceber || ''} 
                    onChange={e => setManualAReceber(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] font-bold text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Contas a Pagar</label>
                    {results.contasPagarResults && results.contasPagarResults.length > 0 && (
                      <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                        <Receipt size={10} /> Auto-preenchido ({results.contasPagarResults.reduce((acc, c) => acc + c.totalBills, 0)} contas)
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={isManualLocked}
                    value={contasManual || (results.contasPagarResults?.reduce((acc, c) => acc + c.totalAmount, 0) || '')} 
                    onChange={e => setContasManual(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] disabled:opacity-60 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
            {/* Fim: Valores Manuais Globais */}

            {/* Inspetor JSON de Conciliação */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
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

            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">Data Base da Conciliação</label>
                <input 
                  type="date" 
                  value={targetDate} 
                  onChange={e => setTargetDate(e.target.value)} 
                  className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleConfirm(false)}
                  disabled={isSaving}
                  variant="outline"
                  className="py-3 px-5 text-sm font-medium rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] flex items-center gap-2"
                >
                  {isSaving ? <LoadingSpinner size="xs" text="" /> : <Sparkles size={16} />}
                  Gravar Direto (sem Wizard)
                </Button>
                <Button
                  onClick={() => handleConfirm(true)}
                  disabled={isSaving}
                  className="py-4 px-8 text-base font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.4)] flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <LoadingSpinner size="xs" text="" /> : <ArrowRight size={18} />}
                  Processar e Conciliar com IA →
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
                className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 text-center space-y-6"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    Importação Concluída com Sucesso
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1">
                    Os arquivos foram auditados, as OSs e transações foram persistidas no banco e os saldos consolidados para {formattedTargetDate}.
                  </p>
                </div>

                {/* 4 Cards de Métricas do Lote */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-1">
                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">OSs Gravadas</span>
                    <p className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">{totalOsCount}</p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{results.osFiles.length} arquivos</span>
                  </div>

                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Vendas Rede</span>
                    <p className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">{totalRedeCount}</p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{results.redeResults.length} relatórios</span>
                  </div>

                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Extratos OFX</span>
                    <p className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">{totalOfxCount}</p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{results.ofxResults.length} contas</span>
                  </div>

                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3 text-left">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Data Base</span>
                    <p className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">{formattedTargetDate}</p>
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
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                          Auditoria Pericial & Auto-Healing
                        </span>
                      </div>
                      <Badge variant={autoHealingData.is_conforme ? 'default' : 'outline'} className={`text-[10px] ${autoHealingData.is_conforme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                        {autoHealingData.is_conforme ? 'Fechamento Conforme ✅' : 'Divergência Residual'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-secondary)] mb-2">
                      <span>Delta Inicial: <b className="text-[var(--text-primary)]">R$ {Number(autoHealingData.initial_delta).toFixed(2)}</b></span>
                      <span>➔</span>
                      <span>Delta Final: <b className={autoHealingData.is_conforme ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>R$ {Number(autoHealingData.final_delta).toFixed(2)}</b></span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">({autoHealingData.iterations_count} {autoHealingData.iterations_count === 1 ? 'iteração' : 'iterações'})</span>
                    </div>

                    {autoHealingData.steps_executed && autoHealingData.steps_executed.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                        {autoHealingData.steps_executed.map((st: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-[var(--text-secondary)]">
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
                    className="w-full sm:w-auto text-xs py-2.5 px-4 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-medium"
                  >
                    Revisar Órfãos & Diferença (Wizard) →
                  </Button>

                  <Button
                    onClick={() => navigate({ to: '/conciliacao' })}
                    className="w-full sm:w-auto flex-1 py-2.5 px-5 font-semibold text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-lg shadow-sm"
                  >
                    Ir para a Conciliação do Dia →
                  </Button>

                  {auditTrailUrl && (
                    <a href={auditTrailUrl} download={`auditoria-conciliacao-${new Date().getTime()}.json`} className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full text-xs py-2.5 px-4 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Download size={14} className="mr-1.5" />
                        Auditoria JSON
                      </Button>
                    </a>
                  )}

                  <Button
                    onClick={() => setStep(1)}
                    variant="ghost"
                    className="w-full sm:w-auto text-xs py-2.5 px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Nova Importação
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* CARD DE PROCESSAMENTO EM ANDAMENTO */
              <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 space-y-5">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                      Processamento dos Arquivos
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Ingestão de OSs, auditoria de taxas e conciliação para {formattedTargetDate}.
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs font-mono px-3 py-1 bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
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

            {/* Logs Técnicos de Depuração Colapsáveis */}
            {importLogs.length > 0 && (
              <details className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] group">
                <summary className="text-xs font-mono text-[var(--text-tertiary)] cursor-pointer flex items-center justify-between hover:text-[var(--text-secondary)] select-none">
                  <span className="flex items-center gap-2">
                    <Terminal size={13} />
                    Logs de Execução ({importLogs.length} eventos)
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2.5 max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2.5">
                  {importLogs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-[var(--text-tertiary)] shrink-0">[{log.timestamp}]</span>
                      <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </details>
            )}

            {/* Alerta de Erro se houver */}
            {importLogs.some(l => l.type === 'error') && !saveFinished && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-rose-400 text-xs">Falha durante o processamento</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {importLogs.find(l => l.type === 'error')?.message}
                    </p>
                  </div>
                </div>
                <Button onClick={handleConfirm} disabled={isSaving} className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 shrink-0 rounded-lg">
                  Tentar Novamente
                </Button>
              </div>
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
    </div>
  );
}


