import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertCircle, Sparkles, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { parseMarcoZeroPlanilha, MarcoZeroExtraction } from '@/lib/parsers/marcoZeroParser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { useStores } from '@/hooks/useStores';

export function MarcoZeroWizard({ onComplete, onCancel }: { onComplete: () => void, onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<MarcoZeroExtraction | null>(null);
  const [targetStoreId, setTargetStoreId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { data: stores = [] } = useStores();

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
          toast.success(`Planilha processada! ${extracted.osPendentes.length} OSs pendentes encontradas.`);
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
    if (!data || !targetStoreId) {
      toast.error("Selecione uma loja para vincular o Marco Zero.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Inserir OSs no estoque_os_pendente
      if (data.osPendentes.length > 0) {
        const payload = data.osPendentes.map(os => ({
          store_id: targetStoreId,
          numero_os: os.numero_os,
          data_os: os.data_os,
          valor_os: os.valor_os,
          status: 'PENDENTE'
        }));

        const { error: osError } = await supabase
          .from('estoque_os_pendente')
          .insert(payload);

        if (osError) throw new Error("Erro ao salvar OSs: " + osError.message);
      }

      // 2. Injetar o Caixa Anterior (previous_balance) na reconciliations de D-1 (ontem)
      // Para simplificar, o Marco Zero criará ou atualizará o fechamento de "ontem" da loja escolhida.
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const targetDateStr = yesterday.toISOString().split('T')[0];

      // Pegar reconciliations de ontem (se existir)
      const { data: recData } = await supabase
        .from('reconciliations')
        .select('id')
        .eq('store_id', targetStoreId)
        .eq('date', targetDateStr)
        .maybeSingle();

      if (recData) {
        await supabase
          .from('reconciliations')
          .update({
            previous_balance: data.caixaAnterior,
            manual_dinheiro_mp: data.dinheiroMp,
            manual_a_receber: data.aReceber
          })
          .eq('id', recData.id);
      } else {
        await supabase
          .from('reconciliations')
          .insert({
            store_id: targetStoreId,
            date: targetDateStr,
            previous_balance: data.caixaAnterior,
            manual_dinheiro_mp: data.dinheiroMp,
            manual_a_receber: data.aReceber,
            status: 'completed',
            is_closed: true
          });
      }

      toast.success("Marco Zero implantado com sucesso!");
      onComplete();
    } catch (error: any) {
      toast.error(error.message);
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
          <p className="text-sm text-[var(--text-secondary)]">Importe a planilha legada para inicializar o estoque de OSs pendentes e o Caixa Anterior do sistema.</p>
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
              Formato .xlsx com as abas "SALDO" e "OS". O sistema extrairá o passivo e o caixa anterior.
            </p>
            {isProcessing && (
              <div className="mt-4 text-[var(--color-primary)] flex items-center gap-2">
                <LoadingSpinner size="sm" /> Analisando abas...
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </Card>
      )}

      {data && (
        <Card className="p-6 md:p-8 space-y-6 bg-[var(--bg-canvas)] border border-[var(--color-primary)]/30">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Planilha Processada
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Loja Alvo:</label>
              <select 
                value={targetStoreId} 
                onChange={(e) => setTargetStoreId(e.target.value)}
                className="bg-[var(--bg-surface-elevated)] border border-[var(--color-primary)] text-[var(--text-primary)] rounded p-2 text-sm focus:outline-none"
              >
                <option value="">Selecione a Loja...</option>
                {stores.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider mb-1">Dinheiro MP</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]"><AnimatedNumber value={data.dinheiroMp} format="currency" /></p>
            </div>
            <div className="p-4 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider mb-1">A Receber</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]"><AnimatedNumber value={data.aReceber} format="currency" /></p>
            </div>
            <div className="p-4 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider mb-1">Negativo</p>
              <p className="text-lg font-semibold text-red-400"><AnimatedNumber value={data.negativo} format="currency" /></p>
            </div>
            <div className="p-4 bg-[var(--color-primary)]/10 rounded-xl border border-[var(--color-primary)]/30">
              <p className="text-[10px] text-[var(--color-primary)] uppercase font-bold tracking-wider mb-1">Caixa Anterior</p>
              <p className="text-lg font-semibold text-[var(--color-primary)]"><AnimatedNumber value={data.caixaAnterior} format="currency" /></p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
              <span>Passivo (Estoque de OSs Pendentes)</span>
              <span className="bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] px-2 py-1 rounded text-xs">
                {data.osPendentes.length} OSs encontradas
              </span>
            </h4>
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {data.osPendentes.map((os, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 hover:bg-[var(--bg-canvas)] rounded border border-transparent hover:border-[var(--border-subtle)] transition-colors">
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">OS {os.numero_os}</span>
                  <div className="flex gap-4">
                    <span className="text-xs text-[var(--text-tertiary)]">{new Date(os.data_os).toLocaleDateString('pt-BR')}</span>
                    <span className="text-xs font-semibold text-sky-400">
                      {os.valor_os.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={() => { setFile(null); setData(null); }}>
              Refazer Upload
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !targetStoreId} className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 px-8 py-6 text-base shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]">
              {isSaving ? <LoadingSpinner size="sm" text="Implantando..." /> : <Sparkles className="mr-2" />} Implantar Marco Zero
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
