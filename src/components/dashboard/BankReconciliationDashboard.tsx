import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, AlertTriangle, FileText, Save, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaveBankReconciliation, useSaveMachineTotal } from '@/hooks/useConciliacao';
import { parseOFX, matchTransactions, OFXTransaction, MatchResult, SystemTransaction } from '@/lib/ofxParser';
import { parseJurosRede } from '@/lib/parsers/jurosRedeParser';
import * as XLSX from 'xlsx';
import { UniversalDropzone, ClassifiedFile, FileTypeCategory } from '@/components/ui/UniversalDropzone';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function BankReconciliationDashboard({ 
  selectedDate, 
  stores, 
  systemTransactions, 
  onSuccess 
}: { 
  selectedDate: string; 
  stores: any[]; 
  systemTransactions: SystemTransaction[]; 
  onSuccess: () => void; 
}) {
  const [classifiedFiles, setClassifiedFiles] = useState<ClassifiedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeMatchResults, setStoreMatchResults] = useState<Record<string, MatchResult>>({});
  const [juros, setJuros] = useState<any[]>([]);
  const [machineTotals, setMachineTotals] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState(false);

  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  
  const [unmappedFiles, setUnmappedFiles] = useState<ClassifiedFile[]>([]);
  const [fileStoreMappings, setFileStoreMappings] = useState<Record<string, string>>({});

  const { mutateAsync: saveBankReconciliation } = useSaveBankReconciliation();
  const { mutateAsync: saveMachineTotal } = useSaveMachineTotal();

  const handleFilesAccepted = (files: ClassifiedFile[]) => {
    setClassifiedFiles(prev => [...prev, ...files]);
  };

  const handleProcessClick = () => {
    if (classifiedFiles.length === 0) return;
    
    const unmapped: ClassifiedFile[] = [];
    const mappings: Record<string, string> = {};
    
    classifiedFiles.forEach(cf => {
      if (cf.category === 'JUROS' || cf.category === 'UNKNOWN') return; // Juros doesn't need upfront mapping, it searches internally
      
      const fileName = cf.file.name.toUpperCase();
      let matchedStoreId: string | null = null;
      
      const storeByName = stores.find(s => fileName.includes(s.name.toUpperCase()));
      if (storeByName) {
        matchedStoreId = storeByName.id;
      } else {
        const savedMapping = localStorage.getItem('file_store_mapping');
        if (savedMapping) {
          const parsed = JSON.parse(savedMapping);
          if (parsed[fileName]) {
            matchedStoreId = parsed[fileName];
          }
        }
      }

      if (matchedStoreId) {
        mappings[cf.file.name] = matchedStoreId;
      } else {
        unmapped.push(cf);
      }
    });
    
    setFileStoreMappings(mappings);
    
    if (unmapped.length > 0) {
      setUnmappedFiles(unmapped);
      setMappingModalOpen(true);
    } else {
      processFiles(mappings);
    }
  };

  const confirmMapping = () => {
    if (!selectedStoreId || unmappedFiles.length === 0) return;
    
    const currentFile = unmappedFiles[0];
    const fileName = currentFile.file.name.toUpperCase();
    const savedMapping = localStorage.getItem('file_store_mapping');
    const parsed = savedMapping ? JSON.parse(savedMapping) : {};
    parsed[fileName] = selectedStoreId;
    localStorage.setItem('file_store_mapping', JSON.stringify(parsed));
    
    const newMappings = { ...fileStoreMappings, [currentFile.file.name]: selectedStoreId };
    setFileStoreMappings(newMappings);
    
    const remainingUnmapped = unmappedFiles.slice(1);
    setUnmappedFiles(remainingUnmapped);
    setSelectedStoreId('');
    
    if (remainingUnmapped.length === 0) {
      setMappingModalOpen(false);
      processFiles(newMappings);
    }
  };

  const processFiles = async (mappings: Record<string, string>) => {
    setIsProcessing(true);
    try {
      const results: Record<string, MatchResult> = {};
      const storeOfxMap: Record<string, OFXTransaction[]> = {};
      let allJuros: any[] = [];
      const mTotals: Record<string, number> = {};

      for (const cf of classifiedFiles) {
        const file = cf.file;
        const storeId = mappings[file.name];

        if (cf.category === 'OFX' && storeId) {
          const ofxText = await file.text();
          const ofxTransactions = parseOFX(ofxText);
          if (!storeOfxMap[storeId]) storeOfxMap[storeId] = [];
          storeOfxMap[storeId].push(...ofxTransactions);
        } else if (cf.category === 'JUROS') {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const expenses = parseJurosRede(workbook);
          allJuros = [...allJuros, ...expenses];
        } else if (cf.category === 'MAQUININHA' && storeId) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(10, json.length); i++) {
            const row = json[i];
            if (row && row.includes('CNPJ') && row.includes('nome do estabelecimento')) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = json[headerRowIndex] || [];
          const statusIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'status da venda');
          const valueIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'valor da venda original');

          let total = 0;
          if (statusIndex !== -1 && valueIndex !== -1) {
            for (let i = headerRowIndex + 1; i < json.length; i++) {
              const row = json[i];
              if (!row || row.length === 0) continue;
              const status = String(row[statusIndex] || '').toLowerCase();
              if (status === 'aprovada' || status === 'pago') {
                const val = parseFloat(String(row[valueIndex]).replace(',', '.'));
                if (!isNaN(val)) total += val;
              }
            }
          }
          if (!mTotals[storeId]) mTotals[storeId] = 0;
          mTotals[storeId] += total;
        }
      }
      
      for (const storeId of Object.keys(storeOfxMap)) {
         const storeSysTxs = systemTransactions.filter(t => t.store_id === storeId);
         const matched = matchTransactions(storeOfxMap[storeId], storeSysTxs, 10);
         results[storeId] = matched;
      }
      
      setStoreMatchResults(results);
      setJuros(allJuros);
      setMachineTotals(mTotals);
    } catch (e) {
      console.error(e);
      alert('Erro ao processar arquivos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const storeIds = new Set([...Object.keys(storeMatchResults), ...Object.keys(machineTotals)]);
      
      for (const storeId of storeIds) {
        const store = stores.find(s => s.id === storeId);
        if (!store) continue;

        // Maquininha Save
        if (machineTotals[storeId]) {
          await saveMachineTotal({
            storeId: store.id,
            machineTotal: machineTotals[storeId],
            date: selectedDate
          });
        }

        // Bank Reconciliation Save (if OFX was present)
        if (storeMatchResults[storeId]) {
          const storeJuros = juros.filter(j => j.storeName.toUpperCase().includes(store.name.toUpperCase()) || store.name.toUpperCase().includes(j.storeName.toUpperCase()));
          const fees = storeJuros.reduce((sum, j) => sum + j.amount, 0);

          const storeSysTxs = systemTransactions.filter(t => t.store_id === store.id);
          const sysTotal = storeSysTxs.reduce((sum, t) => sum + t.amount, 0);
          
          const matchResult = storeMatchResults[storeId];
          const ofxTotal = matchResult.matched.reduce((sum, m) => sum + m.ofx.amount, 0);
          
          const divergence = sysTotal - ofxTotal;

          await saveBankReconciliation({
            storeId: store.id,
            date: selectedDate,
            bankDivergence: divergence,
            machineFees: fees,
            ofxImported: true
          });
        }
      }

      setIsSaved(true);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar conciliação bancária massiva.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSaved) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-accent-teal)]/20 border border-[var(--color-accent-teal)] p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_0_50px_-10px_var(--color-accent-teal)] mt-8"
      >
        <CheckCircle2 size={64} className="text-[var(--color-accent-teal)] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Conciliação Massiva Concluída!</h2>
        <p className="text-[var(--text-secondary)]">Todos os dados de Extratos, Maquininhas e Custos foram integrados com sucesso no fluxo financeiro.</p>
      </motion.div>
    );
  }

  const hasResults = Object.keys(storeMatchResults).length > 0 || Object.keys(machineTotals).length > 0 || juros.length > 0;

  return (
    <Card className="p-6 mt-8 border-t-4 border-t-[var(--color-primary)] bg-[var(--bg-surface-elevated)] backdrop-blur-xl shadow-2xl transition-all">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-[var(--color-primary)]" size={24} />
        <h2 className="text-xl font-display font-bold text-white">Central de Fechamento Massivo</h2>
      </div>

      {!hasResults ? (
        <div className="mb-6">
          <UniversalDropzone onFilesAccepted={handleFilesAccepted} isProcessing={isProcessing} />
          {classifiedFiles.length > 0 && (
             <div className="mt-4 bg-black/30 p-4 rounded-xl border border-white/10">
               <h4 className="text-sm font-semibold mb-2">Arquivos na fila:</h4>
               <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                 {classifiedFiles.map((cf, i) => (
                   <li key={i} className="flex items-center justify-between">
                     <span>{cf.file.name}</span>
                     <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{cf.category}</span>
                   </li>
                 ))}
               </ul>
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Maquininhas Importadas</p>
              <p className="text-xl font-bold text-orange-400">
                <AnimatedNumber value={Object.values(machineTotals).reduce((a,b) => a+b, 0)} format="currency" />
              </p>
            </div>
            <div className="bg-[var(--color-accent-teal)]/10 p-4 rounded-xl border border-[var(--color-accent-teal)]/30">
              <p className="text-xs text-[var(--color-accent-teal)] uppercase tracking-wider mb-1">Match OFX Sucesso</p>
              <p className="text-xl font-bold text-[var(--color-accent-teal)]">
                {Object.values(storeMatchResults).reduce((sum, mr) => sum + mr.matched.length, 0)} transações
              </p>
            </div>
            <div className="bg-[var(--color-accent-danger)]/10 p-4 rounded-xl border border-[var(--color-accent-danger)]/30">
              <p className="text-xs text-[var(--color-accent-danger)] uppercase tracking-wider mb-1">Incongruências OFX</p>
              <p className="text-xl font-bold text-[var(--color-accent-danger)]">
                {Object.values(storeMatchResults).reduce((sum, mr) => sum + mr.unmatchedOfx.length + mr.unmatchedSystem.length, 0)} alertas
              </p>
            </div>
          </div>

          {/* Renderizar Incongruencias Globalmente */}
          {Object.values(storeMatchResults).some(mr => mr.unmatchedOfx.length > 0 || mr.unmatchedSystem.length > 0) && (
             <div className="space-y-4 mt-6">
               <h3 className="font-semibold text-[var(--color-accent-danger)] flex items-center gap-2">
                 <AlertTriangle size={18} /> Incongruências / Anomalias Bancárias
               </h3>
               <div className="bg-[var(--color-accent-danger)]/5 rounded-xl border border-[var(--color-accent-danger)]/20 max-h-64 overflow-y-auto p-2 space-y-2">
                 {Object.entries(storeMatchResults).map(([storeId, mr]) => (
                   <React.Fragment key={storeId}>
                     {mr.unmatchedOfx.map((o, i) => (
                       <div key={`ofx-${storeId}-${i}`} className="bg-black/40 p-3 rounded-lg flex justify-between items-center text-sm border-l-2 border-[var(--color-accent-danger)]">
                         <div>
                           <p className="font-medium text-white">Extrato: {o.memo}</p>
                           <p className="text-xs text-[var(--color-accent-danger)]">Não consta no sistema ({stores.find(s=>s.id===storeId)?.name})</p>
                         </div>
                         <span className="font-bold"><AnimatedNumber value={o.amount} format="currency" /></span>
                       </div>
                     ))}
                     {mr.unmatchedSystem.map((s, i) => (
                       <div key={`sys-${storeId}-${i}`} className="bg-black/40 p-3 rounded-lg flex justify-between items-center text-sm border-l-2 border-orange-500">
                         <div>
                           <p className="font-medium text-white">Sistema: {s.description || 'Venda'}</p>
                           <p className="text-xs text-orange-500">Não consta no extrato ({stores.find(s=>s.id===storeId)?.name})</p>
                         </div>
                         <span className="font-bold"><AnimatedNumber value={s.amount} format="currency" /></span>
                       </div>
                     ))}
                   </React.Fragment>
                 ))}
               </div>
             </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-4">
        {!hasResults ? (
          <button 
            onClick={handleProcessClick}
            disabled={classifiedFiles.length === 0 || isProcessing}
            className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_-5px_var(--color-primary)] disabled:opacity-50"
          >
            {isProcessing ? <LoadingSpinner size="sm" /> : null}
            {isProcessing ? 'Processando...' : 'Processar Arquivos'}
          </button>
        ) : (
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="bg-[var(--color-accent-teal)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_-5px_var(--color-accent-teal)] disabled:opacity-50"
          >
            {isProcessing ? <LoadingSpinner size="sm" /> : <Save size={20} />}
            {isProcessing ? 'Salvando...' : 'Salvar Conciliação Massiva'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {mappingModalOpen && unmappedFiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-6 rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4 text-[var(--color-primary)]">
                <Store size={24} />
                <h3 className="text-xl font-bold text-white">Loja Desconhecida no Arquivo</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                O arquivo <strong className="text-white">{unmappedFiles[0].file.name}</strong> não foi mapeado automaticamente para nenhuma loja. Por favor, selecione a qual loja este extrato pertence.
              </p>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Selecione a Loja</label>
                <select 
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Selecione...</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMappingModalOpen(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Cancelar</button>
                <button onClick={confirmMapping} disabled={!selectedStoreId} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white font-medium rounded-lg disabled:opacity-50">
                  Confirmar e Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
