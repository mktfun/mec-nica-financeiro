import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CheckCircle2, ArrowRight, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface MatchManualOsProps {
  storeId: string;
  ofxTransactions: any[];
  onComplete: (matchedPairs: { ofxTx: any, osId: string }[]) => void;
  onSkip: () => void;
}

export function MatchManualOsPendente({ storeId, ofxTransactions, onComplete, onSkip }: MatchManualOsProps) {
  const [osPendentes, setOsPendentes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfx, setSelectedOfx] = useState<any | null>(null);
  const [selectedOs, setSelectedOs] = useState<any | null>(null);
  const [matches, setMatches] = useState<{ ofxTx: any, os: any }[]>([]);

  useEffect(() => {
    async function loadPendentes() {
      if (!storeId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('estoque_os_pendente')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'PENDENTE')
        .order('data_os', { ascending: false });

      if (error) {
        toast.error("Erro ao carregar OSs pendentes.");
      } else {
        setOsPendentes(data || []);
      }
      setIsLoading(false);
    }
    loadPendentes();
  }, [storeId]);

  const handleMatch = () => {
    if (!selectedOfx || !selectedOs) return;
    
    setMatches(prev => [...prev, { ofxTx: selectedOfx, os: selectedOs }]);
    setSelectedOfx(null);
    setSelectedOs(null);
  };

  const handleConfirm = () => {
    onComplete(matches.map(m => ({ ofxTx: m.ofxTx, osId: m.os.id })));
  };

  // Filtrar itens já vinculados
  const availableOfx = ofxTransactions.filter(tx => !matches.some(m => m.ofxTx.id === tx.id));
  const availableOs = osPendentes.filter(os => !matches.some(m => m.os.id === os.id));

  return (
    <Card className="p-8 space-y-6 bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <LinkIcon className="text-[var(--color-primary)]" /> Match Manual (Matadora de Robôs)
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">Vincule entradas do OFX com as OSs passivas que estão pendentes na loja.</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-[var(--color-accent-teal)]">{matches.length} vínculos prontos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        {/* Coluna OFX (Esquerda) */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sky-400">Transações OFX (Entradas)</h4>
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl h-96 overflow-y-auto p-2 custom-scrollbar space-y-2">
            {availableOfx.filter(t => t.type === 'in' || t.amount > 0).map((tx, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedOfx(tx)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedOfx === tx ? 'border-sky-500 bg-sky-500/10' : 'border-transparent hover:border-sky-500/50 bg-[var(--bg-canvas)]'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs font-mono text-[var(--text-secondary)]">{tx.date}</div>
                  <div className="font-bold text-sky-400">
                    {Number(tx.amount || tx.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="text-sm text-[var(--text-primary)] mt-1 truncate">{tx.description || tx.memo || 'Depósito/PIX'}</div>
              </div>
            ))}
            {availableOfx.filter(t => t.type === 'in' || t.amount > 0).length === 0 && (
              <div className="text-center p-4 text-[var(--text-tertiary)] text-sm">Nenhuma entrada OFX disponível.</div>
            )}
          </div>
        </div>

        {/* Botão de Match Central */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-col items-center">
          <Button 
            onClick={handleMatch}
            disabled={!selectedOfx || !selectedOs}
            className="rounded-full w-12 h-12 p-0 bg-[var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] disabled:opacity-50"
          >
            <ArrowRight size={20} />
          </Button>
        </div>

        {/* Coluna OS Passivo (Direita) */}
        <div className="space-y-4">
          <h4 className="font-semibold text-[var(--color-accent-teal)] flex justify-between items-center">
            Estoque de OS Pendentes
            {isLoading && <LoadingSpinner size="xs" />}
          </h4>
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl h-96 overflow-y-auto p-2 custom-scrollbar space-y-2">
            {availableOs.map((os) => (
              <div 
                key={os.id}
                onClick={() => setSelectedOs(os)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedOs === os ? 'border-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10' : 'border-transparent hover:border-[var(--color-accent-teal)]/50 bg-[var(--bg-canvas)]'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs font-mono font-bold text-[var(--text-secondary)]">OS {os.numero_os}</div>
                  <div className="font-bold text-[var(--color-accent-teal)]">
                    {Number(os.valor_os).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-1">{new Date(os.data_os).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
            {!isLoading && availableOs.length === 0 && (
              <div className="text-center p-4 text-[var(--text-tertiary)] text-sm">Nenhuma OS pendente no histórico.</div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between">
        <Button variant="ghost" onClick={onSkip}>Pular Match Manual</Button>
        <Button onClick={handleConfirm} className="bg-[var(--color-primary)] text-white">
          <CheckCircle2 size={18} className="mr-2" />
          Avançar para Resumo ({matches.length} baixas)
        </Button>
      </div>
    </Card>
  );
}
