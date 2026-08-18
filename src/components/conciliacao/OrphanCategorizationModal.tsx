import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, DollarSign, Ban, Landmark, AlertCircle } from 'lucide-react';

interface OrphanCategorizationModalProps {
  transactionId: string;
  transactionTitle: string;
  transactionAmount: number;
  transactionType: 'in' | 'out';
  onClose: () => void;
  onSuccess: (categoryId: string, justification: string, impactsRevenue?: boolean) => void;
  categorizeOrphan: (id: string, category: string, justification: string, impactsRevenue?: boolean) => Promise<{ success: boolean, error?: string }>;
}

const CATEGORIES = [
  { id: 'venda_sucata', label: 'Venda de Sucata', type: 'in', defaultImpact: true },
  { id: 'deposito_avulso', label: 'Depósito Avulso (Receita)', type: 'in', defaultImpact: true },
  { id: 'rendimento_aplicacao', label: 'Rendimento de Aplicação', type: 'in', defaultImpact: false },
  { id: 'ajuste_marco_zero', label: 'Ajuste Marco Zero / Antigo', type: 'in', defaultImpact: false },
  { id: 'transferencia_filiais', label: 'Transferência entre Unidades', type: 'in', defaultImpact: false },
  { id: 'aporte_capital', label: 'Aporte de Capital / Sócios', type: 'in', defaultImpact: false },
  { id: 'estorno', label: 'Estorno', type: 'in', defaultImpact: false },
  { id: 'tarifa_bancaria', label: 'Tarifa Bancária', type: 'out', defaultImpact: false },
  { id: 'pagamento_fornecedor', label: 'Pgto Fornecedor Extra', type: 'out', defaultImpact: false },
  { id: 'outros', label: 'Outros', type: 'both', defaultImpact: true }
];

export function OrphanCategorizationModal({ 
  transactionId, 
  transactionTitle, 
  transactionAmount,
  transactionType,
  onClose,
  onSuccess,
  categorizeOrphan
}: OrphanCategorizationModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [impactsRevenue, setImpactsRevenue] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = CATEGORIES.filter(c => c.type === transactionType || c.type === 'both');

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setSelectedCategory(cat.label);
    setImpactsRevenue(cat.defaultImpact);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (selectedCategory || '').trim();
    if (!finalCategory) {
      setError('Por favor, informe ou selecione uma categoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const result = await categorizeOrphan(transactionId, finalCategory, justification, impactsRevenue);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onSuccess(finalCategory, justification, impactsRevenue);
    } else {
      setError(result.error || 'Erro ao salvar justificativa.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Justificar Lançamento Bancário"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card do Lançamento Bancário */}
        <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Lançamento do Extrato Bancário
            </span>
            <Badge variant="outline" className="text-xs font-mono text-[var(--color-primary)]">
              {transactionType === 'in' ? 'Entrada' : 'Saída'}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Landmark size={16} className="text-[var(--color-primary)] shrink-0" />
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate max-w-[260px]">
                {transactionTitle || 'Lançamento Bancário'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                {transactionType === 'in' ? '+' : '-'} R$ {transactionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 1. SELETOR DE IMPACTO NO FATURAMENTO */}
        {transactionType === 'in' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block font-mono">
              Impacto no Faturamento Atual da Loja <span className="text-amber-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Opção 1: Somar */}
              <button
                type="button"
                onClick={() => setImpactsRevenue(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  impactsRevenue
                    ? 'bg-[var(--bg-panel)] border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/40'
                    : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] opacity-60 hover:opacity-100 hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-sans">
                    <DollarSign size={14} className="text-[var(--color-primary)]" />
                    Somar ao Faturamento
                  </span>
                  {impactsRevenue && <Check size={14} className="text-[var(--color-primary)]" />}
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                  Receita real da loja (venda sem OS, sucata, serviços avulsos).
                </span>
              </button>

              {/* Opção 2: Apenas Conciliar */}
              <button
                type="button"
                onClick={() => setImpactsRevenue(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  !impactsRevenue
                    ? 'bg-[var(--bg-panel)] border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/40'
                    : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] opacity-60 hover:opacity-100 hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-sans">
                    <Ban size={14} className="text-[var(--color-accent-warning)]" />
                    Apenas Conciliar (NÃO Somar)
                  </span>
                  {!impactsRevenue && <Check size={14} className="text-[var(--color-primary)]" />}
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                  Marco Zero, rendimento de aplicação, transferência, aporte.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 2. CATEGORIA */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
              Categoria / Motivo <span className="text-amber-400">*</span>
            </label>
            <span className="text-[10px] text-[var(--text-tertiary)] font-sans">escolha abaixo ou digite</span>
          </div>
          
          <input
            type="text"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="Ex: Rendimento de Aplicação, Ajuste Marco Zero, Venda de Sucata..."
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)] font-sans"
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer font-sans ${
                  selectedCategory.toLowerCase() === cat.label.toLowerCase()
                    ? 'bg-[var(--bg-surface-hover)] border-[var(--color-primary)] text-[var(--color-primary)] font-bold' 
                    : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. JUSTIFICATIVA */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
            Observações Adicionais (Opcional)
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Ex: Rendimento diário automático de saldo Itaú ou ajuste do Marco Zero..."
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors h-16 resize-none placeholder:text-[var(--text-tertiary)] font-sans"
          />
        </div>

        {error && (
          <div className="p-3 bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/30 rounded-lg text-[var(--color-accent-warning)] text-xs font-medium flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedCategory}
            className="font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Confirmar Justificativa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
