import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import { FileSpreadsheet, AlertTriangle, ArrowRight, UploadCloud, FileType2, Database, Link as LinkIcon, CheckCircle2, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import { processExpenseFiles, ExpenseImportResult } from '@/hooks/useExpenseImportProcessor';
import { ParsedExpense } from '@/lib/parsers/contasAPagarParser';
import { useBulkInsertTransactions } from '@/hooks/useTransactions'; 
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/importacoes-despesas')({
  component: ImportacoesDespesasWizard,
});

// Hook local para gerenciar persistência de de-para de lojas
function useStoreMapping() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const saved = localStorage.getItem('@mecanica/store-mappings');
    if (saved) {
      try {
        setMapping(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const updateMapping = (alias: string, storeId: string) => {
    setMapping(prev => {
      const next = { ...prev, [alias]: storeId };
      localStorage.setItem('@mecanica/store-mappings', JSON.stringify(next));
      return next;
    });
  };

  return { mapping, updateMapping };
}

function ImportacoesDespesasWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<ExpenseImportResult[]>([]);
  const [allExpenses, setAllExpenses] = useState<ParsedExpense[]>([]);
  const [unmappedStores, setUnmappedStores] = useState<string[]>([]);
  
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping } = useStoreMapping();
  const bulkInsert = useBulkInsertTransactions(); // We will create this
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setFiles(prev => [...prev, ...acceptedFiles]);
    setIsProcessing(true);
    
    // Ler arquivos
    const results = await processExpenseFiles(acceptedFiles);
    setImportResults(prev => [...prev, ...results]);
    
    const allExp: ParsedExpense[] = [];
    results.forEach(r => { if (r.success) allExp.push(...r.expenses) });
    setAllExpenses(allExp);

    // Identificar lojas não mapeadas
    const aliases = Array.from(new Set(allExp.map(e => e.storeName)));
    const unmapped = aliases.filter(alias => !mapping[alias]);
    
    setIsProcessing(false);
    
    if (unmapped.length > 0) {
      setUnmappedStores(unmapped);
      setStep(2);
    } else if (allExp.length > 0) {
      setStep(3);
    }
  }, [mapping]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const handleCompleteMapping = () => {
    setStep(3);
  };

  const handleConfirmImport = async () => {
    try {
      setIsProcessing(true);
      const batchCreatedAt = new Date().toISOString();
      const logsToInsert: any[] = [];
      const storeDates = new Set<string>();
      
      // Montar os dados para o Supabase
      const payload = allExpenses.map(exp => {
        const storeId = mapping[exp.storeName];
        if (!storeId) throw new Error(`Loja ${exp.storeName} não está mapeada!`);
        
        const date = exp.occurredAt.split('T')[0];
        const sId = storeId === 'GLOBAL' ? null : storeId;
        const key = `${sId}_${date}`;
        
        if (!storeDates.has(key)) {
          storeDates.add(key);
          const storeName = stores.find(s => s.id === storeId)?.name || 'Master';
          logsToInsert.push({
            store_id: sId,
            store_name: storeName,
            target_date: date,
            os_count: 0,
            receivables_count: 0,
            total_os: 0,
            created_at: batchCreatedAt
          });
        }
        
        return {
          store_id: sId,
          type: 'out' as const,
          amount: exp.amount,
          occurred_at: exp.occurredAt,
          title: exp.description,
          subtitle: exp.category,
          created_at: batchCreatedAt
        };
      });

      if (logsToInsert.length > 0) {
        await supabase.from('import_logs').insert(logsToInsert);
      }
      
      await bulkInsert.mutateAsync(payload);
      alert('Despesas importadas com sucesso!');
      navigate({ to: '/importacoes' });
    } catch (err: any) {
      alert('Erro ao importar: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalValue = allExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Header & Steps */}
        <div className="mb-10">
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <Database size={28} className="text-[var(--color-primary)]" />
            Importar Despesas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Faça upload das planilhas de Contas a Pagar e Juros Rede
          </p>

          <div className="flex items-center mt-8 space-x-4">
            <StepIndicator current={step} step={1} title="Upload" />
            <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
            <StepIndicator current={step} step={2} title="Mapeamento" />
            <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
            <StepIndicator current={step} step={3} title="Revisão" />
          </div>
        </div>

        {/* STEP 1: UPLOAD */}
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
              <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-full mb-4 shadow-xl border border-white/5">
                <UploadCloud size={40} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-center">
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste planilhas de despesas'}
              </h3>
              <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
                Suporta múltiplos arquivos simultâneos. Formatos aceitos: .xls (Contas a Pagar antigo) e .xlsx (Juros Rede).
              </p>
            </div>
            
            {isProcessing && (
              <div className="mt-8 flex justify-center">
                 <div className="flex items-center gap-3 animate-pulse text-[var(--text-secondary)]">
                   <LoadingSpinner size="sm" /> 
                   <span>Processando planilhas...</span>
                 </div>
              </div>
            )}
            
            {importResults.length > 0 && !isProcessing && (
              <div className="mt-6 space-y-2">
                {importResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded">
                    {r.success ? <CheckCircle2 size={16} className="text-[var(--color-accent-teal)]" /> : <X size={16} className="text-[var(--color-accent-danger)]" />}
                    <span>{r.fileName}</span>
                    <span className="text-[var(--text-tertiary)] ml-auto">
                      {r.success ? `${r.expenses.length} itens` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: MAPEAMENTO DE LOJAS */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="font-display text-xl font-semibold mb-1">Mapeamento de Entidades</h3>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Identificamos {unmappedStores.length} lojas nos arquivos que precisam ser vinculadas ao sistema.
                  </p>
                </div>
                <div className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-accent-teal)]/20 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Memorização Inteligente Ativa
                </div>
              </div>

              <div className="space-y-4">
                {unmappedStores.map((storeName) => (
                  <div key={storeName} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileType2 size={16} className="text-[var(--text-tertiary)]" />
                        <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Identificado na Planilha</span>
                      </div>
                      <span className="font-mono text-lg font-semibold bg-white/5 px-2 py-0.5 rounded text-[var(--text-primary)]">{storeName}</span>
                    </div>
                    
                    <LinkIcon className="text-[var(--color-primary)]/50 shrink-0" size={24} />
                    
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-1 block">Ligar à Loja (Sistema)</label>
                      <select 
                        className={`w-full bg-[var(--bg-surface-elevated)] border rounded-[var(--radius-sm)] p-3 text-sm focus:outline-none transition-all duration-300
                          ${mapping[storeName] 
                            ? 'border-[var(--color-accent-teal)]/50 text-white shadow-[0_0_15px_rgba(50,215,171,0.1)]' 
                            : 'border-[var(--color-accent-warning)]/50 text-[var(--text-secondary)] animate-pulse'
                          }
                        `}
                        value={mapping[storeName] || ''}
                        onChange={(e) => updateMapping(storeName, e.target.value)}
                      >
                        <option value="" disabled>Selecione uma loja...</option>
                        <option value="GLOBAL" className="text-[var(--color-accent-teal)] font-semibold">Independente (Centro de Custos Geral)</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.is_matriz ? '(Master)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleCompleteMapping}
                  disabled={unmappedStores.some(u => !mapping[u])}
                  className="px-8 py-6 rounded-full text-base font-semibold shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.3)] hover:scale-105"
                >
                  Continuar para Revisão
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: REVISÃO */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <Card className="p-8 border-[var(--color-primary)]/30 relative overflow-hidden">
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
               
               <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-3">
                 <CheckCircle2 className="text-[var(--color-accent-teal)]" size={28} />
                 Resumo Pronto para Importação
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div className="p-4 rounded-[var(--radius-md)] bg-white/5 border border-white/10">
                   <p className="text-sm text-[var(--text-tertiary)] mb-1">Total de Despesas Lidas</p>
                   <p className="text-3xl font-display font-bold text-[var(--color-accent-danger)]">
                     - <AnimatedNumber value={totalValue} format="currency" />
                   </p>
                 </div>
                 <div className="p-4 rounded-[var(--radius-md)] bg-white/5 border border-white/10">
                   <p className="text-sm text-[var(--text-tertiary)] mb-1">Lançamentos Identificados</p>
                   <p className="text-3xl font-display font-bold">{allExpenses.length}</p>
                 </div>
               </div>

               <div className="space-y-2 max-h-[300px] overflow-y-auto mb-8 pr-2">
                 <h4 className="text-sm font-semibold mb-3 border-b border-white/10 pb-2">Distribuição por Loja (Aliases)</h4>
                 {Array.from(new Set(allExpenses.map(e => e.storeName))).map(alias => {
                   const storeExps = allExpenses.filter(e => e.storeName === alias);
                   const storeTotal = storeExps.reduce((a, c) => a + c.amount, 0);
                   const mappedStoreName = mapping[alias] === 'GLOBAL' ? 'Centro de Custos Geral' : (stores.find(s => s.id === mapping[alias])?.name || alias);
                   
                   return (
                     <div key={alias} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10">
                       <div className="flex flex-col">
                          <span className="font-medium text-white">{mappedStoreName}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">via "{alias}" ({storeExps.length} itens)</span>
                       </div>
                       <span className="text-[var(--color-accent-danger)] font-medium">- {storeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                     </div>
                   );
                 })}
               </div>

               <Button 
                 onClick={handleConfirmImport}
                 disabled={bulkInsert.isPending}
                 className="w-full py-6 text-lg font-semibold rounded-[var(--radius-full)] shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.4)]"
               >
                 {bulkInsert.isPending ? 'Inserindo no banco...' : 'Confirmar e Inserir no Banco de Dados'}
               </Button>
             </Card>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
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
