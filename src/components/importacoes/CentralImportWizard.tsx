import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { UploadCloud, CheckCircle2, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft, Database, Search, X } from 'lucide-react';
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
    if (isProcessing) return;
    if (results.osFiles.length === 0 && results.maquininhaItems.length === 0 && results.ofxResults.length === 0) return;

    // Coletar todos os aliases únicos
    const aliases = new Set<string>();
    results.osFiles.filter(r => r.success).forEach(r => aliases.add(r.storeAlias));
    results.maquininhaItems.forEach(i => aliases.add(i.storeName));
    results.ofxResults.forEach(o => aliases.add(o.alias));

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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

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

      // 2. Extrair APENAS itens do targetDate para a Tabela Transactions (Conciliação D+1)
      
      // OFX
      results.ofxResults.forEach(ofx => {
        let store_id: string | null = mapping[ofx.alias];
        if (store_id === 'GLOBAL') store_id = null;
        if (ofx.bankBalance !== undefined && store_id) {
          storeBankBalances[store_id] = ofx.bankBalance;
        }

        ofx.transactions.forEach(tx => {
          txsToInsert.push({
            store_id,
            store_name: ofx.alias,
            title: tx.title || 'Importação OFX',
            subtitle: ofx.alias,
            amount: tx.amount || 0,
            type: tx.type,
            occurred_at: tx.date || new Date().toISOString(),
            target_date: targetDate,
            icon_type: 'bank',
            source: 'ofx'
          });
        });
      });

      // Maquininha (D+1 Bridge - Filtro por Venda == targetDate)
      results.maquininhaItems.forEach(item => {
        let store_id: string | null = mapping[item.storeName];
        if (store_id === 'GLOBAL') store_id = null;
        
        let formattedVenda = item.dateVenda;
        if (formattedVenda && formattedVenda.includes('/')) {
           formattedVenda = formattedVenda.split('/').reverse().join('-');
        }
        
        // Só entra na conciliação atual se a data da venda for o targetDate
        if (formattedVenda === targetDate || !formattedVenda) {
          txsToInsert.push({
              store_id,
              store_name: item.storeName,
              title: `Recebimento Rede (${item.dateVenda || targetDate})`,
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

      // OSs (Filtro por Fechamento == targetDate)
      results.osFiles.filter(r => r.success).forEach(osResult => {
         let store_id: string | null = mapping[osResult.storeAlias];
         if (store_id === 'GLOBAL') store_id = null;
         
         osResult.osArray.forEach(os => {
            const osDate = os.closed_at || os.opened_at;
            const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
            
            // Só entra na conciliação se a OS foi fechada neste dia e o valor pago é maior que 0
            if (osDate && osDate.startsWith(targetDate) && delta > 0) {
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
          store_name: 'Conciliação Tripla D+1',
          target_date: targetDate,
          total_os: txsToInsert.filter(t => t.source === 'sistema').reduce((a,b) => a + b.amount, 0),
          os_count: txsToInsert.filter(t => t.source === 'sistema').length,
          total_paid_all: txsToInsert.reduce((a,b) => a + (b.type === 'in' ? b.amount : -b.amount), 0),
          receivables_count: txsToInsert.filter(t => t.source === 'maquininha').length
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

  // Totais
  const totalOs = results.osFiles.reduce((acc, curr) => acc + curr.osArray.reduce((a,b) => a + b.paid_value, 0), 0);
  const totalMaq = results.maquininhaItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOfxIn = results.ofxResults.reduce((acc, curr) => acc + curr.transactions.filter(t => t.type === 'in').reduce((a,b) => a + b.amount, 0), 0);
  const totalOfxOut = results.ofxResults.reduce((acc, curr) => acc + curr.transactions.filter(t => t.type === 'out').reduce((a,b) => a + b.amount, 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Conciliação Centralizada</h2>
          <p className="text-sm text-[var(--text-secondary)]">Solte OS, Maquininha e OFX para fazer a conciliação tripla.</p>
        </div>
      </div>

      <div className="flex items-center mb-8 space-x-4 max-w-2xl mx-auto">
        <StepIndicator current={step} step={1} title="Upload Unificado" />
        <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
        <StepIndicator current={step} step={2} title="Mapeamento" />
        <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
        <StepIndicator current={step} step={3} title="Conciliação Tripla" />
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
              ${isDragActive 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.02]' 
                : 'border-[var(--border-strong)] hover:border-[var(--color-primary)]/50 hover:bg-white/[0.02]'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex gap-4 mb-6">
               <div className="bg-[var(--color-primary)]/20 p-4 rounded-full shadow-xl border border-white/5 text-[var(--color-primary)]">
                 <Database size={32} />
               </div>
               <div className="bg-[var(--color-accent-teal)]/20 p-4 rounded-full shadow-xl border border-white/5 text-[var(--color-accent-teal)]">
                 <UploadCloud size={32} />
               </div>
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-center">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste Planilhas OS, Maquininha e OFX'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
              O sistema detectará automaticamente o tipo de cada arquivo (.xls, .xlsx, .ofx).
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
                const fileName = ofx?.fileName || maq?.fileName;
                const sample = ofx 
                  ? ofx.transactions.slice(0, 2).map(t => `${t.title} (R$ ${t.amount})`).join(', ')
                  : maq ? `Exemplo de valor: R$ ${maq.amount}` : null;

                return (
                  <div key={alias} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-white/5">
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
                          ${mapping[alias] ? 'border-[var(--color-accent-teal)] text-white' : 'border-[var(--color-accent-warning)] text-[var(--text-secondary)] animate-pulse'}`}
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
              <Button onClick={() => setStep(3)} disabled={unmappedAliases.some(u => !mapping[u])}>
                Continuar para Revisão <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           <Card className="p-8 border-[var(--color-primary)]/30 relative overflow-hidden">
             
             <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-3">
               <Search className="text-[var(--color-primary)]" size={28} />
               Visualização da Conciliação Tripla
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               {/* Coluna 1: OS (Dia X) */}
               <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
                 <p className="text-sm text-[var(--text-secondary)] mb-2 font-medium">1. Sistema (Ordens de Serviço)</p>
                 <div className="text-3xl font-display font-bold text-white mb-2">
                   <AnimatedNumber value={totalOs} format="currency" />
                 </div>
                 <p className="text-xs text-[var(--text-tertiary)]">{results.osFiles.reduce((a,b)=>a+b.osCount,0)} OS Finalizadas</p>
               </div>

               {/* Coluna 2: Maquininha (D+1) */}
               <div className="p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex flex-col items-center relative">
                 <ArrowRight className="absolute -left-6 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hidden md:block" />
                 <p className="text-sm text-[var(--color-warning)] mb-2 font-medium">2. Adquirente (Maquininha)</p>
                 <div className="text-3xl font-display font-bold text-[var(--color-warning)] mb-2">
                   <AnimatedNumber value={totalMaq} format="currency" />
                 </div>
                 <p className="text-xs text-[var(--color-warning)] opacity-70">Valores em Trânsito</p>
                 <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hidden md:block" />
               </div>

               {/* Coluna 3: Banco (OFX) */}
               <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex flex-col items-center">
                 <p className="text-sm text-[var(--color-success)] mb-2 font-medium">3. Extrato Bancário (Entradas)</p>
                 <div className="text-3xl font-display font-bold text-[var(--color-success)] mb-2">
                   <AnimatedNumber value={totalOfxIn} format="currency" />
                 </div>
                 <p className="text-xs text-[var(--color-success)] opacity-70">Saídas (Despesas): R$ {totalOfxOut.toLocaleString('pt-BR')}</p>
               </div>
             </div>

             {/* Análise de Divergência */}
             <div className="mb-8 p-6 bg-[var(--bg-surface-elevated)] border border-white/10 rounded-xl">
               <h4 className="font-semibold text-[var(--text-primary)] mb-4">Status da Conciliação</h4>
               {Math.abs(totalOs - totalMaq) > 1 ? (
                 <div className="text-[var(--color-accent-danger)] text-sm flex items-center gap-2 bg-[var(--color-accent-danger)]/10 p-3 rounded">
                   <X size={16} /> <strong>Divergência Crítica:</strong> Valor do Sistema diverge da Maquininha. Verifique juros/descontos não lançados.
                 </div>
               ) : Math.abs(totalMaq - totalOfxIn) > 1 && totalMaq > 0 ? (
                 <div className="text-[var(--color-warning)] text-sm flex items-center gap-2 bg-[var(--color-warning)]/10 p-3 rounded mt-2">
                   <CheckCircle2 size={16} /> <strong>Divergência D+1:</strong> Banco difere da Maquininha. Verifique se o lote do banco contém crédito de D-1 ou taxas bancárias descontadas.
                 </div>
               ) : (
                 <div className="text-[var(--color-success)] text-sm flex items-center gap-2 bg-[var(--color-success)]/10 p-3 rounded">
                   <CheckCircle2 size={16} /> <strong>Conciliação Perfeita:</strong> Valores batem no Match Triplo!
                 </div>
               )}
             </div>

             <div className="mb-8 p-4 bg-black/20 border border-white/10 rounded-xl">
               <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Data de Competência (D)</label>
               <input 
                 type="date" 
                 value={targetDate} 
                 onChange={e => setTargetDate(e.target.value)} 
                 className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
               />
               <p className="text-xs text-[var(--text-tertiary)] mt-2">Os dados da Maquininha atuarão como ponte para entradas do Banco em D+1.</p>
             </div>

             <Button 
               onClick={handleConfirm}
               disabled={isSaving}
               className="w-full py-6 text-lg font-semibold rounded-[var(--radius-full)] shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.4)]"
             >
               {isSaving ? 'Salvando Match Triplo...' : 'Confirmar Importação Tripla'}
             </Button>
           </Card>
        </motion.div>
      )}
    </div>
  );
}
