import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, UploadCloud, CheckCircle2, Database, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { parseMarcoZeroPlanilha, MarcoZeroResult } from '@/lib/parsers/marcoZeroParser';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { useStores } from '@/hooks/useStores';

export function MarcoZeroWizard({ onComplete, onCancel }: { onComplete: () => void, onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<MarcoZeroResult | null>(null);
  const [storeMapping, setStoreMapping] = useState<Record<string, string>>({});
  const [targetDate, setTargetDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
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

    setIsSaving(true);
    try {
      // 1. Inserir daily_snapshots (Snapshot Global do Marco Zero)
      const { error: snapError } = await supabase.from('daily_snapshots').upsert({
        date: targetDate,
        caixa_atual: data.global.caixaAnterior,
        dinheiro_mp: data.global.dinheiroMp,
        total_recebiveis: data.global.aReceber,
        saldo_bancario: data.global.negativo,
        faturamento: 0,
        total_patio: 0,
        notes: 'Implantação de Saldo Inicial (Marco Zero)'
      }, { onConflict: 'date' });

      if (snapError) throw new Error("Erro ao salvar snapshot global: " + snapError.message);

      // 2. Inserir OSs e Saldo por Loja
      for (const ext of data.stores) {
        const storeId = storeMapping[ext.storeName];
        if (!storeId) continue;

        // OSs Pendentes
        if (ext.osPendentes.length > 0) {
          const payload = ext.osPendentes.map(os => ({
            store_id: storeId,
            numero_os: os.numero_os,
            data_os: os.data_os,
            valor_os: os.valor_os,
            status: 'PENDENTE'
          }));

          const { error: osError } = await supabase
            .from('estoque_os_pendente')
            .insert(payload);

          if (osError) throw new Error(`Erro ao salvar OSs da loja ${ext.storeName}: ` + osError.message);
        }

        // Caso a loja tenha um "saldo_loja" extraído (ex: Gaveta/Caixa local), 
        // inserimos retroativamente na conciliação da loja para aquele dia para constar no histórico.
        if (ext.saldoLoja > 0) {
          const { data: recData } = await supabase
            .from('reconciliations')
            .select('id')
            .eq('store_id', storeId)
            .eq('date', targetDate)
            .maybeSingle();

          if (recData) {
             await supabase.from('reconciliations').update({ daily_cash: ext.saldoLoja }).eq('id', recData.id);
          } else {
             await supabase.from('reconciliations').insert({
               store_id: storeId,
               date: targetDate,
               daily_cash: ext.saldoLoja,
               status: 'completed',
               is_closed: true
             });
          }
        }
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

      {data && (
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
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Métricas Globais da Rede</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Caixa Anterior</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    <AnimatedNumber value={data.global.caixaAnterior} prefix="R$ " />
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
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Negativo (Itaú)</p>
                  <p className="text-lg font-semibold text-rose-500">
                    <AnimatedNumber value={data.global.negativo} prefix="R$ " />
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
