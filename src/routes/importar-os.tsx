import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import { FileUp, AlertTriangle, ArrowRight, UploadCloud, FileType2, Database, Link as LinkIcon, CheckCircle2, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { useProcessImportedData } from '@/hooks/useImportProcessor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/importar-os')({
  component: ImportarOsWizard,
});

function useOsStoreMapping() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  useEffect(() => {
    const saved = localStorage.getItem('@mecanica/os-store-mappings');
    if (saved) {
      try { setMapping(JSON.parse(saved)); } catch (e) {}
    }
  }, []);
  const updateMapping = (alias: string, storeId: string) => {
    setMapping(prev => {
      const next = { ...prev, [alias]: storeId };
      localStorage.setItem('@mecanica/os-store-mappings', JSON.stringify(next));
      return next;
    });
  };
  return { mapping, updateMapping };
}

function StepIndicator({ current, step, title }: { current: number; step: number; title: string }) {
  const isActive = current >= step;
  return (
    <div className={`flex items-center gap-2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 text-white'}`}>
        {current > step ? <CheckCircle2 size={12} /> : step}
      </div>
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}

function ImportarOsWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<OsImportResult[]>([]);
  const [unmappedStores, setUnmappedStores] = useState<string[]>([]);
  
  const { data: stores = [] } = useStores();
  const { mapping, updateMapping } = useOsStoreMapping();
  const processData = useProcessImportedData();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setFiles(prev => [...prev, ...acceptedFiles]);
    setIsProcessing(true);
    
    const results = await processOsFiles(acceptedFiles);
    setImportResults(prev => [...prev, ...results]);
    
    // Identificar nomes de arquivos como lojas virtuais
    const aliases = Array.from(new Set(results.filter(r => r.success).map(r => r.fileName)));
    const unmapped = aliases.filter(alias => !mapping[alias]);
    
    setIsProcessing(false);
    
    if (unmapped.length > 0) {
      setUnmappedStores(unmapped);
      setStep(2);
    } else if (results.some(r => r.success)) {
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

  const handleCompleteMapping = () => setStep(3);

  const handleConfirmImport = async () => {
    try {
      setIsProcessing(true);
      for (const res of importResults.filter(r => r.success)) {
        const storeId = mapping[res.fileName];
        if (!storeId) throw new Error(`Arquivo ${res.fileName} não está mapeado!`);
        const storeName = stores.find(s => s.id === storeId)?.name || 'Desconhecida';
        
        await processData.mutateAsync({
          storeId,
          storeName,
          osArray: res.osArray,
          receivablesArray: res.receivablesArray
        });
      }
      setIsProcessing(false);
      alert('Relatórios de Receitas importados com sucesso!');
      navigate({ to: '/importacoes' });
    } catch (err: any) {
      setIsProcessing(false);
      alert('Erro ao importar: ' + err.message);
    }
  };

  const totalOs = importResults.reduce((acc, curr) => acc + (curr.osCount || 0), 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="mb-10">
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <FileUp size={28} className="text-[var(--color-primary)]" />
            Importar Relatórios de Receitas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Faça upload das planilhas de OS e Recebíveis em massa
          </p>

          <div className="flex items-center mt-8 space-x-4">
            <StepIndicator current={step} step={1} title="Upload" />
            <div className={`h-px flex-1 ${step > 1 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
            <StepIndicator current={step} step={2} title="Mapeamento" />
            <div className={`h-px flex-1 ${step > 2 ? 'bg-[var(--color-primary)]' : 'bg-white/10'}`} />
            <StepIndicator current={step} step={3} title="Revisão" />
          </div>
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
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste planilhas de Receitas (OS)'}
              </h3>
              <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
                Suporta múltiplos arquivos simultâneos.
              </p>
            </div>
            
            {isProcessing && (
              <div className="mt-8 flex justify-center">
                 <div className="flex items-center gap-3 animate-pulse text-[var(--text-secondary)]">
                   <LoadingSpinner size="sm" text="" /> 
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
                      {r.success ? `${r.osCount} OS identificadas` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="font-display text-xl font-semibold mb-1">Mapeamento de Lojas</h3>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Identificamos {unmappedStores.length} arquivos não mapeados.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {unmappedStores.map((storeName) => (
                  <div key={storeName} className="flex items-center gap-6 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileType2 size={16} className="text-[var(--text-tertiary)]" />
                        <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Arquivo</span>
                      </div>
                      <span className="font-mono text-lg font-semibold bg-white/5 px-2 py-0.5 rounded text-[var(--text-primary)]">{storeName}</span>
                    </div>
                    
                    <LinkIcon className="text-[var(--color-primary)]/50 shrink-0" size={24} />
                    
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-1 block">Ligar à Loja (Sistema)</label>
                      <select 
                        className={`w-full bg-[var(--bg-surface-elevated)] border rounded-[var(--radius-sm)] p-3 text-sm focus:outline-none transition-all duration-300
                          ${mapping[storeName] 
                            ? 'border-[var(--color-accent-teal)]/50 text-white' 
                            : 'border-[var(--color-accent-warning)]/50 text-[var(--text-secondary)] animate-pulse'
                          }
                        `}
                        value={mapping[storeName] || ''}
                        onChange={(e) => updateMapping(storeName, e.target.value)}
                      >
                        <option value="" disabled>Selecione uma loja...</option>
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
                  Continuar <ArrowRight size={20} className="ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="font-display font-semibold text-2xl mb-2">Tudo Pronto para Importar</h3>
              <p className="text-[var(--text-secondary)] mb-8">
                Serão processados {importResults.filter(r => r.success).length} arquivos contendo um total de <strong>{totalOs} Ordens de Serviço</strong>.
              </p>
              
              <div className="flex justify-center gap-4">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isProcessing}>
                  Voltar e Adicionar Mais
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                  className="bg-[var(--color-accent-teal)] text-white hover:bg-[var(--color-accent-teal)]/90 px-8 py-6 rounded-full text-lg shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <LoadingSpinner size="sm" text="Lançando no banco..." /> : 'Confirmar e Importar'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
