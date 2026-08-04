import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Sparkles, Save, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/bootstrap')({
  component: BootstrapPage,
});

function BootstrapPage() {
  const { data: stores = [], isLoading: isLoadingStores } = useStores();
  
  // Default to yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [targetDate, setTargetDate] = useState(yesterday.toISOString().split('T')[0]);
  
  const [formData, setFormData] = useState<Record<string, { saldo: string; faturamento: string; contas: string; patio: string }>>({
    'st-01': { saldo: '23652', faturamento: '8083', contas: '3850', patio: '8851.60' }, // Dom Pedro
    'st-02': { saldo: '49751', faturamento: '0', contas: '3850', patio: '13000' }, // Jabaquara
    'st-03': { saldo: '28864', faturamento: '8349.32', contas: '3850', patio: '2716.90' }, // Jorge Beretta
    'st-04': { saldo: '10606', faturamento: '4389', contas: '3850', patio: '1968.30' }, // Kennedy
    '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': { saldo: '15974', faturamento: '2094', contas: '3850', patio: '0' }, // Maua
    'st-05': { saldo: '28747', faturamento: '2347', contas: '3850', patio: '0' }, // Piraporinha
    'st-06': { saldo: '25883', faturamento: '350', contas: '3850', patio: '0' }, // Planalto
    'st-09': { saldo: '19385', faturamento: '1640', contas: '3850', patio: '1400' }, // Rei do Módulo
    'st-07': { saldo: '19401', faturamento: '10867', contas: '3850', patio: '1945.10' }, // Rudge Ramos
    'st-08': { saldo: '14244', faturamento: '1962', contas: '3850', patio: '347.80' }, // Santo André
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (storeId: string, field: 'saldo' | 'faturamento' | 'contas' | 'patio', value: string) => {
    setFormData(prev => ({
      ...prev,
      [storeId]: {
        ...(prev[storeId] || { saldo: '', faturamento: '', contas: '', patio: '' }),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const promises = [];
      let totalSaldo = 0;
      let totalFaturamento = 0;
      let totalContas = 0;
      let totalPatio = 0;
      
      for (const store of stores) {
        const data = formData[store.id];
        if (!data) continue;

        const saldo = Number(data.saldo || 0);
        const faturamento = Number(data.faturamento || 0);
        const contas = Number(data.contas || 0);
        const patio = Number(data.patio || 0);

        totalSaldo += saldo;
        totalFaturamento += faturamento;
        totalContas += contas;
        totalPatio += patio;

        if (saldo === 0 && faturamento === 0 && contas === 0 && patio === 0) continue;

        // Upsert Reconciliations (para Saldo Anterior e Pátio Anterior)
        if (saldo > 0 || patio > 0) {
          promises.push(
            supabase.from('reconciliations').upsert({
              store_id: store.id,
              date: targetDate,
              status: 'validated',
              bank_total: saldo,
              na_loja_os: patio,
              // Campos obrigatórios dummies para satisfazer constraints se necessário
              reconciled_total: saldo,
              card_total: 0,
              pix_total: 0,
              os_total: 0,
              total_diff: 0,
              missing_os: [],
              matched_os: [],
              unmatched_receipts: []
            }, { onConflict: 'store_id,date' })
          );
        }
      }

      // Upsert Daily Snapshots Global (Agregado da Rede)
      if (totalFaturamento > 0 || totalContas > 0 || totalSaldo > 0 || totalPatio > 0) {
        promises.push(
          supabase.from('daily_snapshots').upsert({
            date: targetDate,
            caixa_atual: totalSaldo + totalPatio,
            faturamento_outros_valor: totalFaturamento,
            contas_a_pagar: totalContas,
            saldo_bancario: totalSaldo,
            total_patio: totalPatio,
            dinheiro_mp: 0,
            a_receber_manual: 0,
            provisao: 0
          }, { onConflict: 'date' })
        );
      }

      await Promise.all(promises);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Erro no Bootstrap:', err);
      alert('Falha ao salvar Carga Inicial.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingStores) {
    return <div className="p-8 flex justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--color-primary)] transition-colors mb-2">
            <ArrowLeft size={16} /> Voltar ao Início
          </Link>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="text-[var(--color-primary)]" />
            Bootstrap: Dia Zero
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Injeção de carga inicial para que o sistema consiga calcular métricas do dia seguinte sem bugs.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={isSaving}
          className="gap-2 font-semibold"
        >
          {isSaving ? <LoadingSpinner size="sm" /> : <Save size={18} />}
          {isSaving ? 'Salvando...' : 'Salvar Carga Inicial'}
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[var(--color-accent-teal)]/10 border border-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] flex items-center gap-2">
          <Sparkles size={18} />
          <strong>Sucesso!</strong> Dados do Dia Zero injetados. O Dashboard do dia seguinte já terá lastro para calcular "% vs ANTERIOR" e Fluxo de Caixa.
        </div>
      )}

      <Card className="p-6 border border-[var(--color-primary)]/20 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.05)]">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border-subtle)]">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Data do Dia Zero (Ex: 30/07 se o sistema ligar dia 31/07)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Loja</th>
                <th className="pb-3 font-semibold">Saldo em Conta</th>
                <th className="pb-3 font-semibold">Pátio Pendente</th>
                <th className="pb-3 font-semibold">Faturamento Total</th>
                <th className="pb-3 font-semibold">Contas Pagas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {stores.map(store => (
                <tr key={store.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                  <td className="py-3">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{store.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData[store.id]?.saldo || ''}
                        onChange={(e) => handleInputChange(store.id, 'saldo', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-teal)]"
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData[store.id]?.patio || ''}
                        onChange={(e) => handleInputChange(store.id, 'patio', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData[store.id]?.faturamento || ''}
                        onChange={(e) => handleInputChange(store.id, 'faturamento', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData[store.id]?.contas || ''}
                        onChange={(e) => handleInputChange(store.id, 'contas', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-warning)]"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
