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
    const finalCategory = (selectedCategory || '').trim();
    if (!finalCategory) {
      setError('Por favor, informe ou selecione uma categoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const result = await categorizeOrphan(transactionId, finalCategory, justification);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onSuccess(finalCategory, justification);
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
            className="p-1 hover:bg-[#1e293b] rounded-md transition-colors text-[var(--text-secondary)] hover:text-white cursor-pointer"
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
            <label className="text-sm font-medium text-[var(--text-secondary)] flex justify-between items-center">
              <span>Categoria / Tipo <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Digite livremente ou escolha</span>
            </label>
            
            <input
              type="text"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              placeholder="Ex: Venda de Sucata, Reembolso Limpa Baú, Venda de Juros..."
              className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              autoFocus
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.label)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.label.toLowerCase()
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400 font-medium' 
                      : 'bg-[#1e293b]/30 border-[#1e293b] text-[var(--text-secondary)] hover:bg-[#1e293b]/50 hover:text-white'
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
              placeholder="Ex: Venda de sucata metálica no pátio ou detalhes adicionais..."
              className="w-full bg-[#1e293b]/30 border border-[#1e293b] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors h-20 resize-none"
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
