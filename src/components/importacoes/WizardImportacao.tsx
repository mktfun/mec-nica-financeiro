import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { UploadCloud, CheckCircle2, X, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import * as XLSX from 'xlsx';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { extractNumber } from '@/lib/parsers/numberUtils';
import { parseOFXFile } from '@/lib/parsers/ofxParser';
import { useBulkInsertTransactions } from '@/hooks/useTransactions';
import { supabase } from '@/lib/supabase';

interface WizardImportacaoProps {
  category: string;
  onCancel: () => void;
  onSuccess: () => void;
}

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

  return { mapping, updateMapping, setMapping };
}

export function WizardImportacao({ category, onCancel, onSuccess }: WizardImportacaoProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [unmappedStores, setUnmappedStores] = useState<string[]>([]);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping, setMapping } = useStoreMapping();
  const { mutateAsync: insertTxs } = useBulkInsertTransactions();

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const isOfx = category === 'OFX';
      const txsToInsert = extractedItems.map(item => {
        let store_id = mapping[item.storeName];
        if (store_id === 'GLOBAL') store_id = null;
        
        return {
          store_id,
          store_name: item.storeName,
          title: item.title || (isOfx ? 'Importação OFX' : 'Importação Maquininha'),
          subtitle: item.storeName,
          amount: item.amount || 0,
          type: item.type === 'in' || item.type === 'out' ? item.type : 'in',
          occurred_at: category === 'MAQUININHA' ? `${targetDate}T12:00:00Z` : (item.date || new Date().toISOString()),
          target_date: targetDate,
          icon_type: isOfx ? 'bank' : 'card',
          source: category === 'OFX' ? 'ofx' : (category === 'MAQUININHA' ? 'maquininha' : 'sistema')
        };
      });
      await insertTxs(txsToInsert);

      // Create import_logs entries for traceability in UI
      const storesSet = Array.from(new Set(txsToInsert.map(tx => tx.store_id)));
      const logsToInsert = storesSet.map(storeId => {
        const txsForStore = txsToInsert.filter(tx => tx.store_id === storeId);
        const storeName = txsForStore[0].store_name;
        const totalIn = txsForStore.filter(t => t.type === 'in' || t.type === 'OFX' || !t.type).reduce((acc, t) => acc + t.amount, 0);
        const totalOut = txsForStore.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
        const totalAmt = totalIn - totalOut;
        // Usar um sufixo no store_name para ajudar a diferenciar visualmente
        const displayName = isOfx ? `[OFX] ${storeName}` : `[Maquininha] ${storeName}`;
        
        return {
          store_id: storeId,
          store_name: displayName,
          target_date: targetDate,
          total_os: isOfx ? 0 : totalAmt, // Hackzinho visual se necessário
          os_count: isOfx ? 1 : 1, // Impede que caia como "Lote Despesas" no filtro
          total_paid_all: totalAmt,
          receivables_count: 0
        };
      });

      if (logsToInsert.length > 0) {
         const { error: upsertErr } = await supabase.from('import_logs').upsert(logsToInsert, { onConflict: 'store_id,target_date' });
         if (upsertErr) console.warn("Erro ao registrar import log", upsertErr);
      }

      onSuccess();
    } catch(e: any) {
      console.error(e);
      alert('Erro ao confirmar importação: ' + (e.message || 'Falha no banco de dados.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getAcceptedFormats = (): Record<string, string[]> => {
    if (category === 'OFX') return { 'application/x-ofx': ['.ofx'], 'text/plain': ['.ofx'] };
    return {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    };
  };

  const getTitle = () => {
    switch (category) {
      case 'OFX': return 'Importar Extrato (OFX)';
      case 'MAQUININHA': return 'Importar Maquininha';
      case 'DESPESAS': return 'Importar Despesas';
      case 'JUROS': return 'Importar Juros Rede';
      case 'PATIO': return 'Importar Pátio / OS';
      default: return 'Importar';
    }
  };

  const processMaquininha = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, json.length); i++) {
      const row = json[i];
      // Adaptado para achar os cabeçalhos de maquininha
      if (row && (row.includes('CNPJ') || row.includes('NOME DO ESTABELECIMENTO') || row.includes('nome do estabelecimento') || row.includes('Estabelecimento'))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = json[headerRowIndex] || [];
    const statusIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'status da venda');
    const valueIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'valor da venda original');
    const estabIndex = headers.findIndex((h: string) => typeof h === 'string' && (h.toLowerCase().trim() === 'nome do estabelecimento' || h.toLowerCase().trim() === 'estabelecimento'));
    const cnpjIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'cnpj');

    const items = [];
    for (let i = headerRowIndex + 1; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length === 0) continue;
      
      const status = statusIndex !== -1 ? String(row[statusIndex] || '').toLowerCase() : 'aprovada';
      if (status === 'aprovada' || status === 'pago') {
        const val = extractNumber(row[valueIndex]);
        const estab = estabIndex !== -1 ? String(row[estabIndex] || 'DESCONHECIDO') : 'DESCONHECIDO';
        const cnpj = cnpjIndex !== -1 ? String(row[cnpjIndex] || '') : '';
        
        if (!isNaN(val) && val > 0) {
          items.push({ storeName: estab, cnpj, amount: val });
        }
      }
    }
    return items;
  };

  const processOFX = async (file: File) => {
    return await parseOFXFile(file);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setFiles(prev => [...prev, ...acceptedFiles]);
    setIsProcessing(true);
    
    try {
      let allItems: any[] = [];
      const results: any[] = [];

      for (const file of acceptedFiles) {
        if (category === 'MAQUININHA') {
          const items = await processMaquininha(file);
          const itemsWithFile = items.map(i => ({ ...i, fileName: file.name }));
          allItems.push(...itemsWithFile);
          results.push({ fileName: file.name, success: true, count: items.length });
        } else if (category === 'OFX') {
          const items = await processOFX(file);
          const itemsWithFile = items.map(i => ({ ...i, fileName: file.name }));
          allItems.push(...itemsWithFile);
          results.push({ fileName: file.name, success: true, count: items.length });
        } else {
          // Placeholder para outras lógicas (Pátio, etc)
          const guessStoreName = file.name.split('.')[0].toUpperCase();
          allItems.push({ storeName: guessStoreName, amount: 100 });
          results.push({ fileName: file.name, success: true, count: 1 });
        }
      }

      setImportResults(prev => [...prev, ...results]);
      setExtractedItems(allItems);

      // Auto-mapear
      const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      let currentMapping = { ...mapping };
      const aliases = Array.from(new Set(allItems.map(e => e.storeName)));
      
      aliases.forEach(alias => {
        if (!currentMapping[alias]) {
          const normalizedAlias = normalizeString(alias);
          const match = stores.find(s => normalizeString(s.name) === normalizedAlias);
          if (match) {
            currentMapping[alias] = match.id;
          }
        }
      });

      setMapping(currentMapping);
      const unmapped = aliases.filter(alias => !currentMapping[alias]);
      
      setIsProcessing(false);
      
      if (unmapped.length > 0) {
        setUnmappedStores(unmapped);
        setStep(2);
      } else if (allItems.length > 0) {
        setStep(3);
      }
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      alert('Erro ao processar arquivo.');
    }
  }, [mapping, stores, setMapping, category]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedFormats()
  });

  const totalEntradas = extractedItems.filter(i => i.type === 'in' || i.type === 'OFX' || !i.type).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalSaidas = extractedItems.filter(i => i.type === 'out').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalValue = totalEntradas - totalSaidas;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">{getTitle()}</h2>
          <p className="text-sm text-[var(--text-secondary)]">Siga os passos para processar seus arquivos.</p>
        </div>
      </div>

      <div className="flex items-center mb-8 space-x-4 max-w-2xl mx-auto">
        <StepIndicator current={step} step={1} title="Upload" />
        <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
        <StepIndicator current={step} step={2} title="Mapeamento" />
        <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
        <StepIndicator current={step} step={3} title="Revisão" />
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
            <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-full mb-4 shadow-xl border border-white/5">
              <UploadCloud size={40} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-center">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste os arquivos'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
              Suporta múltiplos arquivos.
            </p>
          </div>
          
          {isProcessing && (
            <div className="mt-8 flex justify-center">
               <div className="flex items-center gap-3 animate-pulse text-[var(--text-secondary)]">
                 <LoadingSpinner size="sm" /> 
                 <span>Processando...</span>
               </div>
            </div>
          )}
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h3 className="font-display text-xl font-semibold mb-1">Mapeamento Inteligente</h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  Identificamos {unmappedStores.length} entidades nos arquivos que precisam ser vinculadas ao sistema.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {unmappedStores.map((storeName) => {
                const fileSource = extractedItems.find(e => e.storeName === storeName)?.fileName;
                return (
                <div key={storeName} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileType2 size={16} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Identificado no Arquivo</span>
                    </div>
                    <span className="font-mono text-lg font-semibold bg-white/5 px-2 py-0.5 rounded text-[var(--text-primary)]">{storeName}</span>
                    {fileSource && <div className="text-[11px] text-[var(--text-tertiary)] mt-1.5 font-mono truncate max-w-[200px]" title={fileSource}>Origem: {fileSource}</div>}
                  </div>
                  
                  <LinkIcon className="text-[var(--color-primary)]/50 shrink-0" size={24} />
                  
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-1 block">Vincular a Loja</label>
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
                      <option value="GLOBAL" className="text-[var(--color-accent-teal)] font-semibold">Independente (Geral)</option>
                      {stores.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} {s.is_matriz ? '(Master)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )})}
            </div>

            <div className="mt-8 flex justify-end">
              <Button 
                onClick={() => setStep(3)}
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

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           <Card className="p-8 border-[var(--color-primary)]/30 relative overflow-hidden">
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
             
             <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-3">
               <CheckCircle2 className="text-[var(--color-accent-teal)]" size={28} />
               Resumo Pronto para Importação
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                 <p className="text-sm text-[var(--color-success)] mb-1">Entradas (+)</p>
                 <p className="text-2xl font-display font-bold text-[var(--color-success)]">
                   <AnimatedNumber value={totalEntradas} format="currency" />
                 </p>
               </div>
               <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/20">
                 <p className="text-sm text-[var(--color-accent-danger)] mb-1">Saídas (-)</p>
                 <p className="text-2xl font-display font-bold text-[var(--color-accent-danger)]">
                   <AnimatedNumber value={totalSaidas} format="currency" />
                 </p>
               </div>
               <div className="p-4 rounded-[var(--radius-md)] bg-white/5 border border-white/10">
                 <p className="text-sm text-[var(--text-tertiary)] mb-1">Itens Identificados</p>
                 <p className="text-2xl font-display font-bold text-white">{extractedItems.length} itens</p>
               </div>
             </div>

             <div className="mb-8 p-4 bg-[var(--bg-surface-elevated)] border border-white/10 rounded-xl">
               <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Data de Competência</label>
               <input 
                 type="date" 
                 value={targetDate} 
                 onChange={e => setTargetDate(e.target.value)} 
                 className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
               />
               <p className="text-xs text-[var(--text-tertiary)] mt-2">Esta data será usada para agrupar o lote de importação. Se for Maquininha, também será a data das transações.</p>
             </div>

             <Button 
               onClick={handleConfirm}
               disabled={isProcessing}
               className="w-full py-6 text-lg font-semibold rounded-[var(--radius-full)] shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.4)]"
             >
               {isProcessing ? 'Processando...' : 'Confirmar Importação'}
             </Button>
           </Card>
        </motion.div>
      )}
    </div>
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
