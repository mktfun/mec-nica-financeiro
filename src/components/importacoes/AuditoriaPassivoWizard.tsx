import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ShieldAlert, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface AuditoriaPassivoWizardProps {
  storeId: string;
  cloudOsData?: any[];
  onComplete: () => void;
  onCancel: () => void;
}

type OsStatus = 'PENDENTE' | 'ABERTA' | 'FINALIZADA';

interface UnifiedOs {
  id: string;
  source: 'patio' | 'estoque';
  osNumber: string;
  date: string;
  totalValue: number;
  paidValue: number;
  remainingValue: number;
  currentStatus: string;
  // Estado local
  actionStatus: OsStatus;
  actionPaidValue: number;
}

export function AuditoriaPassivoWizard({ storeId, cloudOsData = [], onComplete, onCancel }: AuditoriaPassivoWizardProps) {
  const [osPendentes, setOsPendentes] = useState<UnifiedOs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPassivo();
  }, [storeId]);

  const fetchPassivo = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar estoque legada (Marco Zero)
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque_os_pendente')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'PENDENTE')
        .order('data_os', { ascending: true });

      if (estoqueError) throw estoqueError;

      // 2. Buscar patio_os (Mês anterior)
      const { data: patioData, error: patioError } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId)
        .in('status', ['em_aberto', 'pago_parcial'])
        .order('opened_at', { ascending: true });

      if (patioError) throw patioError;

      // 3. Montar mapa das OSs que vieram no cloudOsData de HOJE
      const currentOsSet = new Set(cloudOsData.map(os => String(os.osNumber || os.numero_os)));

      // 4. Mapear e unificar
      const unified: UnifiedOs[] = [];

      estoqueData?.forEach(os => {
        // Se a OS antiga apareceu no arquivo hoje, ignora! (Ela será atualizada automaticamente no merge final)
        if (currentOsSet.has(String(os.numero_os))) return;

        unified.push({
          id: os.id,
          source: 'estoque',
          osNumber: String(os.numero_os),
          date: os.data_os,
          totalValue: Number(os.valor_os) || 0,
          paidValue: 0,
          remainingValue: Number(os.valor_os) || 0,
          currentStatus: os.status,
          actionStatus: 'PENDENTE',
          actionPaidValue: 0
        });
      });

      patioData?.forEach(os => {
        // Se a OS antiga apareceu no arquivo hoje, ignora!
        if (currentOsSet.has(String(os.os_number))) return;

        const total = Number(os.total_value) || 0;
        const paid = Number(os.paid_value) || 0;
        const remaining = total - paid;

        unified.push({
          id: os.id,
          source: 'patio',
          osNumber: String(os.os_number),
          date: os.opened_at,
          totalValue: total,
          paidValue: paid,
          remainingValue: remaining,
          currentStatus: os.status,
          actionStatus: 'PENDENTE',
          actionPaidValue: paid
        });
      });

      // Ordenar por data
      unified.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setOsPendentes(unified);
    } catch (err: any) {
      toast.error('Erro ao buscar passivo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionStatusChange = (id: string, newStatus: OsStatus) => {
    setOsPendentes(prev => prev.map(os => {
      if (os.id === id) {
        // Se mudar para PENDENTE ou ABERTA, e for nova ação
        if (newStatus === 'PENDENTE' || newStatus === 'ABERTA') {
          return { ...os, actionStatus: newStatus };
        }
        // Se mudar para FINALIZADA, assumimos pagamento total por default (pode ser alterado)
        if (newStatus === 'FINALIZADA') {
          return { ...os, actionStatus: newStatus, actionPaidValue: os.totalValue };
        }
      }
      return os;
    }));
  };

  const handlePaidValueChange = (id: string, value: number) => {
    setOsPendentes(prev => prev.map(os => {
      if (os.id === id) {
        return { ...os, actionPaidValue: value };
      }
      return os;
    }));
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const toUpdate = osPendentes.filter(os => os.actionStatus !== 'PENDENTE');

      if (toUpdate.length > 0) {
        const promises = toUpdate.map(os => {
          const now = new Date().toISOString();
          
          if (os.source === 'estoque') {
            return supabase
              .from('estoque_os_pendente')
              .update({
                status: os.actionStatus === 'FINALIZADA' ? 'PAGA' : 'ABERTA', // mapeando pro status legado, mas mantendo a lógica se precisar
                valor_os: os.actionPaidValue, // para estoque_os_pendente o valor_os seria reduzido? não, mas vamos registrar
                data_baixa: os.actionStatus === 'FINALIZADA' ? now : null,
                updated_at: now
              })
              .eq('id', os.id);
          } else {
            const isFullyPaid = os.actionPaidValue >= os.totalValue;
            const newStatus = os.actionStatus === 'FINALIZADA' ? 'pago' : 
                             (os.actionPaidValue > 0 ? 'pago_parcial' : 'em_aberto');
                             
            return supabase
              .from('patio_os')
              .update({
                status: newStatus,
                paid_value: os.actionPaidValue,
                closed_at: os.actionStatus === 'FINALIZADA' ? now : null,
                updated_at: now
              })
              .eq('id', os.id);
          }
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
        <p className="text-[var(--text-secondary)]">Analisando cruzamento de OSs órfãs...</p>
      </Card>
    );
  }

  if (osPendentes.length === 0) {
    return (
      <Card className="p-8 text-center space-y-6">
        <div className="mx-auto bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <Check size={32} />
        </div>
        <h3 className="text-xl font-bold">Nenhuma OS Órfã Pendente!</h3>
        <p className="text-[var(--text-secondary)]">Todas as OSs pendentes vieram no arquivo atual ou sua loja não possui passivo.</p>
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
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">Auditoria de Virada de Mês e Órfãs</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            As {osPendentes.length} OSs abaixo são de meses anteriores e <strong>NÃO VIERAM</strong> no arquivo Excel importado agora. 
            Atualize o status manualmente se alguma delas já foi paga.
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start text-amber-500 text-sm">
        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
        <p>
          Se a OS não foi paga, basta deixá-la como <strong>"Não Alterar"</strong> e ela continuará rolando no saldo devedor da loja.
        </p>
      </div>

      <Card className="p-6 bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
          <h3 className="font-semibold">{osPendentes.length} OSs Pendentes Passadas</h3>
          <span className="text-xs text-[var(--text-tertiary)]">Ação Necessária</span>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {osPendentes.map((os) => {
            const isEditing = os.actionStatus !== 'PENDENTE';
            
            return (
              <div 
                key={os.id} 
                className={`p-4 rounded-xl border flex flex-col gap-4 transition-colors
                  ${os.actionStatus === 'FINALIZADA' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                    os.actionStatus === 'ABERTA' ? 'bg-indigo-500/10 border-indigo-500/30' : 
                    'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50'}
                `}
              >
                {/* Cabecalho da OS */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono font-bold text-[var(--text-primary)]">OS {os.osNumber}</h4>
                      {os.source === 'estoque' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          Marco Zero
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-[var(--text-tertiary)]">{new Date(os.date).toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        Total: {os.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={os.actionStatus}
                      onChange={(e) => handleActionStatusChange(os.id, e.target.value as OsStatus)}
                      className={`text-sm rounded-lg border px-3 py-1.5 outline-none font-medium
                        ${os.actionStatus === 'FINALIZADA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                          os.actionStatus === 'ABERTA' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' :
                          'bg-zinc-800 border-zinc-700 text-zinc-300'}
                      `}
                    >
                      <option value="PENDENTE">Não Alterar</option>
                      <option value="ABERTA">Ainda Aberta (Atualizar Parcial)</option>
                      <option value="FINALIZADA">Finalizada (Paga Total)</option>
                    </select>
                  </div>
                </div>

                {/* Área de edição expandida */}
                {isEditing && (
                  <div className="pt-3 border-t border-[var(--border-subtle)]/50 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Valor Pago Acumulado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={os.actionPaidValue || ''}
                          onChange={(e) => handlePaidValueChange(os.id, parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 pl-8 pr-3 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Ainda a Receber</label>
                      <div className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-1.5 text-sm text-zinc-300 flex items-center justify-between">
                        <span>R$</span>
                        <span className="font-mono">
                          {Math.max(0, os.totalValue - os.actionPaidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
