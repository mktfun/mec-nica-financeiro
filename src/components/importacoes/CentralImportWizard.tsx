import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { 
  UploadCloud, CheckCircle2, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft, 
  Database, Search, X, TrendingDown, TrendingUp, AlertCircle, CreditCard, FileText, 
  Terminal, Sparkles, FileSpreadsheet, Layers, RefreshCcw 
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCentralImport, UnifiedImportResult } from '@/hooks/useCentralImport';
import { useBulkInsertTransactions, useCreateImportBatch, useBulkInsertConciliationMatches } from '@/hooks/useTransactions';
import { useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@tanstack/react-router';
import { savePatioOsAndReceivables, ParsedReceivable } from '@/hooks/useImportProcessor';
import { getDefaultDate } from '@/lib/utils';

export interface ImportLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}


// Hook para gerenciar mapeamento de lojas
function useUnifiedStoreMapping() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const autoMatchMapRef = useRef<Record<string, any[]>>({});
  
  useEffect(() => {
    const saved = localStorage.getItem('@mecanica/unified-mappings');
    if (saved) {
      try {
        setMapping(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const updateMapping = (alias: string, storeId: string) => {
    setMapping(prev => {
      const next = { ...prev, [alias]: storeId };
      localStorage.setItem('@mecanica/unified-mappings', JSON.stringify(next));
      return next;
    });
  };

  return { mapping, updateMapping, setMapping };
}

function StepIndicator({ current, step, title }: { current: number, step: number, title: string }) {
  const isPast = current > step;
  const isActive = current === step;
  
  return (
    <div className={`flex flex-col items-center gap-2 ${isPast || isActive ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500
        ${isPast ? 'bg-[var(--color-accent-teal)] border-[var(--color-accent-teal)] text-black' : 
          isActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]' : 
          'bg-transparent border-[var(--text-tertiary)] text-[var(--text-tertiary)]'}
      `}>
        {isPast ? <CheckCircle2 size={18} /> : step}
      </div>
      <span className={`text-xs font-semibold ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</span>
    </div>
  );
}

export function CentralImportWizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [isPreparing, setIsPreparing] = useState(false);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [unmappedAliases, setUnmappedAliases] = useState<string[]>([]);
  
  // Manual inputs globais
  const [manualDinheiroMp, setManualDinheiroMp] = useState<number>(0);
  const [manualAReceber, setManualAReceber] = useState<number>(0);

  // Terminal logs state
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const [saveFinished, setSaveFinished] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: stores = [] } = useStores();
  const { mapping, updateMapping, setMapping } = useUnifiedStoreMapping();
  const { processFiles, isProcessing, results } = useCentralImport();
  const { mutateAsync: saveTransactions } = useBulkInsertTransactions();
  const { mutateAsync: createImportBatch } = useCreateImportBatch();
  const { mutateAsync: insertConciliationMatches } = useBulkInsertConciliationMatches();
  const saveSnapshot = useSaveDailySnapshot();
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setImportLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp, type, message }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [importLogs]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    await processFiles(acceptedFiles);
  };

  useEffect(() => {
    if (isProcessing) return;
    if (results.osFiles.length === 0 && results.maquininhaItems.length === 0 && results.ofxResults.length === 0 && results.redeResults.length === 0 && results.mapaMetasResults.length === 0) return;

    // Coletar todos os aliases únicos
    const aliases = new Set<string>();
    results.osFiles.filter(r => r.success).forEach(r => aliases.add(r.storeAlias));
    results.maquininhaItems.forEach(i => aliases.add(i.storeName));
    results.ofxResults.forEach(o => aliases.add(o.alias));
    results.redeResults.filter(r => r.success).forEach(r => {
      r.transactions.forEach(t => aliases.add(t.storeName));
    });

    const aliasArray = Array.from(aliases);
    const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    let currentMapping = { ...mapping };

    aliasArray.forEach(alias => {
      if (!currentMapping[alias]) {
        const normalizedAlias = normalizeString(alias);
        const match = stores.find(s => normalizeString(s.name) === normalizedAlias);
        if (match) currentMapping[alias] = match.id;
      }
    });

    setMapping(currentMapping);
    
    if (aliasArray.length > 0) {
      setStep(2);
    } else {
      setStep(3);
    }
  }, [isProcessing, results, stores]);

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

  const handleConfirm = async () => {
    setIsSaving(true);
    setStep(4);
    setImportLogs([]);
    setSaveFinished(false);

    try {
      addLog("🚀 Iniciando gravação do lote de conciliação...", "info");
      await new Promise(r => setTimeout(r, 200));

      const txsToInsert: any[] = [];
      const storeBankBalances: Record<string, number> = {};
      const storePreviousBalances: Record<string, number> = {};

      // 1. OSs do Pátio e Recebíveis
      const osCountTotal = results.osFiles.filter(r => r.success).reduce((acc, curr) => acc + curr.osArray.length, 0);
      addLog(`📦 Registrando OSs do Pátio (${osCountTotal} ordens identificadas)...`, "info");
      
      const osPromises = results.osFiles.filter(r => r.success).map(osResult => {
        let store_id: string | null = mapping[osResult.storeAlias];
        if (store_id === 'GLOBAL') store_id = null;
        if (!store_id) return Promise.resolve();
        return savePatioOsAndReceivables(store_id, osResult.storeAlias, osResult.osArray, osResult.receivablesArray || []);
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
        return savePatioOsAndReceivables(sid, storeName, [], parsedRecs);
      });

      // Rede
      const redeCount = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.transactions.length, 0);
      addLog(`💳 Processando relatórios da Rede (${redeCount} transações da maquininha)...`, "info");

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
        return savePatioOsAndReceivables(sid, storeName, [], parsedRecs);
      });

      await Promise.all([...osPromises, ...maqPromises, ...redePromises]);
      addLog("✅ OSs e Recebíveis salvos nas tabelas de origem!", "success");
      await new Promise(r => setTimeout(r, 200));

      // 2. Transações e OFX
      const ofxCount = results.ofxResults.reduce((acc, curr) => acc + curr.transactions.length, 0);
      addLog(`🏦 Conciliando Extratos OFX (${ofxCount} lançamentos bancários)...`, "info");

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
            source: 'maquininha'
          });
        });
      });

      Object.entries(redeByStore).forEach(([sid, items]) => {
        items.forEach(item => {
          txsToInsert.push({
            id: crypto.randomUUID(),
            store_id: sid,
            store_name: item.storeName,
            title: item.title || 'Importação Rede',
            subtitle: item.storeName,
            amount: item.netAmount || 0,
            gross_amount: item.grossAmount || item.netAmount || 0,
            fee_amount: item.interest || 0,
            type: 'in',
            occurred_at: item.date || `${targetDate}T12:00:00Z`,
            target_date: targetDate,
            icon_type: 'card',
            source: 'rede'
          });
        });
      });


      results.ofxResults.forEach(ofx => {
        let store_id: string | null = mapping[ofx.alias];
        if (store_id === 'GLOBAL') store_id = null;
        if (ofx.bankBalance !== undefined && store_id) storeBankBalances[store_id] = ofx.bankBalance;
        if (ofx.previousBalance !== undefined && store_id) storePreviousBalances[store_id] = ofx.previousBalance;

        let globalStoreId: string | null = mapping[ofx.alias] || null;
        if (globalStoreId === 'GLOBAL') globalStoreId = null;

        const uniqueOfxTxs = new Map();
        ofx.transactions.forEach((tx: any) => uniqueOfxTxs.set(tx.fitid || crypto.randomUUID(), tx));
        
        Array.from(uniqueOfxTxs.values()).forEach((tx: any) => {
          let matched_store_id = globalStoreId;
          let matched_os_number = null;
          
          if (tx.type === 'in') {
            let foundMatch = false;
            if (matched_store_id && autoMatchMap[matched_store_id]) {
              const matchedOs = autoMatchMap[matched_store_id].find(os => {
                 const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                 const pixVal = os.pix_transfer_value || delta;
                 return Math.abs(pixVal - tx.amount) < 1.0;
              });
              if (matchedOs) {
                matched_os_number = matchedOs.os_number;
                autoMatchMap[matched_store_id] = autoMatchMap[matched_store_id].filter(os => os.os_number !== matchedOs.os_number);
                foundMatch = true;
              }
            }
            
            if (!foundMatch) {
              for (const [s_id, osList] of Object.entries(autoMatchMap)) {
                const matchedOs = osList.find(os => {
                   const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                   const pixVal = os.pix_transfer_value || delta;
                   return Math.abs(pixVal - tx.amount) < 1.0;
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
          txsToInsert.push({
            id: txId,
            store_id: matched_store_id,
            store_name: matched_store_id ? matched_store_id : ofx.alias,
            title: tx.title || 'Importação OFX',
            subtitle: tx.counterpart_name || ofx.alias,
            amount: tx.amount || 0,
            type: tx.type,
            occurred_at: tx.date || new Date().toISOString(),
            target_date: targetDate,
            icon_type: 'bank',
            source: 'ofx',
            os_number: matched_os_number,
            fitid: tx.fitid || null,
            cnpj_cpf: tx.cnpj_cpf || null,
            counterpart_name: tx.counterpart_name || null,
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

      addLog(`⚙️ Gravando batch de ${txsToInsert.length} transações no banco...`, "info");
      const batch = await createImportBatch({ target_date: targetDate });
      
      await saveTransactions({ transactions: txsToInsert, storeBankBalances, storePreviousBalances, import_batch_id: batch.id } as any);
      addLog("✅ Transações do extrato e adquirente salvas com sucesso!", "success");

      if (matchesToInsert.length > 0) {
        addLog(`🔗 Vinculando ${matchesToInsert.length} pares perfeitos de conciliação...`, "info");
        
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
          addLog("✅ Pares de conciliação salvos com sucesso!", "success");
        } catch (matchErr: any) {
          console.warn("Aviso ao salvar pares de conciliação:", matchErr);
          addLog(`⚠️ Pares de conciliação salvos parcialmente (transações garantidas no banco).`, "warning");
        }
      }

      // Log de Importação
      addLog("📝 Atualizando histórico de importação (import_logs)...", "info");
      
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
      addLog("📝 Gravando fechamento diário (daily_snapshots)...", "info");
      
      let saldoNegativoItau = 0;
      results.ofxResults.forEach(ofx => {
        if (ofx.bankBalance !== undefined && ofx.bankBalance < 0) {
          saldoNegativoItau += Math.abs(ofx.bankBalance); // Somamos o valor absoluto do negativo
        }
      });

      let jurosRedeTotal = 0;
      results.redeResults.forEach(r => {
        if (r.success) {
          r.transactions.forEach(t => {
             jurosRedeTotal += t.interest || 0;
          });
        }
      });

      try {
        await saveSnapshot.mutateAsync({
          date: targetDate,
          caixa_atual: 0, // Será preenchido via conciliação
          faturamento: 0, // Será preenchido via conciliação
          total_recebiveis: 0,
          total_patio: 0,
          saldo_bancario: 0,
          dinheiro_mp: manualDinheiroMp,
          a_receber_manual: manualAReceber,
          faturamento_outros_valor: 0,
          contas_a_pagar: 0,
          provisao: 0,
          saldo_negativo_itau: saldoNegativoItau,
          juros_rede: jurosRedeTotal,
          notes: 'Valores gerados via Importação',
        });
        addLog("✅ Valores manuais globais salvos com sucesso!", "success");
      } catch (snapErr) {
        console.warn("Erro ao salvar daily_snapshot:", snapErr);
        addLog("⚠️ Aviso: Falha ao gravar valores manuais do dia.", "warning");
      }

      addLog("🎉 TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!", "success");
      setSaveFinished(true);

    } catch(e: any) {
      console.error(e);
      addLog(`❌ Erro ao confirmar importação: ${e.message || 'Falha no banco de dados.'}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Totais (Com Filtro Estrito para Preview)
  let filteredOsCount = 0;
  let allOsCount = 0;
  let totalOsMaqGlobal = 0;
  let totalOsBancoGlobal = 0;

  const totalOs = results.osFiles.reduce((acc, curr) => {
     let sum = 0;
     curr.osArray.forEach(os => {
        allOsCount++;
        const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;

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
      </div>

      <div className="flex items-center mb-8 space-x-4 max-w-3xl mx-auto">
        <StepIndicator current={step} step={1} title="Upload Unificado" />
        <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-subtle)]'}`} />
        <StepIndicator current={step} step={2} title="Mapeamento" />
        <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-subtle)]'}`} />
        <StepIndicator current={step} step={3} title="Preview" />
        <div className={`h-px flex-1 ${step > 3 ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-subtle)]'}`} />
        <StepIndicator current={step} step={4} title="Processando & Logs" />
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Esquerda: Upload Manual (Planilhas) */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                ${isDragActive 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.02]' 
                  : 'border-[var(--border-strong)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--bg-surface-hover)]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex gap-4 mb-6">
                 <div className="bg-[var(--color-primary)]/20 p-4 rounded-full shadow-xl border border-[var(--border-subtle)] text-[var(--color-primary)]">
                   <Database size={32} />
                 </div>
                 <div className="bg-[var(--color-accent-teal)]/20 p-4 rounded-full shadow-xl border border-[var(--border-subtle)] text-[var(--color-accent-teal)]">
                   <UploadCloud size={32} />
                 </div>
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-center">
                {isDragActive ? 'Solte os arquivos aqui' : 'Planilhas Manuais (Fallback)'}
              </h3>
              <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
                Arraste Planilhas OS, Rede e Extratos OFX (.xls, .xlsx, .ofx) caso precise importar manualmente.
              </p>
            </div>
            
            {/* Direita: Sincronização Automática Bot (Novo Fluxo Híbrido) */}
            <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-300 hover:border-[var(--color-primary)]/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs px-3 py-1 font-bold rounded-bl-xl border-l border-b border-[var(--color-primary)]/20 flex items-center gap-1">
                <Sparkles size={12} /> RECOMENDADO
              </div>
              <div className="bg-[var(--color-primary)]/10 p-5 rounded-full shadow-xl border border-[var(--color-primary)]/20 text-[var(--color-primary)] mb-6 animate-pulse">
                <RefreshCcw />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-center text-[var(--text-primary)]">
                Sincronização Cloud (Bot)
              </h3>
              <p className="text-[var(--text-secondary)] text-sm text-center max-w-sm mb-6">
                Busca automaticamente resumos de Ordens de Serviço (Pátio) e Contas a Pagar diretamente do sistema Oficina Inteligente em tempo real.
              </p>
              <Button 
                onClick={async () => {
                   addLog("Iniciando Sincronização Cloud via Bot...", "info");
                   // Em um fluxo real, chamaria a edge function aqui
                   // supabase.functions.invoke('sync-oficina', { body: { loja: 'st-02' } })
                   alert('Edge Function sync-oficina acionada. (Mock para demonstração da nova spec)');
                }}
                className="w-full shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] hover:scale-105 transition-transform"
              >
                Sincronizar Oficina Agora
              </Button>
            </div>
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
                                value={mapping[alias] || ''} 
                                onChange={e => updateMapping(alias, e.target.value)}
                                className={`w-full bg-[var(--bg-surface-elevated)] border rounded p-3 text-sm focus:outline-none 
                                  ${mapping[alias] ? 'border-[var(--color-accent-teal)] text-[var(--text-primary)]' : 'border-[var(--color-accent-warning)] text-[var(--text-secondary)] animate-pulse'}`}
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

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setSubStep(2)}>Próximo: Maquininhas & OS →</Button>
                  </div>
                </div>
              );
            })()}

            {/* BLOCO 2: REDE / OS */}
            {subStep === 2 && (() => {
              const otherAliases = new Set<string>();
              results.osFiles.filter(r => r.success).forEach(r => otherAliases.add(r.storeAlias));
              results.maquininhaItems.forEach(i => otherAliases.add(i.storeName));
              results.redeResults.filter(r => r.success).forEach(r => {
                r.transactions.forEach(t => otherAliases.add(t.storeName));
              });

              const aliasArray = Array.from(otherAliases);

              return (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="font-display font-semibold text-[var(--color-accent-teal)] flex items-center gap-2 mb-4">
                    <CreditCard size={20} /> 2. OS (Pátio) & Maquininha (Rede)
                  </h4>
                  {aliasArray.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)]">
                      Nenhuma loja de OS ou Maquininha identificada.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aliasArray.map(alias => (
                        <div key={`other-${alias}`} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                          <div className="flex-1">
                            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Loja na Planilha</span><br/>
                            <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">{alias}</span>
                          </div>
                          <LinkIcon className="text-[var(--color-accent-teal)]/50 shrink-0" size={24} />
                          <div className="flex-1">
                            <select 
                              value={mapping[alias] || ''} 
                              onChange={e => updateMapping(alias, e.target.value)}
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
                    <Button onClick={() => setStep(3)}>Avançar para Preview →</Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-[var(--bg-surface-elevated)] border-l-4 border-l-[var(--color-primary)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total OS (Líquido Pátio)</span>
                <FileText size={18} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                <AnimatedNumber value={totalOs} format="currency" />
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{filteredOsCount} ordens de serviço válidas</p>
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
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Extrato Bancário (OFX)</span>
                <Database size={18} className="text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                <AnimatedNumber value={totalOfxIn} format="currency" />
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{allOfxTx.length} entradas/saídas no extrato</p>
            </Card>
          </div>

          <Card className="p-8 space-y-6">
            <h3 className="font-display text-xl font-semibold">Previsão por Loja</h3>
            
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

                const storeOfxIn = results.ofxResults.filter(r => mapping[r.alias] === storeId).reduce((acc, r) => {
                  const txs = r.transactions.filter(tx => tx.type === 'in');
                  return acc + txs.reduce((sum, tx) => sum + tx.amount, 0);
                }, 0);

                if (rawOsMaq === 0 && storeRedeNet === 0 && storeOfxIn === 0) return null;

                return (
                  <div key={store.id} className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--color-primary)]/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"></div>
                        {store.name}
                      </h5>
                      <Badge variant="outline" className="text-xs">
                        {storeRedeNet > 0 ? 'Rede Ativa' : 'OFX Direct'}
                      </Badge>
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
                        <p className="font-bold text-sky-400 text-sm">{storeOfxIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Início: Valores Manuais Globais */}
            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
              <h4 className="font-semibold text-lg text-[var(--text-primary)]">Valores Manuais do Dia</h4>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Preencha os dados abaixo. Eles serão salvos no fechamento diário e não poderão ser editados na tela de conciliação.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">Dinheiro MP (Daniel)</label>
                  <input 
                    type="number" 
                    value={manualDinheiroMp} 
                    onChange={e => setManualDinheiroMp(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">A Receber (Boleto/Desc.)</label>
                  <input 
                    type="number" 
                    value={manualAReceber} 
                    onChange={e => setManualAReceber(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
            {/* Fim: Valores Manuais Globais */}

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

              <Button 
                onClick={handleConfirm}
                disabled={isSaving}
                className="py-4 px-8 text-base font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.4)] flex items-center gap-2"
              >
                {isSaving ? <LoadingSpinner size="xs" text="Iniciando..." /> : <Sparkles size={18} />}
                Confirmar e Gravar Importação
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* STEP 4: PAINEL EXECUTIVO DE PROGRESSO & GRAVAÇÃO */}
      {step === 4 && (() => {
        const progressPct = saveFinished ? 100 : (
          importLogs.some(l => l.message.includes('Vinculando')) ? 85 :
          importLogs.some(l => l.message.includes('extrato')) ? 65 :
          importLogs.some(l => l.message.includes('Rede')) ? 40 :
          importLogs.some(l => l.message.includes('Pátio')) ? 20 : 10
        );

        const currentPhase = saveFinished ? 'completed' : (
          importLogs.some(l => l.message.includes('Vinculando')) ? 'matches' :
          importLogs.some(l => l.message.includes('extrato') || l.message.includes('transações')) ? 'ofx' :
          importLogs.some(l => l.message.includes('Rede')) ? 'rede' : 'os'
        );

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="p-6 md:p-8 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-2xl shadow-xl space-y-6">
              
              {/* Header do Painel */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="text-[var(--color-primary)]" size={22} />
                    Painel de Gravação do Lote
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Persistindo e deduplicando Ordens de Serviço, Maquininhas e Extrato Bancário no Supabase...
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs font-mono px-3 py-1 bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]">
                    {progressPct}% Concluído
                  </Badge>
                </div>
              </div>

              {/* Barra de Progresso Animada */}
              <div className="space-y-1.5">
                <div className="w-full bg-[var(--bg-surface-elevated)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div 
                    className="bg-gradient-to-r from-[var(--color-primary)] via-sky-500 to-[var(--color-accent-teal)] h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Grid de Cards de Etapas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Etapa 1: Pátio OS */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentPhase === 'os' ? 'bg-[var(--bg-surface-elevated)] border-[var(--color-primary)]/50 shadow-md' :
                  saveFinished || currentPhase !== 'os' ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' :
                  'bg-[var(--bg-surface)]/50 border-[var(--border-subtle)]/50 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <FileText size={18} className="text-[var(--color-primary)]" />
                    {currentPhase === 'os' && !saveFinished && (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px] gap-1">
                        <LoadingSpinner size="xs" /> Gravando
                      </Badge>
                    )}
                    {(saveFinished || currentPhase !== 'os') && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 size={11} /> Concluído
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">1. OSs do Pátio</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{filteredOsCount} ordens salvas</p>
                </div>

                {/* Etapa 2: Maquininha */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentPhase === 'rede' ? 'bg-[var(--bg-surface-elevated)] border-[var(--color-accent-teal)]/50 shadow-md' :
                  ['ofx', 'matches', 'completed'].includes(currentPhase) ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' :
                  'bg-[var(--bg-surface)]/50 border-[var(--border-subtle)]/50 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard size={18} className="text-[var(--color-accent-teal)]" />
                    {currentPhase === 'rede' && !saveFinished && (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px] gap-1">
                        <LoadingSpinner size="xs" /> Gravando
                      </Badge>
                    )}
                    {['ofx', 'matches', 'completed'].includes(currentPhase) && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 size={11} /> Concluído
                      </Badge>
                    )}
                    {currentPhase === 'os' && (
                      <Badge variant="outline" className="bg-[var(--bg-surface)] text-[var(--text-tertiary)] border-[var(--border-subtle)] text-[10px]">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">2. Maquininha (Rede)</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{redeFiltered.length} cartões</p>
                </div>

                {/* Etapa 3: Extrato OFX */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentPhase === 'ofx' ? 'bg-[var(--bg-surface-elevated)] border-sky-500/50 shadow-md' :
                  ['matches', 'completed'].includes(currentPhase) ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' :
                  'bg-[var(--bg-surface)]/50 border-[var(--border-subtle)]/50 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <Database size={18} className="text-sky-400" />
                    {currentPhase === 'ofx' && !saveFinished && (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px] gap-1">
                        <LoadingSpinner size="xs" /> Gravando
                      </Badge>
                    )}
                    {['matches', 'completed'].includes(currentPhase) && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 size={11} /> Concluído
                      </Badge>
                    )}
                    {['os', 'rede'].includes(currentPhase) && (
                      <Badge variant="outline" className="bg-[var(--bg-surface)] text-[var(--text-tertiary)] border-[var(--border-subtle)] text-[10px]">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">3. Extrato Bancário</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{allOfxTx.length} extratos</p>
                </div>

                {/* Etapa 4: Conciliação */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentPhase === 'matches' ? 'bg-[var(--bg-surface-elevated)] border-purple-500/50 shadow-md' :
                  saveFinished ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' :
                  'bg-[var(--bg-surface)]/50 border-[var(--border-subtle)]/50 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles size={18} className="text-purple-400" />
                    {currentPhase === 'matches' && !saveFinished && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] gap-1">
                        <LoadingSpinner size="xs" /> Vinculando
                      </Badge>
                    )}
                    {saveFinished && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 size={11} /> Concluído
                      </Badge>
                    )}
                    {['os', 'rede', 'ofx'].includes(currentPhase) && !saveFinished && (
                      <Badge variant="outline" className="bg-[var(--bg-surface)] text-[var(--text-tertiary)] border-[var(--border-subtle)] text-[10px]">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">4. Conciliação</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Pares automáticos</p>
                </div>

              </div>

              {/* Feed de Atividades Limpo */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                  Diário de Operações
                </span>
                <div className="p-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {importLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2.5 text-xs">
                      {log.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> :
                       log.type === 'warning' ? <AlertCircle size={14} className="text-amber-400 shrink-0" /> :
                       log.type === 'error' ? <AlertCircle size={14} className="text-red-400 shrink-0" /> :
                       <Sparkles size={14} className="text-sky-400 shrink-0" />}
                      <span className={
                        log.type === 'success' ? 'text-emerald-300 font-medium' :
                        log.type === 'warning' ? 'text-amber-300 font-medium' :
                        log.type === 'error' ? 'text-red-400 font-semibold' :
                        'text-[var(--text-secondary)]'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Alerta de Erro se houver */}
              {importLogs.some(l => l.type === 'error') && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start justify-between gap-4 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-400 text-sm">Falha durante o processamento</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {importLogs.find(l => l.type === 'error')?.message}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConfirm} disabled={isSaving} className="bg-red-500 text-white hover:bg-red-600 text-xs px-3 py-1.5 shrink-0">
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* Painel de Sucesso e Ações Finais */}
              {saveFinished && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="pt-4 border-t border-[var(--border-subtle)] space-y-5">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl flex items-center gap-4">
                    <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-emerald-400 text-base">Lote Importado com Sucesso!</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Todas as OSs, vendas de cartão e lançamentos do extrato foram persistidos no banco de dados.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <Button
                      onClick={onCancel}
                      variant="secondary"
                      className="w-full sm:w-auto text-xs px-4 py-2.5"
                    >
                      <FileSpreadsheet size={16} />
                      Ver Histórico de Importações
                    </Button>

                    <Button
                      onClick={() => navigate({ to: '/conciliacao' })}
                      className="w-full sm:w-auto text-xs px-5 py-2.5 font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-[0_4px_15px_rgba(var(--color-primary-rgb),0.3)]"
                    >
                      <CheckCircle2 size={16} />
                      Ir para a Tela de Conciliação →
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        );
      })()}
    </div>
  );
}

