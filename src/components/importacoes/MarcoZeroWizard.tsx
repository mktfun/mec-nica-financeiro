import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, UploadCloud, CheckCircle2, Database, Calendar, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { parseMarcoZeroPlanilha, MarcoZeroResult } from '@/lib/parsers/marcoZeroParser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/lib/utils';

export function MarcoZeroWizard({ onComplete, onCancel }: { onComplete: () => void, onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<MarcoZeroResult | null>(null);
  const [storeMapping, setStoreMapping] = useState<Record<string, string>>({});
  const [targetDate, setTargetDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [visibleError, setVisibleError] = useState<string | null>(null);
  
  const { data: stores = [] } = useStores();

  // Set default target date to yesterday
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setTargetDate(yesterday.toISOString().split('T')[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setIsProcessing(true);
        try {
          const extracted = await parseMarcoZeroPlanilha(acceptedFiles[0]);
          setData(extracted);
          
          // Auto-mapear
          const initialMapping: Record<string, string> = {};
          extracted.stores.forEach(ext => {
             const lowerExt = ext.storeName.toLowerCase();
             const matchedStore = stores.find(s => {
               const sName = (s.name || '').toLowerCase();
               return sName === lowerExt || sName.includes(lowerExt) || lowerExt.includes(sName);
             });
             initialMapping[ext.storeName] = matchedStore ? matchedStore.id : ''; 
          });
          setStoreMapping(initialMapping);

          const totalOs = extracted.stores.reduce((acc, curr) => acc + curr.osPendentes.length, 0);
          toast.success(`Planilha processada! ${extracted.stores.length} lojas e ${totalOs} OSs encontradas.`);
        } catch (error: any) {
          toast.error(error.message);
          setFile(null);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  });

  const handleSave = async () => {
    if (!data) return;
    if (!targetDate) {
      toast.error("Por favor, selecione a Data de Implantação.");
      return;
    }

    const hasAnyMapping = Object.values(storeMapping).some(val => val !== '');
    if (!hasAnyMapping && data.stores.length > 0) {
      toast.error("Vincule pelo menos uma aba a uma loja para implantar o Marco Zero.");
      return;
    }

    const payloadStores = data.stores
      .map(ext => ({
        store_id: storeMapping[ext.storeName] || null,
        store_name: ext.storeName,
        saldoLoja: ext.saldoLoja,
        osPendentes: ext.osPendentes
      }))
      .filter(s => !!s.store_id);

    setVisibleError(null);
    setIsSaving(true);
    try {
      // Chamada transacional atômica para a RPC do Supabase
      const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('process_marco_zero_import', {
        p_target_date: targetDate,
        p_global: data.global,
        p_stores: payloadStores
      });

      if (rpcErr) {
        console.error("Supabase RPC Error:", rpcErr);
        throw new Error("Erro na RPC do Marco Zero: " + (rpcErr.message || JSON.stringify(rpcErr)));
      }
      if (rpcRes?.status === 'error') {
        console.error("RPC Internal Error:", rpcRes);
        throw new Error("Erro no processamento: " + (rpcRes.error_message || JSON.stringify(rpcRes)));
      }

      setExecutionResult(rpcRes);
      toast.success("Marco Zero implantado com sucesso!");
    } catch (error: any) {
      console.error("Caught error in handleSave:", error);
      const msg = error?.message || "Erro desconhecido ao salvar. Verifique o console.";
      toast.error(msg);
      setVisibleError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Database className="text-[var(--color-primary)]" /> Implantação de Saldo (Marco Zero)
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">Importe a planilha legada para inicializar o estoque de OSs pendentes e o Saldo Global do sistema.</p>
        </div>
      </div>

      {!data && (
        <Card className="p-8">
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
            <div className="bg-[var(--color-primary)]/20 p-4 rounded-full shadow-xl border border-[var(--border-subtle)] text-[var(--color-primary)] mb-6">
              <UploadCloud size={32} />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-center">
              {isDragActive ? 'Solte a Planilha aqui' : 'Arraste a Planilha Antiga de Conciliação'}
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm text-center max-w-sm">
              O sistema agrupará os saldos em formato Global e as OSs por Loja.
            </p>
            {isProcessing && (
              <div className="mt-4 text-[var(--color-primary)] flex items-center gap-2">
                <LoadingSpinner size="sm" /> Processando arquivo...
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </Card>
      )}

      {executionResult && (
        <Card className="p-8 border border-emerald-500/30 bg-emerald-500/5 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Marco Zero Implantado com Sucesso!</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Data Base: <span className="font-mono text-emerald-400 font-bold">{targetDate}</span> • {executionResult.processed_stores_count} Filiais Processadas • {executionResult.processed_os_count} Ordens de Serviço
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-[var(--text-tertiary)] block mb-1">Caixa Atual</span>
              <span className="font-bold text-lg text-emerald-400 font-mono">
                R$ {formatCurrency(executionResult.global_summary?.caixa_atual || 0).replace('R$', '').trim()}
              </span>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-[var(--text-tertiary)] block mb-1">Faturamento Atual</span>
              <span className="font-bold text-lg text-white font-mono">
                R$ {formatCurrency(executionResult.global_summary?.faturamento_atual || 0).replace('R$', '').trim()}
              </span>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-[var(--text-tertiary)] block mb-1">Fluxo de Caixa</span>
              <span className="font-bold text-lg text-white font-mono">
                R$ {formatCurrency(executionResult.global_summary?.fluxo_caixa || 0).replace('R$', '').trim()}
              </span>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-[var(--text-tertiary)] block mb-1">Diferença</span>
              <span className="font-bold text-lg text-emerald-400 font-mono">
                R$ {formatCurrency(executionResult.global_summary?.diferenca || 0).replace('R$', '').trim()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(executionResult, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `logs_marco_zero_${targetDate}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Logs de execução baixados com sucesso!");
              }}
              className="flex items-center gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Download size={16} />
              Baixar Logs de Execução (.JSON)
            </Button>

            <Button onClick={onComplete} className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
              Concluir e Ir para o Sistema
            </Button>
          </div>
        </Card>
      )}

      {data && !executionResult && (
        <div className="space-y-6">
          <Card className="p-6 md:p-8 bg-[var(--bg-canvas)] border border-[var(--color-primary)]/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" /> Planilha Processada
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Revise os dados abaixo e defina a data da implantação retroativa.</p>
              </div>
              <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center gap-3 w-full md:w-auto shadow-sm">
                <Calendar className="text-[var(--color-primary)] shrink-0" size={20} />
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Data da Implantação (Marco Zero)</label>
                  <input 
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="bg-transparent border-none p-0 text-sm font-semibold text-[var(--text-primary)] focus:ring-0 focus:outline-none"
                    title="A data retroativa para este saldo"
                  />
                </div>
              </div>
            </div>

            {/* Resumo Global */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Saldos Principais</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Caixa Anterior</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.caixaAnterior} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Caixa Atual</p>
                  <p className="text-lg font-semibold text-emerald-500">
                    <AnimatedNumber value={data.global.caixaAtual} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Dinheiro MP</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.dinheiroMp} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">A Receber</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.aReceber} prefix="R$ " />
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Fluxo e Faturamento</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Faturamento Atual</p>
                  <p className="text-md font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.faturamentoAtual} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Faturamento Ant.</p>
                  <p className="text-md font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.faturamentoAnterior} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Fluxo Caixa</p>
                  <p className="text-md font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.fluxoCaixa} prefix="R$ " />
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Despesas e Ajustes</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Saldo Itaú (Neg)</p>
                  <p className="text-md font-semibold text-rose-500">
                    <AnimatedNumber value={data.global.negativo} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Contas</p>
                  <p className="text-md font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.valorDasContas} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Prolabore D.</p>
                  <p className="text-md font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.prolaboreDaniel} prefix="R$ " />
                  </p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Diferença</p>
                  <p className={`text-md font-semibold ${data.global.diferenca !== 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    <AnimatedNumber value={data.global.diferenca} prefix="R$ " />
                  </p>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Filiais Encontradas ({data.stores.length})</h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {data.stores.map((ext, index) => (
                <div key={index} className="bg-[var(--bg-surface-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-display font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      Loja: <span className="text-[var(--color-primary)]">{ext.storeName}</span>
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {ext.osPendentes.length} OSs pendentes • Saldo Gaveta: R$ {ext.saldoLoja.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col min-w-[250px]">
                    <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">Vincular Loja no Sistema:</label>
                    <select 
                      value={storeMapping[ext.storeName] || ''}
                      onChange={(e) => setStoreMapping(prev => ({ ...prev, [ext.storeName]: e.target.value }))}
                      className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:outline-none w-full"
                    >
                      <option value="">Não importar esta loja</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {visibleError && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-500 font-semibold mb-4 text-sm">
              <span className="block mb-1 font-bold">Erro ao Implantar:</span>
              {visibleError}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={() => setData(null)} disabled={isSaving}>
              Voltar
            </Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={!targetDate}>
              Implantar Base Global
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
