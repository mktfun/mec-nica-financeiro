import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  RefreshCw, 
  Save, 
  AlertCircle,
  Car
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PatioExcelStoreAccordion, EditablePatioOsItem } from '@/components/importacoes/patio/PatioExcelStoreAccordion';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseCentralImports } from '@/lib/parsers/centralImportManager';

export interface Fase1PatioOsReviewProps {
  targetDate: string;
  onAdvance: () => void;
  className?: string;
}

export function Fase1PatioOsReview({
  targetDate,
  onAdvance,
  className = ''
}: Fase1PatioOsReviewProps) {
  const { data: stores = [] } = useStores();
  const { mapping } = useStoreFileMappings(stores);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [osItems, setOsItems] = useState<EditablePatioOsItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [importedOsKeys, setImportedOsKeys] = useState<Set<string>>(new Set());

  // 1. Carregar OSs existentes do banco de dados para a data (incluindo passivo em aberto)
  const loadPatioOs = useCallback(async (currentImportedKeys: Set<string> = importedOsKeys) => {
    if (!targetDate) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .or(`opened_at.gte.${targetDate}T00:00:00,last_payment_date.eq.${targetDate},status.ilike.%aberto%,status.ilike.%parcial%,status.ilike.%pendente%`)
        .order('store_id', { ascending: true })
        .order('opened_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: EditablePatioOsItem[] = data.map((d: any) => {
          const cleanNum = String(d.os_number || '').trim();
          const isFromReport = currentImportedKeys.has(`${d.store_id}_${cleanNum}`) || currentImportedKeys.has(cleanNum);
          const isMissing = currentImportedKeys.size > 0 ? !isFromReport : false;

          return {
            id: d.id,
            os_number: d.os_number,
            store_id: d.store_id || '',
            store_name: d.store_name || '',
            client_name: d.client_name || 'Cliente',
            plate: d.plate || 'N/I',
            total_value: Number(d.total_value || 0),
            paid_value: Number(d.paid_value || 0),
            pending_value: Math.max(0, Number(d.total_value || 0) - Number(d.paid_value || 0)),
            days_open: Number(d.days_open || 0),
            opened_at: d.opened_at || `${targetDate}T08:00:00`,
            status: d.status || 'em_aberto',
            payment_method: (d.payment_method as any) || 'EM_ABERTO',
            debit_value: Number(d.debit_value || 0),
            credit_value: Number(d.credit_value || 0),
            pix_transfer_value: Number(d.pix_transfer_value || 0),
            cash_value: Number(d.cash_value || 0),
            isMissingFromReport: isMissing,
            isFromReport: isFromReport
          };
        });
        setOsItems(mapped);
      } else {
        setOsItems([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar pátio:', err);
      toast.error(`Falha ao carregar OSs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate, importedOsKeys]);

  useEffect(() => {
    loadPatioOs();
  }, [loadPatioOs]);

  // 2. Dropzone exclusiva para arquivos de OS
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsLoading(true);

    try {
      const parseResult = await parseCentralImports(acceptedFiles);
      const osResults = (parseResult?.osFiles || []).filter(r => r.success);

      if (osResults.length === 0) {
        toast.warning('Nenhum arquivo válido de Ordem de Serviço foi identificado.');
        setIsLoading(false);
        return;
      }

      let totalImported = 0;
      const nextImportedKeys = new Set(importedOsKeys);

      for (const res of osResults) {
        let storeId = mapping[res.storeAlias];
        if (storeId === 'GLOBAL') storeId = null as any;

        const storeObj = stores.find(s => s.id === storeId || s.name === res.storeAlias);
        const resolvedStoreId = storeId || storeObj?.id || 'st-default';
        const resolvedStoreName = storeObj?.name || res.storeAlias;

        // Registra chaves importadas para calcular quem veio ou não no relatório
        res.osArray.forEach(os => {
          const cleanNum = String(os.os_number || '').trim();
          if (cleanNum) {
            nextImportedKeys.add(`${resolvedStoreId}_${cleanNum}`);
            nextImportedKeys.add(cleanNum);
          }
        });

        // Persistir no banco via batch_upsert_patio_os
        const recordsToUpsert = res.osArray.map(os => ({
          os_number: os.os_number,
          plate: os.plate || 'N/I',
          client_name: os.client_name || 'Cliente',
          total_value: os.total_value,
          paid_value: os.paid_value || 0,
          raw_status: os.status,
          opened_at: os.opened_at || `${targetDate}T08:00:00`,
          payment_method: os.payment_method || 'NÃO INFORMADO',
          credit_value: (os as any).credit_value ?? os.parsed_credit ?? 0,
          debit_value: (os as any).debit_value ?? os.parsed_debit ?? 0,
          pix_transfer_value: (os as any).pix_transfer_value ?? os.parsed_pix_transfer ?? 0,
          cash_value: (os as any).cash_value ?? os.parsed_cash ?? 0
        }));

        const { error: upsertErr } = await supabase.rpc('batch_upsert_patio_os', {
          p_store_id: resolvedStoreId,
          p_target_date: targetDate,
          p_os_records: recordsToUpsert
        });

        if (upsertErr) {
          console.error(`Erro ao salvar OSs de ${resolvedStoreName}:`, upsertErr);
          toast.error(`Erro ao salvar OSs de ${resolvedStoreName}: ${upsertErr.message}`);
        } else {
          totalImported += recordsToUpsert.length;
        }
      }

      setImportedOsKeys(nextImportedKeys);
      toast.success(`${totalImported} OS(s) importada(s) e integradas ao pátio da data!`);
      await loadPatioOs(nextImportedKeys);
    } catch (err: any) {
      console.error('Erro ao processar planilhas de OS:', err);
      toast.error(`Falha no processamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mapping, stores, targetDate, loadPatioOs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    }
  });

  // 3. Modificação inline de OS
  const handleChangeItem = useCallback((id: string, updates: Partial<EditablePatioOsItem>) => {
    setOsItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = { ...item, ...updates, isModified: true };
        next.pending_value = Math.max(0, next.total_value - next.paid_value);
        return next;
      }
      return item;
    }));
    setHasChanges(true);
  }, []);

  // 4. Adicionar OS Manual Avulsa
  const handleAddManualOs = useCallback((storeId: string, os: Partial<EditablePatioOsItem>) => {
    const storeObj = stores.find(s => s.id === storeId);
    const newItem: EditablePatioOsItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      os_number: os.os_number || `AVULSA-${Date.now().toString().slice(-4)}`,
      store_id: storeId,
      store_name: storeObj?.name || storeId,
      client_name: os.client_name || 'Cliente Avulso',
      plate: os.plate || 'N/I',
      total_value: os.total_value || 0,
      paid_value: os.paid_value || 0,
      pending_value: Math.max(0, (os.total_value || 0) - (os.paid_value || 0)),
      days_open: 0,
      opened_at: `${targetDate}T08:00:00`,
      status: (os.paid_value || 0) >= (os.total_value || 1) ? 'finalizada' : 'em_aberto',
      payment_method: os.payment_method || 'EM_ABERTO',
      isNewManual: true,
      isModified: true
    };

    setOsItems(prev => [newItem, ...prev]);
    setHasChanges(true);
    toast.info(`OS #${newItem.os_number} adicionada na loja ${newItem.store_name}.`);
  }, [stores, targetDate]);

  // 5. Salvar alterações pendentes no PostgreSQL
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const modifiedItems = osItems.filter(i => i.isModified);
      if (modifiedItems.length === 0) {
        toast.info('Nenhuma alteração pendente para salvar.');
        setIsSaving(false);
        return;
      }

      // Agrupa por loja para batch_upsert
      const byStore: Record<string, EditablePatioOsItem[]> = {};
      modifiedItems.forEach(item => {
        if (!byStore[item.store_id]) byStore[item.store_id] = [];
        byStore[item.store_id].push(item);
      });

      for (const [sId, items] of Object.entries(byStore)) {
        const records = items.map(i => ({
          os_number: i.os_number,
          plate: i.plate,
          client_name: i.client_name,
          total_value: i.total_value,
          paid_value: i.paid_value,
          raw_status: i.status,
          opened_at: i.opened_at,
          payment_method: i.payment_method,
          credit_value: i.credit_value || 0,
          debit_value: i.debit_value || 0,
          pix_transfer_value: i.pix_transfer_value || 0,
          cash_value: i.cash_value || 0
        }));

        const { error } = await supabase.rpc('batch_upsert_patio_os', {
          p_store_id: sId,
          p_target_date: targetDate,
          p_os_records: records
        });

        if (error) throw error;
      }

      // Salva progresso da etapa na sessão
      await (supabase as any).rpc('save_pipeline_step_progress', {
        p_target_date: targetDate,
        p_step: 1,
        p_step_name: 'stage_1_os',
        p_step_data: { total_os: osItems.length },
        p_mark_completed: true,
        p_selected_mode: 'manual'
      });

      setHasChanges(false);
      toast.success('Alterações de pátio e OSs salvas com sucesso!');
      await loadPatioOs();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Resumo numérico rápido
  const metrics = useMemo(() => {
    const totalOsVal = osItems.reduce((acc, curr) => acc + (curr.total_value || 0), 0);
    const totalPaidVal = osItems.reduce((acc, curr) => acc + (curr.paid_value || 0), 0);
    const totalPendingVal = osItems.reduce((acc, curr) => acc + (curr.pending_value || 0), 0);
    return {
      count: osItems.length,
      total: totalOsVal,
      paid: totalPaidVal,
      pending: totalPendingVal
    };
  }, [osItems]);

  const formatBrl = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* CABEÇALHO DA ETAPA 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              FASE 1 DE 4
            </span>
            <h2 className="text-xl font-bold text-zinc-100">
              Ordens de Serviço & Pátio das Filiais
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Importe exclusivamente as planilhas de OS ou ajuste manualmente as ordens pendentes loja a loja.
          </p>
        </div>

        {/* Totalizadores da Fase 1 */}
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">TOTAL OS</span>
            <span className="text-zinc-200 font-bold">{formatBrl(metrics.total)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">PAGO BALCÃO</span>
            <span className="text-emerald-400 font-bold">{formatBrl(metrics.paid)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">RESTANTE PÁTIO</span>
            <span className="text-amber-400 font-bold">{formatBrl(metrics.pending)}</span>
          </div>
        </div>
      </div>

      {/* DROPZONE EXCLUSIVA DE OS */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-emerald-500 bg-emerald-500/10' 
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-2">
          <UploadCloud size={22} />
        </div>
        <h4 className="font-bold text-sm text-zinc-200 text-center">
          {isDragActive ? 'Solte as planilhas de OS aqui' : 'Arraste as planilhas de Ordens de Serviço (.xlsx, .xls, .csv)'}
        </h4>
        <p className="text-zinc-400 text-xs text-center mt-0.5">
          O sistema processa automaticamente as 10 filiais e consolida os veículos no pátio.
        </p>
      </div>

      {/* TABELA DE GESTÃO SANFONA ESTILO EXCEL */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Carregando ordens de serviço do pátio..." />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              {metrics.count} ordem(ns) de serviço carregada(s) para {targetDate}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadPatioOs}
                className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw size={13} className="mr-1.5" /> Atualizar
              </Button>
              {hasChanges && (
                <Button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <Save size={13} className="mr-1.5" /> Salvar Alterações
                </Button>
              )}
            </div>
          </div>

          <PatioExcelStoreAccordion
            stores={stores as any}
            osItems={osItems}
            onChangeItem={handleChangeItem}
            onAddManualOs={handleAddManualOs}
            targetDate={targetDate}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
            hasReportImported={importedOsKeys.size > 0}
          />
        </div>
      )}

      {/* RODAPÉ DE AVANÇO */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-400">
          {hasChanges ? (
            <span className="text-amber-400 flex items-center gap-1.5 font-semibold">
              <AlertCircle size={14} /> Existem alterações não salvas. Salve antes de avançar.
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Dados de pátio prontos e integrados ao PostgreSQL.
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={async () => {
            if (hasChanges) {
              await handleSaveChanges();
            }
            onAdvance();
          }}
          disabled={isSaving}
          className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 rounded-xl transition-all shadow-md shadow-emerald-950/40"
        >
          Avançar para Fase 2: Vendas Rede
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
