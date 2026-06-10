import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, AlertTriangle, Store, FileText, Upload, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaveBankReconciliation } from '@/hooks/useConciliacao';
import { parseOFX, matchTransactions, OFXTransaction, MatchResult, SystemTransaction } from '@/lib/ofxParser';
import { parseJurosRede } from '@/lib/parsers/jurosRedeParser';
import * as XLSX from 'xlsx';

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
  const [ofxFile, setOfxFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [juros, setJuros] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [ofxStoreId, setOfxStoreId] = useState<string | null>(null);

  const { mutateAsync: saveBankReconciliation } = useSaveBankReconciliation();

  const handleProcessClick = () => {
    if (!ofxFile) return;
    
    // Tentar auto-mapear pelo nome do arquivo
    const fileName = ofxFile.name.toUpperCase();
    let matchedStoreId: string | null = null;
    
    // 1. Tentar por nome da loja
    const storeByName = stores.find(s => fileName.includes(s.name.toUpperCase()));
    if (storeByName) {
      matchedStoreId = storeByName.id;
    } else {
      // 2. Tentar por mapping salvo
      const savedMapping = localStorage.getItem('ofx_filename_mapping');
      if (savedMapping) {
        const parsed = JSON.parse(savedMapping);
        if (parsed[fileName]) {
          matchedStoreId = parsed[fileName];
        }
      }
    }
    
    if (matchedStoreId) {
      setOfxStoreId(matchedStoreId);
      processFiles(matchedStoreId);
    } else {
      setMappingModalOpen(true);
    }
  };

  const confirmMapping = () => {
    if (!selectedStoreId || !ofxFile) return;
    
    const fileName = ofxFile.name.toUpperCase();
    const savedMapping = localStorage.getItem('ofx_filename_mapping');
    const parsed = savedMapping ? JSON.parse(savedMapping) : {};
    parsed[fileName] = selectedStoreId;
    localStorage.setItem('ofx_filename_mapping', JSON.stringify(parsed));
    
    setOfxStoreId(selectedStoreId);
    setMappingModalOpen(false);
    processFiles(selectedStoreId);
  };

  const processFiles = async (storeId: string) => {
    if (!ofxFile) return;
    setIsProcessing(true);
    try {
      // 1. OFX
      const ofxText = await ofxFile.text();
      const ofxTransactions = parseOFX(ofxText);
      
      const storeSysTxs = systemTransactions.filter(t => t.store_id === storeId);
      const matched = matchTransactions(ofxTransactions, storeSysTxs, 10);
      setMatchResult(matched);

      // 2. XLSX Juros
      if (xlsxFile) {
        const buffer = await xlsxFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const expenses = parseJurosRede(workbook);
        setJuros(expenses);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao processar arquivos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!matchResult || !ofxStoreId) return;
    setIsProcessing(true);
    try {
      const store = stores.find(s => s.id === ofxStoreId);
      if (!store) throw new Error('Loja não encontrada');

      const storeJuros = juros.filter(j => j.storeName.toUpperCase().includes(store.name.toUpperCase()) || store.name.toUpperCase().includes(j.storeName.toUpperCase()));
      const fees = storeJuros.reduce((sum, j) => sum + j.amount, 0);

      const storeSysTxs = systemTransactions.filter(t => t.store_id === store.id);
      const sysTotal = storeSysTxs.reduce((sum, t) => sum + t.amount, 0);
      
      const storeMatched = matchResult.matched.filter(m => m.system.store_id === store.id);
      const ofxTotal = storeMatched.reduce((sum, m) => sum + m.ofx.amount, 0);
      
      const divergence = sysTotal - ofxTotal;

      await saveBankReconciliation({
        storeId: store.id,
        date: selectedDate,
        bankDivergence: divergence,
        machineFees: fees,
        ofxImported: true
      });

      setIsSaved(true);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar conciliação bancária.');
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
        <h2 className="text-2xl font-bold text-white mb-2">Conciliação Bancária Salva!</h2>
        <p className="text-[var(--text-secondary)]">Os dados de OFX e Custos foram integrados com sucesso no fluxo financeiro.</p>
      </motion.div>
    );
  }

  return (
    <Card className="p-6 mt-8 border-t-4 border-t-[var(--color-primary)] bg-[var(--bg-surface-elevated)] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-[var(--color-primary)]" size={24} />
        <h2 className="text-xl font-display font-bold text-white">Fechamento Bancário (OFX) e Custos (XLSX)</h2>
      </div>

      {!matchResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-primary)] transition-colors bg-black/20">
            <input type="file" accept=".ofx" id="ofx-upload" hidden onChange={e => setOfxFile(e.target.files?.[0] || null)} />
            <label htmlFor="ofx-upload" className="cursor-pointer flex flex-col items-center">
              <Upload size={32} className="text-[var(--text-tertiary)] mb-3" />
              <p className="font-semibold text-white mb-1">Extrato Bancário (.OFX)</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Arraste ou clique para selecionar</p>
              {ofxFile && <span className="text-[var(--color-accent-teal)] text-sm font-medium">{ofxFile.name}</span>}
            </label>
          </div>

          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-primary)] transition-colors bg-black/20">
            <input type="file" accept=".xlsx" id="xlsx-upload" hidden onChange={e => setXlsxFile(e.target.files?.[0] || null)} />
            <label htmlFor="xlsx-upload" className="cursor-pointer flex flex-col items-center">
              <Upload size={32} className="text-[var(--text-tertiary)] mb-3" />
              <p className="font-semibold text-white mb-1">Custos / Juros Rede (.XLSX)</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Opcional para cálculo de lucro</p>
              {xlsxFile && <span className="text-[var(--color-accent-teal)] text-sm font-medium">{xlsxFile.name}</span>}
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Total OFX Lido</p>
              <p className="text-xl font-bold"><AnimatedNumber value={matchResult.matched.reduce((s,m) => s + m.ofx.amount, 0) + matchResult.unmatchedOfx.reduce((s,o) => s + o.amount, 0)} format="currency" /></p>
            </div>
            <div className="bg-[var(--color-accent-teal)]/10 p-4 rounded-xl border border-[var(--color-accent-teal)]/30">
              <p className="text-xs text-[var(--color-accent-teal)] uppercase tracking-wider mb-1">Match Sucesso</p>
              <p className="text-xl font-bold text-[var(--color-accent-teal)]">{matchResult.matched.length} transações</p>
            </div>
            <div className="bg-[var(--color-accent-danger)]/10 p-4 rounded-xl border border-[var(--color-accent-danger)]/30">
              <p className="text-xs text-[var(--color-accent-danger)] uppercase tracking-wider mb-1">Incongruências</p>
              <p className="text-xl font-bold text-[var(--color-accent-danger)]">{matchResult.unmatchedOfx.length + matchResult.unmatchedSystem.length} alertas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-[var(--color-accent-teal)] flex items-center gap-2">
                <CheckCircle2 size={18} /> Transações Encontradas com Sucesso
              </h3>
              <div className="bg-black/40 rounded-xl border border-white/10 max-h-64 overflow-y-auto p-2 space-y-2">
                {matchResult.matched.map((m, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-lg flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-white">{m.system.description || m.ofx.memo}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{m.ofx.date.toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-[var(--color-accent-teal)]">
                      <AnimatedNumber value={m.ofx.amount} format="currency" />
                    </span>
                  </div>
                ))}
                {matchResult.matched.length === 0 && <p className="text-sm text-center text-white/50 p-4">Nenhum match encontrado</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-[var(--color-accent-danger)] flex items-center gap-2">
                <AlertTriangle size={18} /> Incongruências / Anomalias
              </h3>
              <div className="bg-[var(--color-accent-danger)]/5 rounded-xl border border-[var(--color-accent-danger)]/20 max-h-64 overflow-y-auto p-2 space-y-2">
                {matchResult.unmatchedOfx.map((o, i) => (
                  <div key={`ofx-${i}`} className="bg-black/40 p-3 rounded-lg flex justify-between items-center text-sm border-l-2 border-[var(--color-accent-danger)]">
                    <div>
                      <p className="font-medium text-white">Extrato: {o.memo}</p>
                      <p className="text-xs text-[var(--color-accent-danger)]">Não consta no sistema</p>
                    </div>
                    <span className="font-bold"><AnimatedNumber value={o.amount} format="currency" /></span>
                  </div>
                ))}
                {matchResult.unmatchedSystem.map((s, i) => (
                  <div key={`sys-${i}`} className="bg-black/40 p-3 rounded-lg flex justify-between items-center text-sm border-l-2 border-orange-500">
                    <div>
                      <p className="font-medium text-white">Sistema: {s.description || 'Venda'}</p>
                      <p className="text-xs text-orange-500">Não consta no extrato</p>
                    </div>
                    <span className="font-bold"><AnimatedNumber value={s.amount} format="currency" /></span>
                  </div>
                ))}
                {(matchResult.unmatchedOfx.length === 0 && matchResult.unmatchedSystem.length === 0) && 
                  <p className="text-sm text-center text-white/50 p-4">Nenhuma anomalia encontrada</p>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-4">
        {!matchResult ? (
          <button 
            onClick={handleProcessClick}
            disabled={!ofxFile || isProcessing}
            className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : 'Processar OFX e Custos'}
          </button>
        ) : (
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="bg-[var(--color-accent-teal)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_-5px_var(--color-accent-teal)] disabled:opacity-50"
          >
            <Save size={20} />
            {isProcessing ? 'Salvando...' : 'Salvar Conciliação'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {mappingModalOpen && ofxFile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-6 rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4 text-[var(--color-primary)]">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold text-white">Loja Desconhecida no Banco</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                O arquivo <strong className="text-white">{ofxFile.name}</strong> não foi mapeado automaticamente para nenhuma loja. Por favor, selecione a qual loja este extrato pertence.
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
                  Confirmar e Processar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
