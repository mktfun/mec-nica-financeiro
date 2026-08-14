import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Layers, 
  CreditCard,
  Building2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Lock,
  Unlock,
  Terminal,
  Database,
  Search,
  ArrowRight,
  TrendingUp,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { useCentralImport } from '@/hooks/useCentralImport';
import { useBulkInsertTransactions, useCreateImportBatch, useBulkInsertConciliationMatches } from '@/hooks/useTransactions';
import { useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { savePatioOsAndReceivables, ParsedReceivable } from '@/hooks/useImportProcessor';
import { parseMarcoZeroPlanilha, MarcoZeroResult } from '@/lib/parsers/marcoZeroParser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface DailyImportViewProps {
  initialDate?: string;
  onSuccess?: () => void;
}

export interface OrphanPatioOs {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name?: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado' | 'cancelado';
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  opened_at?: string;
  days_open?: number;
}

export interface AutoMatchPair {
  osNumber: string;
  storeName: string;
  osValue: number;
  bankTxTitle: string;
  bankTxAmount: number;
  fitid?: string;
  diff: number;
}

export function DailyImportView({ initialDate, onSuccess }: DailyImportViewProps) {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [targetDate, setTargetDate] = useState<string>(initialDate || todayStr);

  // Modo de Importação: Fechamento Diário vs Marco Zero
  const [importMode, setImportMode] = useState<'diario' | 'marco-zero'>('diario');
  const [marcoZeroData, setMarcoZeroData] = useState<MarcoZeroResult | null>(null);

  // Trava de inputs manuais
  const [isManualLocked, setIsManualLocked] = useState<boolean>(true);

  // Aba ativa de preview de dados
  const [previewTab, setPreviewTab] = useState<'ofx' | 'os' | 'rede' | 'matches'>('ofx');

  // Cópia de JSON feedback
  const [copiedJson, setCopiedJson] = useState(false);

  // Logs de execução
  const [importLogs, setImportLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [savePhase, setSavePhase] = useState<'idle' | 'os' | 'rede' | 'ofx' | 'matches' | 'snapshot' | 'completed'>('idle');

  useEffect(() => {
    if (initialDate) {
      setTargetDate(initialDate);
    }
  }, [initialDate]);

  // Stores e Mapeamento persistente via Supabase
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping } = useStoreFileMappings(stores);

  // Hook central de parsing de arquivos
  const { processFiles, isProcessing, results } = useCentralImport();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Inputs Manuais Globais do Fechamento
  const [odometroHoje, setOdometroHoje] = useState<number | ''>('');
  const [dinheiroMp, setDinheiroMp] = useState<number | ''>('');
  const [aReceber, setAReceber] = useState<number | ''>('');
  const [contasManual, setContasManual] = useState<number | ''>('');

  const [orphanOsList, setOrphanOsList] = useState<OrphanPatioOs[]>([]);
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);

  const queryClient = useQueryClient();

  // Persistência
  const { mutateAsync: saveTransactions } = useBulkInsertTransactions();
  const { mutateAsync: createImportBatch } = useCreateImportBatch();
  const { mutateAsync: insertConciliationMatches } = useBulkInsertConciliationMatches();
  const saveSnapshot = useSaveDailySnapshot();
  const [isSaving, setIsSaving] = useState(false);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setImportLogs(prev => [...prev, { time, msg, type }]);
  };

  // 1. Upload Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingFiles(acceptedFiles);

    if (importMode === 'marco-zero') {
      try {
        addLog(`Iniciando leitura da planilha de Marco Zero: ${acceptedFiles[0].name}`, 'info');
        const parsed = await parseMarcoZeroPlanilha(acceptedFiles[0]);
        setMarcoZeroData(parsed);
        toast.success(`Marco Zero processado! ${parsed.stores.length} lojas encontradas.`);
        addLog(`Planilha de Marco Zero processada com sucesso: ${parsed.stores.length} lojas.`, 'success');
      } catch (err: any) {
        toast.error('Erro ao ler Marco Zero: ' + err.message);
        addLog(`Falha ao processar Marco Zero: ${err.message}`, 'error');
      }
    } else {
      addLog(`Processando ${acceptedFiles.length} arquivo(s)...`, 'info');
      await processFiles(acceptedFiles);
      addLog(`Arquivos processados e prontos para conferência.`, 'success');
    }
  }, [processFiles, importMode]);

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

  // 2. Detecção em tempo real de OSs Órfãs no Supabase
  useEffect(() => {
    async function detectOrphanOs() {
      const activeStoreIds = Object.values(mapping).filter(id => id && id !== 'GLOBAL');
      if (activeStoreIds.length === 0) return;

      setIsLoadingOrphans(true);
      try {
        const { data: dbActiveOs, error } = await supabase
          .from('patio_os')
          .select('id, os_number, plate, store_id, store_name, total_value, paid_value, status, opened_at, days_open')
          .in('store_id', activeStoreIds)
          .in('status', ['em_aberto', 'pago_parcial', 'ABERTA', 'PENDENTE']);

        if (error) {
          console.error('[DailyImportView] Erro ao buscar OSs ativas:', error);
          return;
        }

        const importedOsNumbersByStore = new Set<string>();
        results.osFiles.filter(f => f.success).forEach(file => {
          const storeId = mapping[file.storeAlias];
          file.osArray.forEach(os => {
            importedOsNumbersByStore.add(`${storeId}_${String(os.os_number).trim()}`);
          });
        });

        const orphans: OrphanPatioOs[] = (dbActiveOs || [])
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
            status: (dbOs.status as any) || 'em_aberto',
            opened_at: dbOs.opened_at,
            days_open: dbOs.days_open
          }));

        setOrphanOsList(orphans);
      } catch (err) {
        console.error('[DailyImportView] Erro ao detectar OSs órfãs:', err);
      } finally {
        setIsLoadingOrphans(false);
      }
    }

    detectOrphanOs();
  }, [mapping, results.osFiles, stores]);

  const updateOrphanOs = (id: string, field: 'total_value' | 'paid_value' | 'status', value: any) => {
    setOrphanOsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // 3. Totais e Métricas de Preview
  const totalOsParsed = results.osFiles.filter(r => r.success).reduce((acc, curr) => {
    return acc + curr.osArray.reduce((sum, os) => sum + (os.total_value || 0), 0);
  }, 0);

  const totalOsPaid = results.osFiles.filter(r => r.success).reduce((acc, curr) => {
    return acc + curr.osArray.reduce((sum, os) => sum + (os.paid_value || 0), 0);
  }, 0);

  const totalMaqParsed = results.redeResults.filter(r => r.success).reduce((acc, curr) => {
    return acc + curr.transactions.reduce((sum, t) => sum + (t.netAmount || 0), 0);
  }, 0);

  const totalOfxInParsed = results.ofxResults.reduce((acc, curr) => {
    return acc + curr.transactions.filter(t => t.type === 'in' || t.amount > 0).reduce((sum, t) => sum + (t.amount || 0), 0);
  }, 0);

  const totalOfxOutParsed = results.ofxResults.reduce((acc, curr) => {
    return acc + curr.transactions.filter(t => t.type === 'out' || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  }, 0);

  const fileAliases = Array.from(new Set([
    ...results.osFiles.filter(r => r.success).map(r => r.storeAlias),
    ...results.maquininhaItems.map(i => i.storeName),
    ...results.ofxResults.map(o => o.alias),
    ...results.redeResults.filter(r => r.success).flatMap(r => r.transactions.map(t => t.storeName))
  ]));

  const hasProcessedFiles = results.osFiles.length > 0 || results.ofxResults.length > 0 || results.redeResults.length > 0 || !!marcoZeroData;

  // 4. Auto-Match Engine (Cálculo em tempo real de casamentos OS vs Banco)
  const autoMatches = useMemo<AutoMatchPair[]>(() => {
    const matches: AutoMatchPair[] = [];
    const allBankInTxs = results.ofxResults.flatMap(o => 
      o.transactions.filter(t => t.type === 'in' || t.amount > 0).map(t => ({ ...t, alias: o.alias }))
    );

    results.osFiles.filter(f => f.success).forEach(file => {
      const storeName = file.storeAlias;
      file.osArray.forEach(os => {
        const val = os.paid_value || os.total_value;
        if (val > 0) {
          const matchedTx = allBankInTxs.find(tx => Math.abs(tx.amount - val) < 0.05);
          if (matchedTx) {
            matches.push({
              osNumber: String(os.os_number),
              storeName,
              osValue: val,
              bankTxTitle: matchedTx.title || matchedTx.counterpart_name || 'PIX/Transferência',
              bankTxAmount: matchedTx.amount,
              fitid: matchedTx.fitid,
              diff: Math.abs(matchedTx.amount - val)
            });
          }
        }
      });
    });

    return matches;
  }, [results.ofxResults, results.osFiles]);

  // 5. JSON Payload Inspector em Tempo Real
  const generatedJsonPayload = useMemo(() => {
    return {
      target_date: targetDate,
      summary: {
        total_os_bruto: totalOsParsed,
        total_os_pago: totalOsPaid,
        total_maquininha_liquido: totalMaqParsed,
        total_ofx_entradas: totalOfxInParsed,
        total_ofx_saidas: totalOfxOutParsed,
        odometro_acumulado_hoje: Number(odometroHoje) || 0,
        dinheiro_mp: Number(dinheiroMp) || 0,
        a_receber_manual: Number(aReceber) || 0,
        contas_manual: Number(contasManual) || 0
      },
      file_mappings: mapping,
      orphan_os_modifications: orphanOsList.filter(
        os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
      ),
      auto_matches_count: autoMatches.length,
      ofx_transactions_count: results.ofxResults.reduce((acc, f) => acc + f.transactions.length, 0),
      os_records_count: results.osFiles.reduce((acc, f) => acc + f.osArray.length, 0),
      rede_transactions_count: results.redeResults.reduce((acc, f) => acc + f.transactions.length, 0)
    };
  }, [targetDate, totalOsParsed, totalOsPaid, totalMaqParsed, totalOfxInParsed, totalOfxOutParsed, odometroHoje, dinheiroMp, aReceber, contasManual, mapping, orphanOsList, autoMatches, results]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedJsonPayload, null, 2));
    setCopiedJson(true);
    toast.success('JSON de conciliação copiado para a área de transferência!');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // 6. Gravação Final em Lote (Batch Mutation)
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setSaveProgress(10);
    setSavePhase('os');
    addLog('Iniciando gravação e consolidação do lote no banco de dados...', 'info');
    const toastId = toast.loading('Gravando fechamento diário e processando arquivos...');

    try {
      // 6.1 Atualizar OSs órfãs modificadas
      const modifiedOrphans = orphanOsList.filter(
        os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
      );

      if (modifiedOrphans.length > 0) {
        addLog(`Atualizando ${modifiedOrphans.length} OS(s) órfãs ajustadas manualmente...`, 'info');
        await Promise.all(
          modifiedOrphans.map(os => 
            supabase
              .from('patio_os')
              .update({
                total_value: os.total_value,
                paid_value: os.paid_value,
                status: os.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', os.id)
          )
        );
      }

      setSaveProgress(30);
      setSavePhase('os');

      // 6.2 Gravar OSs e Recebíveis
      const osPromises = results.osFiles.filter(r => r.success).map(osResult => {
        let storeId = mapping[osResult.storeAlias];
        if (storeId === 'GLOBAL') storeId = '';
        if (!storeId) return Promise.resolve();
        return savePatioOsAndReceivables(storeId, osResult.storeAlias, osResult.osArray, osResult.receivablesArray || []);
      });

      setSaveProgress(50);
      setSavePhase('rede');

      // 6.3 Gravar Rede / Maquininhas
      const redeByStore: Record<string, any[]> = {};
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => {
          let sid = mapping[t.storeName];
          if (sid && sid !== 'GLOBAL') {
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
        return savePatioOsAndReceivables(sid, storeName, [], parsedRecs);
      });

      setSaveProgress(70);
      setSavePhase('ofx');

      // 6.4 Gravar Lote de Importação
      const batch = await createImportBatch({ target_date: targetDate });

      // 6.5 Gravar Transações Bancárias OFX e Saldos
      const storeBankBalances: Record<string, number> = {};
      const storePreviousBalances: Record<string, number> = {};
      const txsToInsert: any[] = [];

      results.ofxResults.forEach(ofx => {
        let storeId: string | null = mapping[ofx.alias];
        if (storeId === 'GLOBAL') storeId = null;
        const dictKey = storeId || 'global_account';
        if (ofx.bankBalance !== undefined) storeBankBalances[dictKey] = ofx.bankBalance;
        if (ofx.previousBalance !== undefined) storePreviousBalances[dictKey] = ofx.previousBalance;

        ofx.transactions.forEach(t => {
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: storeId,
            store_name: storeId || ofx.alias,
            title: t.title || 'Importação OFX',
            subtitle: t.counterpart_name || ofx.alias,
            amount: Math.abs(t.amount || 0),
            type: (t.type === 'in' || t.type === 'income' || t.amount > 0) ? 'in' : 'out',
            category: t.category || 'Outros',
            occurred_at: t.date || targetDate || new Date().toISOString(),
            date: t.date || targetDate,
            target_date: targetDate,
            source: 'ofx',
            status: 'reconciled',
            fitid: t.fitid,
            cnpj_cpf: t.cnpj_cpf || null,
            counterpart_name: t.counterpart_name || null,
            imported_at: new Date().toISOString()
          });
        });
      });

      if (txsToInsert.length > 0 || Object.keys(storeBankBalances).length > 0) {
        await saveTransactions({
          transactions: txsToInsert,
          storeBankBalances,
          storePreviousBalances,
          import_batch_id: batch?.id
        } as any);
      }

      setSaveProgress(85);
      setSavePhase('snapshot');

      // 6.6 Gravar Snapshot Diário
      await saveSnapshot.mutateAsync({
        date: targetDate,
        faturamento: Number(odometroHoje) || 0,
        dinheiro_mp: Number(dinheiroMp) || 0,
        a_receber_manual: Number(aReceber) || 0,
        contas_a_pagar: Number(contasManual) || 0
      });

      await Promise.all([...osPromises, ...redePromises]);

      setSaveProgress(100);
      setSavePhase('completed');
      addLog('Consolidação gravada com sucesso no Supabase!', 'success');

      // Invalidação completa de cache
      await queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['available-conciliacao-dates'] });
      await queryClient.invalidateQueries({ queryKey: ['patio_os'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['import-history'] });

      toast.success('Fechamento e importação consolidados com sucesso!', { id: toastId });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[DailyImportView] Erro ao gravar fechamento:', err);
      toast.error('Erro ao consolidar importação: ' + (err.message || 'Falha no banco'), { id: toastId });
      addLog(`Erro ao gravar lote: ${err.message || 'Falha desconhecida'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 font-sans">
      
      {/* 1. SELETOR DE MODO E DATA DO FECHAMENTO */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Modo de Operação</span>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => setImportMode('diario')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  importMode === 'diario' 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40' 
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Fechamento Diário Regular (OFX/Pátio/Rede)
              </button>
              <button
                onClick={() => setImportMode('marco-zero')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  importMode === 'marco-zero' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40' 
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Carga de Marco Zero (Saldos Iniciais)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400 font-medium">Data de Referência:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* 2. ZONA DE UPLOAD E MAPEAMENTO DE LOJAS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <UploadCloud size={20} className={importMode === 'marco-zero' ? 'text-amber-400' : 'text-emerald-400'} />
              {importMode === 'marco-zero' ? 'Upload da Planilha de Marco Zero' : 'Área de Upload de Arquivos'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {importMode === 'marco-zero' 
                ? 'Arraste a planilha XLSX de implantação com as abas de filiais e saldos' 
                : 'Arraste simultaneamente os extratos bancários (.ofx), relatórios de pátio (.xlsx/.xls) e adquirentes'}
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
            {pendingFiles.length} arquivo(s) selecionado(s)
          </span>
        </div>

        <div 
          {...getRootProps()} 
          className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-950'
          }`}
        >
          <input {...getInputProps()} />
          <div className="p-4 bg-zinc-800/80 text-zinc-300 rounded-2xl mb-3 shadow-inner">
            {isProcessing ? <Loader2 size={28} className="animate-spin text-emerald-400" /> : <UploadCloud size={28} />}
          </div>
          <p className="text-sm font-semibold text-zinc-200">
            {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste e solte seus arquivos aqui ou clique para navegar'}
          </p>
          <p className="text-xs text-zinc-400 mt-1.5 font-mono">
            {importMode === 'marco-zero' ? 'Planilha .xlsx / .xls de Marco Zero' : 'Formatos: .OFX, .XLSX, .XLS, .PDF'}
          </p>
        </div>

        {/* Reconhecimento e Mapeamento de Filiais Persistido no Supabase */}
        {fileAliases.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Building2 size={16} className="text-emerald-400" />
                Vínculo das Filiais (Salvo no Banco de Dados)
              </span>
              <span className="text-[11px] text-zinc-400">
                Os matches definidos aqui ficam salvos e recarregam automaticamente
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fileAliases.map((alias) => (
                <div key={alias} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                  <span className="text-xs font-mono font-bold text-zinc-300 truncate block" title={alias}>
                    {alias}
                  </span>
                  <select
                    value={mapping[alias] || ''}
                    onChange={(e) => updateMapping(alias, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione a Loja...</option>
                    <option value="GLOBAL">Conta Global (Sem Loja)</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. ESTADO PROCESSADO (PÓS-UPLOAD): PREVIEWS, MATCHES, ORPHANS & INSPECTOR */}
      {hasProcessedFiles && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* CARDS DE TOTAIS EM FONTE MONO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>OSs do Pátio (Lidas)</span>
                <FileText size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-zinc-100">
                R$ {totalOsParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {results.osFiles.reduce((acc, f) => acc + f.osArray.length, 0)} ordens de serviço
              </p>
            </div>

            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Maquininha (Rede Líquido)</span>
                <CreditCard size={16} className="text-teal-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-teal-400">
                R$ {totalMaqParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {results.redeResults.reduce((acc, f) => acc + f.transactions.length, 0)} transações
              </p>
            </div>

            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Extrato OFX (Entradas)</span>
                <Database size={16} className="text-sky-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-sky-400">
                R$ {totalOfxInParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                Saídas: R$ {totalOfxOutParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Casamentos (Matches)</span>
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-purple-400">
                {autoMatches.length} pares
              </p>
              <p className="text-xs text-zinc-400">
                Identificados automaticamente
              </p>
            </div>
          </div>

          {/* PAINEL DE ABAS DE PRÉ-VISUALIZAÇÃO & LOGS DE MATCH */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewTab('ofx')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    previewTab === 'ofx' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Extrato OFX ({results.ofxResults.reduce((acc, f) => acc + f.transactions.length, 0)})
                </button>

                <button
                  onClick={() => setPreviewTab('os')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    previewTab === 'os' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Ordens de Serviço ({results.osFiles.reduce((acc, f) => acc + f.osArray.length, 0)})
                </button>

                <button
                  onClick={() => setPreviewTab('rede')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    previewTab === 'rede' ? 'bg-teal-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Vendas Maquininha ({results.redeResults.reduce((acc, f) => acc + f.transactions.length, 0)})
                </button>

                <button
                  onClick={() => setPreviewTab('matches')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewTab === 'matches' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Sparkles size={13} />
                  Casamentos / Matches ({autoMatches.length})
                </button>
              </div>

              <span className="text-[11px] font-mono text-zinc-400 pr-2">
                Pré-visualização dos Dados Brutos
              </span>
            </div>

            {/* Conteúdo da Tabela de Preview */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {previewTab === 'ofx' && (
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Conta / Alias</th>
                      <th className="p-2">Título / Descrição</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {results.ofxResults.flatMap(o => o.transactions.map((t, idx) => (
                      <tr key={`${o.alias}-${idx}`} className="hover:bg-zinc-800/40">
                        <td className="p-2 text-zinc-400">{t.date ? t.date.substring(0, 10) : '-'}</td>
                        <td className="p-2 text-zinc-300">{o.alias}</td>
                        <td className="p-2 text-zinc-100">{t.title || t.counterpart_name || 'Transação'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'in' || t.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.type === 'in' || t.amount > 0 ? 'ENTRADA' : 'SAÍDA'}
                          </span>
                        </td>
                        <td className={`p-2 text-right font-bold ${
                          t.type === 'in' || t.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          R$ {Math.abs(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}

              {previewTab === 'os' && (
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2">Loja / Arquivo</th>
                      <th className="p-2">Número OS</th>
                      <th className="p-2">Placa</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Valor Total</th>
                      <th className="p-2 text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {results.osFiles.flatMap(f => f.osArray.map((os, idx) => (
                      <tr key={`${f.storeAlias}-${idx}`} className="hover:bg-zinc-800/40">
                        <td className="p-2 text-zinc-300">{f.storeAlias}</td>
                        <td className="p-2 font-bold text-zinc-100">#{os.os_number}</td>
                        <td className="p-2 text-zinc-400">{os.plate || '-'}</td>
                        <td className="p-2 text-zinc-300">{os.status || 'aberta'}</td>
                        <td className="p-2 text-right text-zinc-200">
                          R$ {Number(os.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-emerald-400 font-bold">
                          R$ {Number(os.paid_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}

              {previewTab === 'rede' && (
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2">Estabelecimento</th>
                      <th className="p-2">Data Venda</th>
                      <th className="p-2">Método</th>
                      <th className="p-2 text-right">Valor Bruto</th>
                      <th className="p-2 text-right">Taxa (MDR)</th>
                      <th className="p-2 text-right">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {results.redeResults.flatMap(r => r.transactions.map((t, idx) => (
                      <tr key={`${t.storeName}-${idx}`} className="hover:bg-zinc-800/40">
                        <td className="p-2 text-zinc-300">{t.storeName}</td>
                        <td className="p-2 text-zinc-400">{t.date ? t.date.substring(0, 10) : '-'}</td>
                        <td className="p-2 text-teal-400 font-bold">{t.method}</td>
                        <td className="p-2 text-right text-zinc-300">
                          R$ {Number(t.grossAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-red-400">
                          R$ {Number(t.fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-teal-400 font-bold">
                          R$ {Number(t.netAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}

              {previewTab === 'matches' && (
                <div className="space-y-2">
                  {autoMatches.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      Nenhum casamento automático exato identificado até o momento.
                    </div>
                  ) : (
                    autoMatches.map((m, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                            MATCH
                          </span>
                          <span className="text-zinc-200 font-bold">OS #{m.osNumber} ({m.storeName})</span>
                          <span className="text-zinc-400">↔</span>
                          <span className="text-sky-400">{m.bankTxTitle}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">
                          R$ {m.osValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GRID DE OSs ÓRFÃS & INPUTS MANUAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna Esquerda (7 Colunas): Tabela de OSs Órfãs */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Layers size={18} className="text-amber-400" />
                    OSs Ausentes no Relatório Atual (Órfãs: {orphanOsList.length})
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ordens ativas no banco que saíram do relatório do mês. Ajuste livremente Total, Pago ou Status.
                  </p>
                </div>
              </div>

              {isLoadingOrphans ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-zinc-400" />
                </div>
              ) : orphanOsList.length === 0 ? (
                <div className="py-6 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 font-mono">
                  Nenhuma OS órfã pendente para as lojas ativas.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2">OS / Placa</th>
                        <th className="p-2">Loja</th>
                        <th className="p-2">Total (R$)</th>
                        <th className="p-2">Pago (R$)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-zinc-200">
                      {orphanOsList.map(os => (
                        <tr key={os.id} className="hover:bg-zinc-800/40">
                          <td className="p-2">
                            <span className="font-bold text-zinc-100">#{os.os_number}</span>
                            <span className="text-[10px] text-zinc-400 block">{os.plate}</span>
                          </td>
                          <td className="p-2 text-zinc-300">{os.store_name}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={os.total_value}
                              onChange={(e) => updateOrphanOs(os.id, 'total_value', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={os.paid_value}
                              onChange={(e) => updateOrphanOs(os.id, 'paid_value', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={os.status}
                              onChange={(e) => updateOrphanOs(os.id, 'status', e.target.value)}
                              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            >
                              <option value="em_aberto">Em Aberto</option>
                              <option value="pago_parcial">Pago Parcial</option>
                              <option value="finalizado">Finalizado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Coluna Direita (5 Colunas): Inputs Manuais com Trava de Segurança */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    Valores Manuais do Fechamento
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Parâmetros globais consolidados no snapshot do dia.
                  </p>
                </div>

                <button
                  onClick={() => setIsManualLocked(!isManualLocked)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    isManualLocked 
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isManualLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  {isManualLocked ? 'Trava Ativa' : 'Destravado'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Odômetro Acumulado (Hoje)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isManualLocked}
                    placeholder="0,00"
                    value={odometroHoje}
                    onChange={(e) => setOdometroHoje(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 disabled:opacity-60 rounded-xl text-xs font-bold text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Dinheiro Caixa (MP)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isManualLocked}
                    placeholder="0,00"
                    value={dinheiroMp}
                    onChange={(e) => setDinheiroMp(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 disabled:opacity-60 rounded-xl text-xs font-bold text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">A Receber (Boleto/Desc.)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isManualLocked}
                    placeholder="0,00"
                    value={aReceber}
                    onChange={(e) => setAReceber(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 disabled:opacity-60 rounded-xl text-xs font-bold text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Contas a Pagar (Manual)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isManualLocked}
                    placeholder="0,00"
                    value={contasManual}
                    onChange={(e) => setContasManual(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 disabled:opacity-60 rounded-xl text-xs font-bold text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* 4. INSPETOR JSON DE CONCILIAÇÃO (TERMINAL CODE BLOCK) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <details className="group">
              <summary className="p-4 bg-zinc-950/80 cursor-pointer flex items-center justify-between select-none hover:bg-zinc-950 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Code2 size={18} className="text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Inspetor de Conciliação (Payload JSON que será enviado ao Backend)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Transparência Total
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyJson();
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedJson ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedJson ? 'Copiado!' : 'Copiar JSON'}
                  </button>
                  <span className="text-xs text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>

              <div className="p-4 bg-zinc-950 border-t border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-72">
                <pre>{JSON.stringify(generatedJsonPayload, null, 2)}</pre>
              </div>
            </details>
          </div>

          {/* 5. PAINEL DE EXECUÇÃO & BOTÃO FINAL DE CONFIRMAÇÃO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            
            {/* Barra de Progresso durante gravação */}
            {isSaving && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between text-xs font-mono text-zinc-300">
                  <span>Gravando etapa: <strong className="text-emerald-400 uppercase">{savePhase}</strong></span>
                  <span>{saveProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Terminal de Logs Colapsável */}
            {importLogs.length > 0 && (
              <details className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1">
                <summary className="cursor-pointer text-zinc-400 flex items-center gap-2 select-none hover:text-zinc-200">
                  <Terminal size={14} className="text-emerald-400" />
                  Terminal de Execução ({importLogs.length} eventos)
                </summary>
                <div className="pt-2 max-h-40 overflow-y-auto space-y-1 border-t border-zinc-800 text-[11px]">
                  {importLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-500">[{log.time}]</span>
                      <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-zinc-300'}>
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Botão de Gravação Final em Lote */}
            <button
              onClick={handleConfirmAndSave}
              disabled={isSaving}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform hover:scale-[1.005]"
            >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Gravando Fechamento Diário e Consolidando Lote...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Confirmar e Gravar Fechamento Diário
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
