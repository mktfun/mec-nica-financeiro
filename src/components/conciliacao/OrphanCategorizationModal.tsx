import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface OrphanCategorizationModalProps {
  transactionId: string;
  transactionTitle: string;
  transactionAmount: number;
  transactionType: 'in' | 'out';
  onClose: () => void;
  onSuccess: (categoryId: string, justification: string) => void;
  categorizeOrphan: (id: string, category: string, justification: string) => Promise<{ success: boolean, error?: string }>;
}

const CATEGORIES = [
  { id: 'venda_sucata', label: 'Venda de Sucata', type: 'in' },
  { id: 'deposito_avulso', label: 'Depósito Avulso', type: 'in' },
  { id: 'tarifa_bancaria', label: 'Tarifa Bancária', type: 'out' },
  { id: 'estorno', label: 'Estorno', type: 'in' },
  { id: 'pagamento_fornecedor', label: 'Pgto Fornecedor Extra', type: 'out' },
  { id: 'outros', label: 'Outros', type: 'both' }
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = CATEGORIES.filter(c => c.type === transactionType || c.type === 'both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setError('Por favor, selecione uma categoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const result = await categorizeOrphan(transactionId, selectedCategory, justification);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onSuccess(selectedCategory, justification);
    } else {
      setError(result.error || 'Erro ao salvar justificativa.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f111a] border border-[#1e293b] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b]">
          <h3 className="font-semibold text-white">Justificar Transação Órfã</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#1e293b] rounded-md transition-colors text-[var(--text-secondary)] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-[#1e293b]/30 p-3 rounded-lg border border-[#1e293b]">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Detalhes da Transação</p>
            <p className="text-sm font-medium text-white line-clamp-1">{transactionTitle || 'Transação sem nome'}</p>
            <p className={`text-sm font-semibold mt-1 ${transactionType === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {transactionType === 'in' ? '+' : '-'} 
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactionAmount)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Categoria <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                    selectedCategory === cat.id 
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400' 
                      : 'bg-[#1e293b]/30 border-[#1e293b] text-[var(--text-secondary)] hover:bg-[#1e293b]/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Justificativa/Detalhes
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: Venda de sucata metálica no pátio"
              className="w-full bg-[#1e293b]/30 border border-[#1e293b] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors h-24 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCategory}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Salvar Justificativa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
