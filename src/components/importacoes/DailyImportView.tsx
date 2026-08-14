import React, { useState, useEffect, useCallback } from 'react';
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
  AlertTriangle
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

export function DailyImportView({ initialDate, onSuccess }: DailyImportViewProps) {
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
          console.error('[DailyImportView] Erro ao buscar OSs ativas:', error);
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
    } catch (err: any) {
      console.error('[DailyImportView] Erro ao gravar fechamento:', err);
      toast.error('Erro ao consolidar importação: ' + (err.message || 'Falha no banco'), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 font-sans">
      
      {/* SELETOR DE DATA DO FECHAMENTO */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Data de Referência do Fechamento</span>
            <span className="text-sm font-bold text-zinc-100">{targetDate || 'Não definida'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400 font-medium">Alterar Data:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* GRID PRINCIPAL (2 COLUNAS DE FLUXO ÚNICO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA (5 COLUNAS): DROPZONE + MAPEAMENTOS + INPUTS GLOBAIS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Dropzone de Arquivos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <UploadCloud size={18} className="text-emerald-400" />
                1. Upload de Arquivos
              </h3>
              <span className="text-xs text-zinc-400">OFX, Pátio, Rede</span>
            </div>

            <div 
              {...getRootProps()} 
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-950'
              }`}
            >
              <input {...getInputProps()} />
              <div className="p-3 bg-zinc-800/80 text-zinc-300 rounded-full mb-3 shadow-inner">
                {isProcessing ? <Loader2 size={24} className="animate-spin text-emerald-400" /> : <UploadCloud size={24} />}
              </div>
              <p className="text-xs font-medium text-zinc-200">
                {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste planilhas ou clique para selecionar'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">
                Suporta extratos bancários (.ofx), relatórios de pátio (.xlsx/.xls) e adquirentes (.xlsx/.pdf)
              </p>
            </div>

            {/* Lista de Arquivos e Matches Persistidos no Supabase */}
            {fileAliases.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-400" />
                  Mapeamento de Filiais (Salvo no Banco)
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {fileAliases.map((alias) => (
                    <div key={alias} className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl text-xs">
                      <span className="font-mono text-zinc-300 truncate max-w-[180px]" title={alias}>
                        {alias}
                      </span>
                      <select
                        value={mapping[alias] || ''}
                        onChange={(e) => updateMapping(alias, e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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

          {/* Card 2: Inputs Manuais Globais */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" />
              2. Inputs Globais do Fechamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Odômetro Acumulado Hoje */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Odômetro Acumulado (Hoje)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-zinc-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={odometroHoje}
                    onChange={(e) => setOdometroHoje(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 block">Faturamento bruto no relatório</span>
              </div>

              {/* Dinheiro MP */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Dinheiro Caixa (MP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-zinc-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={dinheiroMp}
                    onChange={(e) => setDinheiroMp(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 block">Total em espécie recebido</span>
              </div>

              {/* A Receber Manual */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  A Receber (Manual)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-zinc-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={aReceber}
                    onChange={(e) => setAReceber(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 block">Previsão manual extra de recebíveis</span>
              </div>

              {/* Contas a Pagar (Manual) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Contas a Pagar (Manual)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-zinc-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={contasManual}
                    onChange={(e) => setContasManual(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 block">Total de despesas operacionais do dia</span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (7 COLUNAS): OSs ÓRFÃS + RESUMO & CONSOLIDAÇÃO */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 3: Grid de Ajuste de OSs Órfãs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Layers size={18} className="text-amber-400" />
                  3. Ajuste Manual de OSs Ausentes (Órfãs)
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  OSs ativas no banco que não constam na planilha do mês (ajuste manual de Total, Pago e Status)
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {orphanOsList.length} OSs
              </span>
            </div>

            {isLoadingOrphans ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
              </div>
            ) : orphanOsList.length === 0 ? (
              <div className="py-6 text-center bg-zinc-950/40 rounded-xl border border-zinc-800/60 text-xs text-zinc-400">
                Nenhuma OS órfã identificada para as lojas selecionadas.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-2.5">OS / Placa</th>
                      <th className="p-2.5">Loja</th>
                      <th className="p-2.5">Valor Total (R$)</th>
                      <th className="p-2.5">Total Pago (R$)</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-200">
                    {orphanOsList.map(os => (
                      <tr key={os.id} className="hover:bg-zinc-800/30">
                        <td className="p-2.5">
                          <span className="font-mono font-bold text-zinc-100">{os.os_number}</span>
                          <span className="text-[10px] text-zinc-400 block">{os.plate}</span>
                        </td>
                        <td className="p-2.5 text-zinc-300">{os.store_name}</td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={os.total_value}
                            onChange={(e) => updateOrphanOs(os.id, 'total_value', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={os.paid_value}
                            onChange={(e) => updateOrphanOs(os.id, 'paid_value', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
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

          {/* Card 4: Resumo dos Arquivos e Consolidação */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              4. Resumo de Dados e Gravação
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block font-medium">OSs Novas</span>
                <span className="text-sm font-bold text-zinc-100">
                  R$ {totalOsParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block font-medium">Maquininhas (Rede)</span>
                <span className="text-sm font-bold text-emerald-400">
                  R$ {totalMaqParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block font-medium">Extrato (OFX Entradas)</span>
                <span className="text-sm font-bold text-sky-400">
                  R$ {totalOfxInParsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* BOTÃO DE FECHAMENTO EM LOTE */}
            <button
              onClick={handleConfirmAndSave}
              disabled={isSaving}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gravando Fechamento e Consolidando Lote...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Confirmar e Gravar Fechamento Diário
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
