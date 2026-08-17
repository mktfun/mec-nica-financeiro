import React, { useState } from 'react';
import { X, Check, DollarSign, Ban, Landmark, Sparkles } from 'lucide-react';

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
  { id: 'transferencia_filiais', label: 'Transferência entre Filiais', type: 'in', defaultImpact: false },
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f111a] border border-[#1e293b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b] bg-[var(--bg-panel)]">
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Landmark size={18} className="text-[var(--color-primary)]" />
              Justificar Lançamento Bancário
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">Concilie a transação e defina o impacto contábil no faturamento.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#1e293b] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Card Detalhes */}
          <div className="bg-[#1e293b]/40 p-3.5 rounded-xl border border-[#1e293b] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Lançamento do Extrato</p>
              <p className="text-sm font-semibold text-white line-clamp-1 mt-0.5">{transactionTitle || 'Transação sem nome'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Valor</p>
              <p className={`text-base font-bold font-mono ${transactionType === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {transactionType === 'in' ? '+' : '-'} 
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactionAmount)}
              </p>
            </div>
          </div>

          {/* 1. SELETOR DE IMPACTO NO FATURAMENTO */}
          {transactionType === 'in' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                Impacto no Faturamento Atual da Loja <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Opção 1: Somar */}
                <button
                  type="button"
                  onClick={() => setImpactsRevenue(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    impactsRevenue
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                      : 'bg-[#1e293b]/30 border-[#1e293b] opacity-60 hover:opacity-90 hover:bg-[#1e293b]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <DollarSign size={14} />
                      Somar ao Faturamento
                    </span>
                    {impactsRevenue && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                    Receita real da loja (Venda sem OS, sucata, serviços avulsos).
                  </span>
                </button>

                {/* Opção 2: Apenas Conciliar (Não somar) */}
                <button
                  type="button"
                  onClick={() => setImpactsRevenue(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    !impactsRevenue
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-[#1e293b]/30 border-[#1e293b] opacity-60 hover:opacity-90 hover:bg-[#1e293b]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Ban size={14} />
                      Apenas Conciliar (NÃO Somar)
                    </span>
                    {!impactsRevenue && <Check size={14} className="text-amber-400" />}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                    Marco Zero, rendimento de aplicação, transferência entre filiais, aportes.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. CATEGORIA */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex justify-between items-center">
              <span>Categoria / Motivo <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-[var(--text-tertiary)] lowercase font-normal">escolha abaixo ou digite</span>
            </label>
            
            <input
              type="text"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              placeholder="Ex: Rendimento de Aplicação, Ajuste Marco Zero, Venda de Sucata..."
              className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors placeholder:text-[var(--text-tertiary)]"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.label.toLowerCase()
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400 font-semibold' 
                      : 'bg-[#1e293b]/30 border-[#1e293b] text-[var(--text-secondary)] hover:bg-[#1e293b]/50 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. DETALHES ADICIONAIS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Justificativa / Observação (Opcional)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: Rendimento diário automático de saldo Itaú ou ajuste anterior ao Marco Zero..."
              className="w-full bg-[#1e293b]/30 border border-[#1e293b] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors h-16 resize-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white transition-colors bg-[#1e293b]/30 hover:bg-[#1e293b]/50 border border-[#1e293b] rounded-xl font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCategory}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Confirmar Justificativa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
