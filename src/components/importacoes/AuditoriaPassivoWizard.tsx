import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ShieldAlert, Check, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AuditoriaPassivoWizardProps {
  storeId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function AuditoriaPassivoWizard({ storeId, onComplete, onCancel }: AuditoriaPassivoWizardProps) {
  const [osPendentes, setOsPendentes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Guardamos as ações tomadas pelo usuário localmente antes de salvar
  // key: os.id, value: 'PAGA' | 'CANCELADA' | 'PENDENTE'
  const [actions, setActions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPassivo();
  }, [storeId]);

  const fetchPassivo = async () => {
    setIsLoading(true);
    try {
      // Filtrar OSs que ainda estão pendentes
      const { data, error } = await supabase
        .from('estoque_os_pendente')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'PENDENTE')
        .order('data_os', { ascending: true });

      if (error) throw error;
      setOsPendentes(data || []);
      
      // Inicializar ações todas como PENDENTE (Manter)
      const initial: Record<string, string> = {};
      data?.forEach(os => {
        initial[os.id] = 'PENDENTE';
      });
      setActions(initial);

    } catch (err: any) {
      toast.error('Erro ao buscar passivo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (id: string, action: string) => {
    setActions(prev => ({ ...prev, [id]: action }));
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      // Separar o que precisa ser alterado
      const toUpdate = Object.entries(actions).filter(([id, action]) => action !== 'PENDENTE');

      if (toUpdate.length > 0) {
        // Como o Supabase JS client v2 não suporta bulk update facilmente com diferentes valores por linha sem uma RPC,
        // E como são poucas atualizações manuais, fazemos um loop de promises.
        const promises = toUpdate.map(([id, action]) => {
          return supabase
            .from('estoque_os_pendente')
            .update({
              status: action,
              data_baixa: action === 'PAGA' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        });

        const results = await Promise.all(promises);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          throw new Error("Falha ao atualizar algumas OSs.");
        }
      }

      toast.success("Auditoria concluída com sucesso!");
      onComplete();

    } catch (err: any) {
      toast.error("Erro ao salvar auditoria: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-[var(--text-secondary)]">Buscando OSs legadas...</p>
      </Card>
    );
  }

  if (osPendentes.length === 0) {
    return (
      <Card className="p-8 text-center space-y-6">
        <div className="mx-auto bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <Check size={32} />
        </div>
        <h3 className="text-xl font-bold">Nenhum Passivo Pendente!</h3>
        <p className="text-[var(--text-secondary)]">Sua loja não possui nenhuma OS em aberto de dias anteriores.</p>
        <Button onClick={onComplete} className="bg-[var(--color-primary)] w-full max-w-sm">
          Prosseguir com Importação <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-4 mb-2">
        <div className="bg-amber-500/20 p-3 rounded-xl text-amber-500 mt-1">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">Auditoria do Passivo</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Antes de conciliar o dia atual, verifique se alguma destas OSs antigas foi paga em dinheiro, Pix externo ou foi cancelada.
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start text-amber-500 text-sm">
        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
        <p>
          Se a OS foi paga via maquininha ou banco (caixa atual), <strong>MANTENHA COMO PENDENTE</strong>. Ela será conciliada (Match) automaticamente no próximo passo junto com o extrato.
        </p>
      </div>

      <Card className="p-6 bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
          <h3 className="font-semibold">{osPendentes.length} OSs no Estoque</h3>
          <span className="text-xs text-[var(--text-tertiary)]">Ação Necessária</span>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {osPendentes.map((os) => {
            const currentAction = actions[os.id];
            
            return (
              <div 
                key={os.id} 
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors
                  ${currentAction === 'PAGA' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                    currentAction === 'CANCELADA' ? 'bg-red-500/10 border-red-500/30' : 
                    'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50'}
                `}
              >
                <div>
                  <h4 className="font-mono font-bold text-[var(--text-primary)]">OS {os.numero_os}</h4>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-[var(--text-tertiary)]">{new Date(os.data_os).toLocaleDateString('pt-BR')}</span>
                    <span className="text-xs font-semibold text-sky-400">
                      {os.valor_os.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
                  <button 
                    onClick={() => handleAction(os.id, 'PENDENTE')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${currentAction === 'PENDENTE' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'}`}
                  >
                    Manter Pendente
                  </button>
                  <button 
                    onClick={() => handleAction(os.id, 'PAGA')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${currentAction === 'PAGA' ? 'bg-emerald-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'}`}
                  >
                    Dar Baixa
                  </button>
                  <button 
                    onClick={() => handleAction(os.id, 'CANCELADA')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${currentAction === 'CANCELADA' ? 'bg-red-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'}`}
                  >
                    Cancelar OS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>Voltar</Button>
        <Button 
          onClick={handleConfirm}
          disabled={isSaving}
          className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 px-8"
        >
          {isSaving ? <LoadingSpinner size="sm" /> : "Confirmar Auditoria e Prosseguir"}
        </Button>
      </div>
    </div>
  );
}
