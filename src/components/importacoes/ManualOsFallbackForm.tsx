import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';

export interface ManualOsEntry {
  store_id: string;
  numero_os: string;
  valor_total: number;
  valor_pago: number;
}

interface ManualOsFallbackFormProps {
  onSubmit: (entries: ManualOsEntry[]) => void;
  onCancel: () => void;
}

export function ManualOsFallbackForm({ onSubmit, onCancel }: ManualOsFallbackFormProps) {
  const { data: stores = [] } = useStores();
  const [entries, setEntries] = useState<ManualOsEntry[]>([
    { store_id: '', numero_os: '', valor_total: 0, valor_pago: 0 }
  ]);

  const handleAddRow = () => {
    setEntries([...entries, { store_id: '', numero_os: '', valor_total: 0, valor_pago: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ManualOsEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = () => {
    // Filtrar vazios
    const validEntries = entries.filter(e => e.store_id && e.numero_os);
    onSubmit(validEntries);
  };

  return (
    <div className="bg-[var(--bg-canvas)] border border-[var(--color-danger)] rounded-2xl p-6 shadow-xl w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-subtle)] pb-4">
        <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Preenchimento Manual de OS (Pátio Pendente)</h2>
          <p className="text-sm text-[var(--text-secondary)]">O bot falhou ao extrair as OS pendentes. Por favor, preencha manualmente o resumo das OS do Mês Passado/Hoje.</p>
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-end gap-3 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">Loja</label>
              <select
                value={entry.store_id}
                onChange={(e) => handleChange(idx, 'store_id', e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-lg p-2.5 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)]"
              >
                <option value="">Selecione...</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">Num. OS</label>
              <input
                type="text"
                placeholder="Ex: 12345"
                value={entry.numero_os}
                onChange={(e) => handleChange(idx, 'numero_os', e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-lg p-2.5 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)]"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">Valor Total (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={entry.valor_total || ''}
                onChange={(e) => handleChange(idx, 'valor_total', parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-lg p-2.5 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)]"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">Valor Pago (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={entry.valor_pago || ''}
                onChange={(e) => handleChange(idx, 'valor_pago', parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-lg p-2.5 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)]"
              />
            </div>

            <button 
              onClick={() => handleRemoveRow(idx)}
              className="p-3 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-lg transition-colors border border-transparent"
              title="Remover linha"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between">
        <Button variant="secondary" onClick={handleAddRow} className="gap-2">
          <Plus size={16} /> Adicionar Linha
        </Button>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar (Pular)
        </Button>
        <Button onClick={handleSubmit} className="gap-2 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white border-none shadow-lg shadow-[var(--color-success)]/20">
          <CheckCircle2 size={18} /> Consolidar e Salvar
        </Button>
      </div>
    </div>
  );
}
