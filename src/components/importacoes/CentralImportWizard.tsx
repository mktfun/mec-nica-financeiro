import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { UploadCloud, CheckCircle2, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft, Database, Search, X, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCentralImport, UnifiedImportResult } from '@/hooks/useCentralImport';
import { useBulkInsertTransactions } from '@/hooks/useTransactions';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@tanstack/react-router';
import { savePatioOsAndReceivables, ParsedReceivable } from '@/hooks/useImportProcessor';

// Hook para gerenciar mapeamento de lojas
function useUnifiedStoreMapping() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetDateOs, setTargetDateOs] = useState<string>('');
  const [unmappedAliases, setUnmappedAliases] = useState<string[]>([]);
  
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping, setMapping } = useUnifiedStoreMapping();
  const { processFiles, isProcessing, results } = useCentralImport();
  const { mutateAsync: saveTransactions } = useBulkInsertTransactions();
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    await processFiles(acceptedFiles);
  };

  useEffect(() => {
    if (targetDate) {
      const d = new Date(targetDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      setTargetDateOs(d.toISOString().split('T')[0]);
    }
  }, [targetDate]);

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
    const unmapped = aliasArray.filter(alias => !currentMapping[alias]);
    setUnmappedAliases(unmapped);
    
    if (unmapped.length > 0) {
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

  const handleContinueToReview = async () => {
    setIsProcessing(true);
    try {
      // For each parsed OS file, query the DB to find existing OSs and compute delta_paid
      for (const osResult of results.osFiles.filter(r => r.success)) {
        let store_id = mapping[osResult.storeAlias];
        if (store_id === 'GLOBAL') store_id = null;
        if (!store_id) continue;

        // Fetch existing OSs for this store
        const { data: existingOs } = await supabase
          .from('patio_os')
          .select('os_number, paid_value')
          .eq('store_id', store_id);
          
        const existingMap = new Map((existingOs || []).map(o => [String(o.os_number), o]));

        osResult.osArray.forEach(os => {
          const existingObj = existingMap.get(String(os.os_number));
          const velho_valor_pago = existingObj ? Number(existingObj.paid_value) : 0;
          const delta_paid = os.paid_value - velho_valor_pago;
          
          (os as any).delta_paid = delta_paid;
          (os as any).is_new_os = !existingObj;

          // If you want separate deltas for credit/debit or pix, you would need to store them in patio_os too,
          // but for now, we just rely on delta_paid and allocate proportionally or entirely.
          // Since the user mainly cares about the total delta paid:
        });
      }
      setStep(3);
    } catch (e) {
      console.error(e);
      alert('Erro ao calcular histórico de OSs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const txsToInsert: any[] = [];
      const storeBankBalances: Record<string, number> = {};

      // 1. Inserir nas Tabelas de Origem (Pátio e Recebíveis) para histórico
      for (const osResult of results.osFiles.filter(r => r.success)) {
        let store_id: string | null = mapping[osResult.storeAlias];
        if (store_id === 'GLOBAL') store_id = null;
        if (store_id) {
          await savePatioOsAndReceivables(store_id, osResult.storeAlias, osResult.osArray, osResult.receivablesArray || []);
        }
      }

      // Maquininha (antigo fallback)
      const maqByStore: Record<string, any[]> = {};
      results.maquininhaItems.forEach(item => {
        let sid: string | null = mapping[item.storeName];
        if (sid === 'GLOBAL') sid = null;
        if (sid) {
          if (!maqByStore[sid]) maqByStore[sid] = [];
          maqByStore[sid].push(item);
        }
      });
      for (const [sid, items] of Object.entries(maqByStore)) {
        const storeName = items[0].storeName;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: 'Cartão Crédito',
          value: item.amount,
          date: item.dateVenda || targetDate,
          due_date: item.dateCredito || targetDate,
          status: 'recebido'
        }));
        await savePatioOsAndReceivables(sid, storeName, [], parsedRecs);
      }

      // Rede (novo formato)
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
      for (const [sid, items] of Object.entries(redeByStore)) {
        const storeName = items[0].storeName;
        const parsedRecs: ParsedReceivable[] = items.map(item => ({
          type: item.method,
          value: item.netAmount,
          date: item.date || targetDate,
          due_date: item.date || targetDate,
          status: 'recebido'
        }));
        // We will call savePatioOsAndReceivables inside handleConfirm, BUT with the already enriched osArray
      }

      // We do not save transactions here anymore. We just prepare the data for Step 3.
      
      // OFX
      results.ofxResults.forEach(ofx => {
        let store_id: string | null = mapping[ofx.alias];
        if (store_id === 'GLOBAL') store_id = null;
        if (ofx.bankBalance !== undefined && store_id) {
          storeBankBalances[store_id] = ofx.bankBalance;
        }

        ofx.transactions.forEach(tx => {
          const txDate = tx.date ? tx.date.split('T')[0] : targetDate;
          txsToInsert.push({
            store_id,
            store_name: ofx.alias,
            title: tx.title || 'Importação OFX',
            subtitle: tx.counterpart_name || ofx.alias,
            amount: tx.amount || 0,
            type: tx.type,
            occurred_at: tx.date || new Date().toISOString(),
            target_date: txDate,
            icon_type: 'bank',
            source: 'ofx',
            fitid: tx.fitid || null,
            cnpj_cpf: tx.cnpj_cpf || null,
            counterpart_name: tx.counterpart_name || null,
          });
        });
      });

      // Maquininha (fallback)
      results.maquininhaItems.forEach(item => {
        let store_id: string | null = mapping[item.storeName];
        if (store_id === 'GLOBAL') store_id = null;
        let formattedVenda = item.dateVenda;
        if (formattedVenda && formattedVenda.includes('/')) formattedVenda = formattedVenda.split('/').reverse().join('-');
        if (formattedVenda === targetDate || !formattedVenda) {
          txsToInsert.push({
              store_id,
              store_name: item.storeName,
              title: `Recebimento Adquirente (${item.dateVenda || targetDate})`,
              subtitle: item.storeName,
              amount: item.amount || 0,
              type: 'in',
              occurred_at: item.dateCredito ? new Date(item.dateCredito.split('/').reverse().join('-')).toISOString() : `${targetDate}T12:00:00Z`,
              target_date: targetDate,
              icon_type: 'card',
              source: 'maquininha'
          });
        }
      });

      // Rede (novo) - Insere o valor líquido
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => {
          let store_id: string | null = mapping[t.storeName];
          if (store_id === 'GLOBAL') store_id = null;
          if (t.date === targetDate || !t.date) {
             // Will be pushed during handleConfirm
          }
        });
      });

      // OSs (Filtro por Fechamento == targetDate) will be handled in handleConfirm

      results.osFiles.filter(r => r.success).forEach(osResult => {
         let store_id: string | null = mapping[osResult.storeAlias];
         if (store_id === 'GLOBAL') store_id = null;
         
         osResult.osArray.forEach(os => {
            const osDate = os.closed_at || os.opened_at;
            const is_new_os = (os as any).is_new_os;
            const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
            
            const isRevenueForToday = (is_new_os && osDate && osDate.startsWith(targetDate)) || (!is_new_os && delta > 0);
            
            if (isRevenueForToday && delta > 0) {
              txsToInsert.push({
                  store_id,
                  store_name: osResult.storeAlias,
                  title: `OS ${os.os_number} (${os.plate})`,
                  subtitle: os.payment_method || 'Sistema',
                  amount: delta,
                  type: 'in',
                  occurred_at: `${targetDate}T10:00:00Z`,
                  target_date: targetDate,
                  icon_type: 'system',
                  source: 'sistema',
                  os_number: os.os_number
              });
            }
         });
      });

      await saveTransactions({ transactions: txsToInsert, storeBankBalances } as any);

      // Log
      const logsToInsert = [{
          store_id: Object.values(mapping)[0] || 'GLOBAL',
          store_name: 'Conciliação Centralizada',
          target_date: targetDate,
          total_os: txsToInsert.filter(t => t.source === 'sistema').reduce((a,b) => a + b.amount, 0),
          os_count: txsToInsert.filter(t => t.source === 'sistema').length,
          total_paid_all: txsToInsert.reduce((a,b) => a + (b.type === 'in' ? b.amount : -b.amount), 0),
          receivables_count: txsToInsert.filter(t => t.source === 'maquininha' || t.source === 'rede').length
      }];

      const { error: upsertErr } = await supabase.from('import_logs').upsert(logsToInsert, { onConflict: 'store_id,target_date' });
      if (upsertErr) console.warn("Erro ao registrar import log", upsertErr);

      alert('Importação Concluída!');
      navigate({ to: '/importacoes' });
    } catch(e: any) {
      console.error(e);
      alert('Erro ao confirmar importação: ' + (e.message || 'Falha no banco de dados.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Totais (Com Filtro Estrito para Preview)
  let filteredOsCount = 0;
  let totalOsMaqGlobal = 0;
  let totalOsBancoGlobal = 0;

  const totalOs = results.osFiles.reduce((acc, curr) => {
     let sum = 0;
     curr.osArray.forEach(os => {
        const osDate = os.closed_at || os.opened_at;
        const is_new_os = (os as any).is_new_os;
        const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
        const isRevenueForToday = (is_new_os && osDate && osDate.startsWith(targetDateOs || targetDate)) || (!is_new_os && delta > 0);

        if (isRevenueForToday && delta > 0) {
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

  const totalMaqFallback = results.maquininhaItems.reduce((acc, item) => {
     let formattedVenda = item.dateVenda;
     if (formattedVenda && formattedVenda.includes('/')) formattedVenda = formattedVenda.split('/').reverse().join('-');
     if (formattedVenda === targetDate || !formattedVenda) return acc + item.amount;
     return acc;
  }, 0);

  const totalRedeGross = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.totalGross, 0);
  const totalRedeNet = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.totalNet, 0);
  const totalRedeInterest = results.redeResults.filter(r => r.success).reduce((acc, curr) => acc + curr.totalInterest, 0);

  const totalMaq = totalMaqFallback + totalRedeNet; // Usando valor líquido

  const totalMapaMetas = results.mapaMetasResults.filter(r => r.success).reduce((acc, curr) => acc + curr.totalFaturamento, 0);

  const targetOfx = results.ofxResults.flatMap(r => r.transactions).filter(tx => tx.date && tx.date.startsWith(targetDate));
  const totalOfxIn = targetOfx.filter(t => t.type === 'in').reduce((a,b) => a + b.amount, 0);
  const totalOfxOut = targetOfx.filter(t => t.type === 'out').reduce((a,b) => a + b.amount, 0);
  const totalOfxPreviousBalance = results.ofxResults.reduce((acc, r) => acc + (r.previousBalance || 0), 0);
  const totalOfxLedger = results.ofxResults.reduce((acc, r) => acc + (r.bankBalance || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">Conciliação Centralizada</h2>
          <p className="text-sm text-[var(--text-secondary)]">Solte OS (Excel), Maquininha (Rede) e OFX para fazer a conciliação tripla.</p>
        </div>
      </div>

      <div className="flex items-center mb-8 space-x-4 max-w-2xl mx-auto">
        <StepIndicator current={step} step={1} title="Upload Unificado" />
        <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-subtle)]'}`} />
        <StepIndicator current={step} step={2} title="Mapeamento" />
        <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-subtle)]'}`} />
        <StepIndicator current={step} step={3} title="Conciliação Tripla" />
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
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
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste Planilhas OS, Rede, OFX e Mapa de Metas'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
              O sistema detectará automaticamente o tipo de cada arquivo (.xls, .xlsx, .ofx, .pdf).
            </p>
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
            <h3 className="font-display text-xl font-semibold mb-6">Mapeamento de Entidades</h3>
            
            <div className="space-y-4">
              {unmappedAliases.map((alias) => {
                const ofx = results.ofxResults.find(o => o.alias === alias);
                const maq = results.maquininhaItems.find(m => m.storeName === alias);
                let redeSample: string | null = null;
                results.redeResults.forEach(r => {
                   const t = r.transactions.find(tx => tx.storeName === alias);
                   if (t) redeSample = `${t.method}: R$ ${t.netAmount} (Bruto: R$ ${t.grossAmount})`;
                });
                const fileName = ofx?.fileName || maq?.fileName;
                const sample = ofx 
                  ? ofx.transactions.slice(0, 2).map(t => `${t.title} (R$ ${t.amount})`).join(', ')
                  : redeSample ? `Rede: ${redeSample}` : maq ? `Exemplo de valor: R$ ${maq.amount}` : null;

                return (
                  <div key={alias} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="flex-1">
                      <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Identificado no Arquivo</span><br/>
                      <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">{alias}</span>
                      {fileName && (
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--color-primary)]">Origem:</span> {fileName}
                        </div>
                      )}
                      {sample && (
                        <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate max-w-sm">
                          <span className="font-semibold">Amostra:</span> {sample}
                        </div>
                      )}
                    </div>
                    <LinkIcon className="text-[var(--color-primary)]/50 shrink-0" size={24} />
                    <div className="flex-1">
                      <select 
                        className={`w-full bg-[var(--bg-surface-elevated)] border rounded p-3 text-sm focus:outline-none 
                          ${mapping[alias] ? 'border-[var(--color-accent-teal)] text-[var(--text-primary)]' : 'border-[var(--color-accent-warning)] text-[var(--text-secondary)] animate-pulse'}`}
                        value={mapping[alias] || ''}
                        onChange={(e) => updateMapping(alias, e.target.value)}
                      >
                        <option value="" disabled>Selecione uma loja...</option>
                        <option value="GLOBAL" className="text-[var(--color-accent-teal)]">Independente (Geral)</option>
                        {stores.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={handleContinueToReview} disabled={unmappedAliases.some(u => !mapping[u])}>
                Continuar para Revisão <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           <Card className="p-8 border-[var(--color-primary)]/30 relative overflow-hidden">
             
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl font-bold flex items-center gap-3">
                  <Search className="text-[var(--color-primary)]" size={28} />
                  Visualização da Conciliação Tripla
                </h3>
                {totalMapaMetas > 0 && (
                  <Badge variant="outline" className="bg-[var(--color-accent-purple)]/10 text-[var(--color-accent-purple)] border-[var(--color-accent-purple)]/30 px-3 py-1">
                    Faturamento PDF: R$ {totalMapaMetas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               {/* Coluna 1: OS (Dia X) */}
               <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex flex-col items-center">
                 <p className="text-sm text-[var(--text-secondary)] mb-2 font-medium">1. Sistema (Ordens de Serviço)</p>
                 <div className="text-3xl font-display font-bold text-[var(--text-primary)] mb-2">
                   <AnimatedNumber value={totalOs} format="currency" />
                 </div>
                 <p className="text-xs text-[var(--text-tertiary)]">{filteredOsCount} OS Finalizadas</p>
               </div>

               {/* Coluna 2: Maquininha */}
               <div className="p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex flex-col items-center relative">
                 <ArrowRight className="absolute -left-6 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hidden md:block" />
                 <p className="text-sm text-[var(--color-warning)] mb-2 font-medium">2. Adquirente (Rede LÍQUIDO)</p>
                 <div className="text-3xl font-display font-bold text-[var(--color-warning)] mb-2">
                   <AnimatedNumber value={totalMaq} format="currency" />
                 </div>
                 {totalRedeInterest > 0 && (
                   <p className="text-xs text-[var(--color-accent-danger)] flex items-center gap-1 font-medium mt-1">
                     <TrendingDown size={14} /> Juros Retidos: R$ {totalRedeInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </p>
                 )}
                 <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hidden md:block" />
               </div>

               {/* Coluna 3: Banco (OFX) */}
               <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex flex-col items-center">
                 <p className="text-sm text-[var(--color-success)] mb-2 font-medium">3. Extrato Bancário (Entradas)</p>
                 <div className="text-3xl font-display font-bold text-[var(--color-success)] mb-2">
                   <AnimatedNumber value={totalOfxIn} format="currency" />
                 </div>
                 <p className="text-xs text-[var(--color-success)] opacity-70">Saídas (Despesas): {totalOfxOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 {totalOfxPreviousBalance > 0 && (
                   <p className="text-xs text-[var(--text-tertiary)] mt-1">
                     Saldo Ant.: {totalOfxPreviousBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     {totalOfxLedger > 0 && <> → Atual: {totalOfxLedger.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>}
                   </p>
                 )}
               </div>
             </div>

             {/* Análise de Divergência */}
             <div className="mb-8 p-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
               <h4 className="font-semibold text-[var(--text-primary)] mb-4">Status da Conciliação Global</h4>
               
               {/* Comparamos o BRUTO da Rede com o OS (Maq), mas mostramos o líquido pra conciliar com o Banco */}
               {Math.abs(totalOsMaqGlobal - (totalRedeGross || totalMaqFallback)) > 1 && totalOsMaqGlobal > 0 && (totalRedeGross > 0 || totalMaqFallback > 0) ? (
                 <div className="text-[var(--color-accent-danger)] text-sm flex items-center gap-2 bg-[var(--color-accent-danger)]/10 p-3 rounded mb-2 border border-[var(--color-accent-danger)]/20">
                   <X size={16} /> <strong>Divergência Crítica Bruta:</strong> O Valor Bruto da Maquininha ({totalRedeGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) diverge das OSs geradas ({totalOsMaqGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                 </div>
               ) : (totalOsMaqGlobal > 0 && (totalRedeGross > 0 || totalMaqFallback > 0)) ? (
                 <div className="text-[var(--color-success)] text-sm flex items-center gap-2 bg-[var(--color-success)]/10 p-3 rounded mb-2">
                   <CheckCircle2 size={16} /> <strong>OS vs Maquininha Bateu!</strong> Valor Bruto conciliado com sucesso.
                 </div>
               ) : null}

               {Math.abs(totalMaq - totalOfxIn) > 1 && totalMaq > 0 && totalOfxIn > 0 ? (
                 <div className="text-[var(--color-warning)] text-sm flex items-center gap-2 bg-[var(--color-warning)]/10 p-3 rounded mt-2 border border-[var(--color-warning)]/20">
                   <CheckCircle2 size={16} /> <strong>Divergência de Depósito:</strong> O valor que entrou no banco ({totalOfxIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) difere do valor líquido da Rede ({totalMaq.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                 </div>
               ) : (totalMaq > 0 && totalOfxIn > 0) ? (
                 <div className="text-[var(--color-success)] text-sm flex items-center gap-2 bg-[var(--color-success)]/10 p-3 rounded mt-2">
                   <CheckCircle2 size={16} /> <strong>Maquininha vs Banco Bateu!</strong> Valor líquido depositado com sucesso.
                 </div>
               ) : null}
             </div>

             {/* Análise por Loja */}
             <div className="mb-8 p-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
               <h4 className="font-semibold text-[var(--text-primary)] mb-4">Detalhamento por Loja</h4>
               <div className="space-y-3">
                 {Array.from(new Set(Object.values(mapping).filter(id => id && id !== 'GLOBAL'))).map(storeId => {
                   const store = stores.find((s: any) => s.id === storeId);
                   if (!store) return null;

                   // Totais Locais
                   const storeOsMaq = results.osFiles.filter(r => r.success && mapping[r.storeAlias] === storeId).reduce((acc, curr) => {
                     let sum = 0;
                     curr.osArray.forEach(os => {
                        const osDate = os.closed_at || os.opened_at;
                        const is_new_os = (os as any).is_new_os;
                        const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                        const isRevenueForToday = (is_new_os && osDate && osDate.startsWith(targetDate)) || (!is_new_os && delta > 0);

                        if (isRevenueForToday && delta > 0) {
                          const totalOsValue = os.paid_value > 0 ? os.paid_value : 1;
                          const creditRatio = (os.parsed_credit_debit || 0) / totalOsValue;
                          const pixRatio = (os.parsed_pix_transfer || 0) / totalOsValue;

                          if (creditRatio > 0 || pixRatio > 0) {
                            sum += (delta * creditRatio);
                          } else {
                            const methodLower = (os.payment_method || '').toLowerCase();
                            if (!methodLower.includes('pix') && !methodLower.includes('transf') && !methodLower.includes('dinheiro')) {
                              sum += delta;
                            }
                          }
                        }
                     });
                     return acc + sum;
                   }, 0);

                   const storeOsBanco = results.osFiles.filter(r => r.success && mapping[r.storeAlias] === storeId).reduce((acc, curr) => {
                     let sum = 0;
                     curr.osArray.forEach(os => {
                        const osDate = os.closed_at || os.opened_at;
                        const is_new_os = (os as any).is_new_os;
                        const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
                        const isRevenueForToday = (is_new_os && osDate && osDate.startsWith(targetDate)) || (!is_new_os && delta > 0);

                        if (isRevenueForToday && delta > 0) {
                          const totalOsValue = os.paid_value > 0 ? os.paid_value : 1;
                          const pixRatio = (os.parsed_pix_transfer || 0) / totalOsValue;

                          if (pixRatio > 0 || (os.parsed_credit_debit || 0) > 0) {
                            sum += (delta * pixRatio);
                          } else {
                            const methodLower = (os.payment_method || '').toLowerCase();
                            if (methodLower.includes('pix') || methodLower.includes('transf') || methodLower.includes('dinheiro')) {
                              sum += delta;
                            }
                          }
                        }
                     });
                     return acc + sum;
                   }, 0);
                   
                   const storeOs = storeOsMaq + storeOsBanco;

                   const storeRedeGross = results.redeResults.filter(r => r.success).reduce((acc, r) => {
                     const txs = r.transactions.filter(tx => mapping[tx.storeName] === storeId);
                     return acc + txs.reduce((sum, tx) => sum + tx.grossAmount, 0);
                   }, 0);

                   const storeRedeNet = results.redeResults.filter(r => r.success).reduce((acc, r) => {
                     const txs = r.transactions.filter(tx => mapping[tx.storeName] === storeId);
                     return acc + txs.reduce((sum, tx) => sum + tx.netAmount, 0);
                   }, 0);

                   const storeOfxIn = results.ofxResults.filter(r => mapping[r.alias] === storeId).reduce((acc, r) => {
                     const txs = r.transactions.filter(tx => tx.date && tx.date.startsWith(targetDate) && tx.type === 'in');
                     return acc + txs.reduce((sum, tx) => sum + tx.amount, 0);
                   }, 0);

                   const storeOfxOut = results.ofxResults.filter(r => mapping[r.alias] === storeId).reduce((acc, r) => {
                     const txs = r.transactions.filter(tx => tx.date && tx.date.startsWith(targetDate) && tx.type === 'out');
                     return acc + txs.reduce((sum, tx) => sum + tx.amount, 0);
                   }, 0);

                   // Alertas
                   let storeStatus = null;
                   const hasGlobalOfx = Object.values(mapping).includes('GLOBAL') && results.ofxResults.some(r => mapping[r.alias] === 'GLOBAL');

                   if (storeOs === 0 && storeRedeGross === 0 && (storeOfxIn === 0 || hasGlobalOfx)) {
                     storeStatus = <span className="text-[var(--text-tertiary)] text-xs flex items-center gap-1">Nenhum movimento mapeado</span>;
                   } else if (storeOsMaq === 0) {
                     if (storeOfxIn > 0 && storeRedeNet === 0) {
                       storeStatus = <span className="text-[var(--color-accent-purple)] text-xs flex items-center gap-1"><AlertCircle size={14} /> Faturamento no Extrato sem OS e s/ Rede</span>;
                     } else if (storeRedeNet > 0 && storeOfxIn === 0 && !hasGlobalOfx) {
                       storeStatus = <span className="text-[var(--color-warning)] text-xs flex items-center gap-1"><TrendingDown size={14} /> Faturamento na Maq. sem OS (OFX zerado)</span>;
                     } else if (storeRedeNet > 0 && storeOfxIn > 0) {
                       if (Math.abs(storeRedeNet - storeOfxIn) > 1) {
                         storeStatus = <span className="text-[var(--color-accent-danger)] text-xs flex items-center gap-1"><X size={14} /> Faturamento s/ OS (Maq) e Divergência Maq x Banco</span>;
                       } else {
                         storeStatus = <span className="text-[var(--color-accent-purple)] text-xs flex items-center gap-1"><AlertCircle size={14} /> Faturamento na Maq. sem OS mapeada</span>;
                       }
                     } else if (storeRedeNet > 0 && storeOfxIn === 0 && hasGlobalOfx) {
                         storeStatus = <span className="text-[var(--color-warning)] text-xs flex items-center gap-1"><AlertCircle size={14} /> Faturamento na Maq. sem OS</span>;
                     }
                   } else {
                     // storeOsMaq > 0 or storeOsBanco > 0
                     if (storeRedeGross === 0 && storeOfxIn === 0) {
                       storeStatus = <span className="text-[var(--color-warning)] text-xs flex items-center gap-1"><AlertCircle size={14} /> OS faturada, mas Maq e Banco zerados</span>;
                     } else if (storeRedeGross === 0 && storeOfxIn > 0) {
                       storeStatus = <span className="text-[var(--color-warning)] text-xs flex items-center gap-1"><AlertCircle size={14} /> OS e Banco identificados, sem Rede</span>;
                     } else if (storeRedeGross > 0 && storeOfxIn === 0 && !hasGlobalOfx) {
                       storeStatus = <span className="text-[var(--color-warning)] text-xs flex items-center gap-1"><TrendingDown size={14} /> OS e Maq faturados, mas Banco zerado</span>;
                     } else if (storeRedeGross > 0 && storeOfxIn > 0) {
                       if (Math.abs(storeOsMaq - storeRedeGross) > 1) {
                         storeStatus = <span className="text-[var(--color-accent-danger)] text-xs flex items-center gap-1"><X size={14} /> Divergência OS x Maq</span>;
                       } else if (Math.abs(storeRedeNet - storeOfxIn) > 1) {
                         storeStatus = <span className="text-[var(--color-accent-danger)] text-xs flex items-center gap-1"><X size={14} /> Divergência Maq x Banco</span>;
                       } else {
                         storeStatus = <span className="text-[var(--color-success)] text-xs flex items-center gap-1"><CheckCircle2 size={14} /> Tudo Certo!</span>;
                       }
                     } else if (hasGlobalOfx && storeRedeGross > 0) {
                       if (Math.abs(storeOsMaq - storeRedeGross) > 1) {
                         storeStatus = <span className="text-[var(--color-accent-danger)] text-xs flex items-center gap-1"><X size={14} /> Divergência OS x Maq</span>;
                       } else {
                         storeStatus = <span className="text-[var(--color-success)] text-xs flex items-center gap-1"><CheckCircle2 size={14} /> OK (OFX Geral)</span>;
                       }
                     }
                   }

                   return (
                     <div key={storeId} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                       <div className="font-semibold text-sm mb-2 md:mb-0">{store.name}</div>
                       <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                         <div>OS: <span className="font-mono text-[var(--text-primary)]">{storeOs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                         <div>Maquininha (Líq): <span className="font-mono text-[var(--color-warning)]">{storeRedeNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                         <div>Banco (Entrada): <span className="font-mono text-[var(--color-success)]">{storeOfxIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                         <div>Banco (Saída): <span className="font-mono text-[var(--color-accent-danger)]">{storeOfxOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                       </div>
                       <div className="mt-2 md:mt-0 font-medium">
                         {storeStatus}
                       </div>
                     </div>
                   );
                 })}
                 {Array.from(new Set(Object.values(mapping).filter(id => id && id !== 'GLOBAL'))).length === 0 && (
                   <div className="text-sm text-[var(--text-tertiary)] italic p-4 text-center">Nenhuma loja específica mapeada.</div>
                 )}
               </div>
             </div>

             <div className="mb-8 p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Data do Depósito (Banco)</label>
                   <input 
                     type="date" 
                     value={targetDate} 
                     onChange={e => setTargetDate(e.target.value)} 
                     className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Data de Fechamento (OS)</label>
                   <input 
                     type="date" 
                     value={targetDateOs} 
                     onChange={e => setTargetDateOs(e.target.value)} 
                     className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                   />
                 </div>
               </div>
               <p className="text-xs text-[var(--text-tertiary)] mt-3">O Extrato Bancário e a Maquininha serão lidos na Data do Depósito. As OSs serão lidas na Data de Fechamento.</p>
             </div>

             <Button 
               onClick={handleConfirm}
               disabled={isSaving}
               className="w-full py-6 text-lg font-semibold rounded-[var(--radius-full)] shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.4)]"
             >
               {isSaving ? 'Salvando Match Triplo...' : 'Confirmar Lançamentos Validados'}
             </Button>
           </Card>
        </motion.div>
      )}
    </div>
  );
}
