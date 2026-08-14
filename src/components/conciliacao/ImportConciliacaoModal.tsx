import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  X, 
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
  Building2
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { useCentralImport } from '@/hooks/useCentralImport';
import { useBulkInsertTransactions, useCreateImportBatch, useBulkInsertConciliationMatches } from '@/hooks/useTransactions';
import { useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { savePatioOsAndReceivables, ParsedReceivable } from '@/hooks/useImportProcessor';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface ImportConciliacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
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

export function ImportConciliacaoModal({ 
  isOpen, 
  onClose, 
  selectedDate: initialDate,
  onSuccess 
}: ImportConciliacaoModalProps) {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [targetDate, setTargetDate] = useState<string>(initialDate || todayStr);

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

  // 1. Upload Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingFiles(acceptedFiles);
    await processFiles(acceptedFiles);
  }, [processFiles]);

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
          console.error('[ImportConciliacaoModal] Erro ao buscar OSs ativas:', error);
          return;
        }

        // Extrair números de OS que constam nos arquivos recém-importados
        const importedOsNumbersByStore = new Set<string>();
        results.osFiles.filter(f => f.success).forEach(file => {
          const storeId = mapping[file.storeAlias];
          file.osArray.forEach(os => {
            importedOsNumbersByStore.add(`${storeId}_${String(os.os_number).trim()}`);
          });
        });

        // Identificar as que constam no banco mas NÃO vieram no arquivo
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
        console.error('[ImportConciliacaoModal] Erro ao detectar OSs órfãs:', err);
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

  // 3. Totais do Preview
  const totalOsParsed = results.osFiles.filter(r => r.success).reduce((acc, curr) => {
    return acc + curr.osArray.reduce((sum, os) => sum + (os.total_value || 0), 0);
  }, 0);

  const totalMaqParsed = results.redeResults.filter(r => r.success).reduce((acc, curr) => {
    return acc + curr.transactions.reduce((sum, t) => sum + (t.netAmount || 0), 0);
  }, 0);

  const totalOfxInParsed = results.ofxResults.reduce((acc, curr) => {
    return acc + curr.transactions.filter(t => t.type === 'in' || t.amount > 0).reduce((sum, t) => sum + (t.amount || 0), 0);
  }, 0);

  // Extrair todos os aliases de arquivos carregados
  const fileAliases = Array.from(new Set([
    ...results.osFiles.filter(r => r.success).map(r => r.storeAlias),
    ...results.maquininhaItems.map(i => i.storeName),
    ...results.ofxResults.map(o => o.alias),
    ...results.redeResults.filter(r => r.success).flatMap(r => r.transactions.map(t => t.storeName))
  ]));

  // 4. Gravação em Lote Final (Batch Mutation)
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Gravando fechamento diário e processando arquivos...');

    try {
      // 4.1 Atualizar OSs órfãs modificadas manualmente
      const modifiedOrphans = orphanOsList.filter(
        os => os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status
      );

      if (modifiedOrphans.length > 0) {
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

      // 4.2 Gravar OSs e Recebíveis
      const osPromises = results.osFiles.filter(r => r.success).map(osResult => {
        let storeId = mapping[osResult.storeAlias];
        if (storeId === 'GLOBAL') storeId = '';
        if (!storeId) return Promise.resolve();
        return savePatioOsAndReceivables(storeId, osResult.storeAlias, osResult.osArray, osResult.receivablesArray || []);
      });

      // 4.3 Gravar Rede / Maquininhas
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

      // 4.4 Gravar Lote de Importação / Auditoria no banco com target_date
      const batch = await createImportBatch({ target_date: targetDate });

      // 4.5 Gravar Transações Bancárias OFX e Saldos
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
            date: t.date || targetDate,
            description: t.description || t.memo || 'Transação OFX',
            amount: t.amount,
            type: t.type === 'in' || t.amount > 0 ? 'income' : 'expense',
            category: t.category || 'Outros',
            store_id: storeId,
            status: 'reconciled',
            fitid: t.fitid,
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

      // 4.6 Gravar Snapshot Diário Unificado
      await saveSnapshot.mutateAsync({
        date: targetDate,
        faturamento: Number(odometroHoje) || 0,
        dinheiro_mp: Number(dinheiroMp) || 0,
        a_receber_manual: Number(aReceber) || 0,
        contas_a_pagar: Number(contasManual) || 0
      });

      await Promise.all([...osPromises, ...redePromises]);

      // Invalidação completa de cache para atualizar as telas em tempo real
      await queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['available-conciliacao-dates'] });
      await queryClient.invalidateQueries({ queryKey: ['patio_os'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['import-history'] });

      toast.success('Fechamento e importação consolidados com sucesso!', { id: toastId });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ImportConciliacaoModal] Erro ao gravar fechamento:', err);
      toast.error('Erro ao consolidar importação: ' + (err.message || 'Falha no banco'), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl my-8 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 font-sans">
        
        {/* CABEÇALHO SÓLIDO (Zinc-950) */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
                Importação e Fechamento Diário
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Fluxo Único
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Upload de arquivos, preenchimento de inputs manuais e ajuste de ordens de serviço pendentes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Seletor de Data Base */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <Calendar size={15} className="text-zinc-400" />
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-zinc-100 focus:outline-none"
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CORPO PRINCIPAL - GRID DE 2 COLUNAS DE ALTA DENSIDADE */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          
          {/* COLUNA ESQUERDA: UPLOAD & INPUTS GLOBAIS */}
          <div className="space-y-6">
            
            {/* 1. Drag & Drop Upload */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <UploadCloud size={16} className="text-emerald-400" />
                1. Upload de Arquivos (OFX, Pátio, Rede)
              </h3>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="mx-auto text-zinc-500 mb-2" size={32} />
                <p className="text-sm font-medium text-zinc-200">
                  Arraste arquivos OFX, XLSX de Pátio ou Rede aqui
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Reconhecimento automático de layout e vinculação direta com as lojas
                </p>
              </div>

              {/* Lista de Arquivos Processados & Matches de Lojas */}
              {fileAliases.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-xs font-semibold text-zinc-400 uppercase">
                    Vínculo de Lojas Identificadas ({fileAliases.length})
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {fileAliases.map(alias => (
                      <div key={alias} className="flex items-center justify-between gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 size={14} className="text-zinc-500 shrink-0" />
                          <span className="font-mono font-semibold text-zinc-200 truncate">{alias}</span>
                        </div>
                        <select
                          value={mapping[alias] || ''}
                          onChange={e => {
                            const found = stores.find(s => s.id === e.target.value);
                            updateMapping(alias, e.target.value, found?.name);
                          }}
                          className={`bg-zinc-900 border rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                            mapping[alias] ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/50 text-amber-300'
                          }`}
                        >
                          <option value="">-- Vincular Loja --</option>
                          <option value="GLOBAL">-- Ignorar --</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Card de Dados Manuais do Dia */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                2. Inputs Manuais do Fechamento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Odômetro Acumulado (Hoje)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={odometroHoje}
                    onChange={e => setOdometroHoje(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">Leitura bruta acumulada do ERP</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Dinheiro MP (Daniel)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={dinheiroMp}
                    onChange={e => setDinheiroMp(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">Dinheiro em espécie recolhido</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    A Receber (Boleto/Desc.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={aReceber}
                    onChange={e => setAReceber(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">Vendas a prazo/recebimento</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Contas (Manual)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={contasManual}
                    onChange={e => setContasManual(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">Despesas pagas fora do extrato</span>
                </div>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: GRID DE OSs ÓRFÃS & RESUMO */}
          <div className="space-y-6">
            
            {/* 3. Grid de Ajuste de OSs Órfãs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-amber-400" />
                  3. OSs Pendentes Ausentes no Relatório ({orphanOsList.length})
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Controle Manual
                </span>
              </div>

              {isLoadingOrphans ? (
                <div className="py-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Verificando ordens no pátio...
                </div>
              ) : orphanOsList.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                  Nenhuma OS órfã detectada. Todas as ordens ativas constam no relatório importado.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase">
                        <th className="py-2 px-2">OS / Placa</th>
                        <th className="py-2 px-2 w-28">Total (R$)</th>
                        <th className="py-2 px-2 w-28">Pago (R$)</th>
                        <th className="py-2 px-2 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {orphanOsList.map(os => {
                        const isModified = os.total_value !== os.original_total_value || os.paid_value !== os.original_paid_value || os.status !== os.original_status;

                        return (
                          <tr key={os.id} className={`hover:bg-zinc-800/30 transition-colors ${isModified ? 'bg-amber-500/5' : ''}`}>
                            <td className="py-2 px-2">
                              <span className="font-mono font-bold text-zinc-200 block">#{os.os_number}</span>
                              <span className="text-[10px] text-zinc-500">{os.plate} • {os.store_name}</span>
                            </td>
                            <td className="py-1 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={os.total_value}
                                onChange={e => updateOrphanOs(os.id, 'total_value', Number(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={os.paid_value}
                                onChange={e => updateOrphanOs(os.id, 'paid_value', Number(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <select
                                value={os.status}
                                onChange={e => updateOrphanOs(os.id, 'status', e.target.value as any)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              >
                                <option value="em_aberto">em_aberto</option>
                                <option value="pago_parcial">pago_parcial</option>
                                <option value="finalizado">finalizado</option>
                                <option value="cancelado">cancelado</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. Resumo de Conferência */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" />
                Resumo dos Arquivos Carregados
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Pátio</span>
                  <span className="text-sm font-mono font-bold text-zinc-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOsParsed)}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Maquininhas</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMaqParsed)}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Extrato OFX</span>
                  <span className="text-sm font-mono font-bold text-sky-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOfxInParsed)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RODAPÉ DE AÇÃO - BOTÃO FINAL EMERALD-600 */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmAndSave}
            disabled={isSaving || isProcessing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Gravando Fechamento...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Confirmar e Gravar Fechamento
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
