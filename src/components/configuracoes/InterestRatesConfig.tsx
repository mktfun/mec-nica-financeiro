import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useInterestRates, useAddInterestRate, useDeleteInterestRate } from '@/hooks/useInterestRates';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function InterestRatesConfig() {
  const { data: rates = [], isLoading } = useInterestRates();
  const addRate = useAddInterestRate();
  const deleteRate = useDeleteInterestRate();

  const [paymentMethod, setPaymentMethod] = useState('');
  const [ratePercentage, setRatePercentage] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod || !ratePercentage) return;
    
    await addRate.mutateAsync({
      payment_method: paymentMethod,
      rate_percentage: parseFloat(ratePercentage),
    });
    
    setPaymentMethod('');
    setRatePercentage('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta taxa?')) {
      await deleteRate.mutateAsync(id);
    }
  };

  return (
    <Card variant="glass" className="p-6">
      <h3 className="font-display font-semibold text-lg mb-4">Políticas de Taxas</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Cadastre as taxas cobradas pela maquininha para cada método de pagamento. Elas serão usadas no cálculo do Valor Estimado com Juros.
      </p>

      <form onSubmit={handleAdd} className="flex gap-3 mb-6 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Método de Pagamento</label>
          <input
            type="text"
            placeholder="Ex: Cartão de Crédito"
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Taxa (%)</label>
          <input
            type="number"
            step="0.01"
            placeholder="Ex: 2.5"
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            value={ratePercentage}
            onChange={(e) => setRatePercentage(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" disabled={addRate.isPending}>
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <LoadingSpinner size="sm" text="" />
        </div>
      ) : rates.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhuma taxa cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {rates.map(rate => (
            <div key={rate.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <div>
                <p className="font-medium text-[var(--text-primary)] text-sm">{rate.payment_method}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Desconto de {rate.rate_percentage}%</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30" onClick={() => handleDelete(rate.id)} disabled={deleteRate.isPending}>
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
