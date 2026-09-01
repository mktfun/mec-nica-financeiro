import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  Check, 
  TrendingUp, 
  Ban, 
  Landmark, 
  AlertCircle, 
  ArrowUpRight,
  Receipt
} from 'lucide-react';

interface OrphanCategorizationModalProps {
  transactionId: string;
  transactionTitle: string;
  transactionAmount: number;
  transactionType?: 'in' | 'out';
  storeId?: string;
  targetDate?: string;
  onClose: () => void;
  onSuccess: (categoryId: string, justification: string, impactsRevenueOrBills?: boolean) => void;
  categorizeOrphan: (
    id: string, 
    category: string, 
    justification: string, 
    impactsOption?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
}

const INFLOW_CATEGORIES = [
  { id: 'venda_sucata', label: 'Venda de Sucata', defaultImpact: true },
  { id: 'deposito_avulso', label: 'Depósito Avulso', defaultImpact: true },
  { id: 'rendimento_aplicacao', label: 'Rendimento de Aplicação', defaultImpact: false },
  { id: 'transferencia_filiais', label: 'Transferência entre Lojas', defaultImpact: false },
  { id: 'aporte_capital', label: 'Aporte de Sócios', defaultImpact: false },
  { id: 'estorno', label: 'Estorno / Ajuste', defaultImpact: false },
  { id: 'outros', label: 'Outros', defaultImpact: true }
];

const OUTFLOW_CATEGORIES = [
  { id: 'fornecedores', label: 'Fornecedores', defaultImpact: true },
  { id: 'pecas', label: 'Peças', defaultImpact: true },
  { id: 'servicos', label: 'Serviços', defaultImpact: true },
  { id: 'pro_labore', label: 'Pró-labore', defaultImpact: false },
  { id: 'transferencia_matriz', label: 'Transferência Matriz', defaultImpact: false },
  { id: 'impostos', label: 'Impostos', defaultImpact: true },
  { id: 'outros', label: 'Outros', defaultImpact: true }
];

export function OrphanCategorizationModal({ 
  transactionId, 
  transactionTitle, 
  transactionAmount,
  transactionType = 'in',
  onClose,
  onSuccess,
  categorizeOrphan
}: OrphanCategorizationModalProps) {
  const isOut = transactionType === 'out';
  const quickCategories = isOut ? OUTFLOW_CATEGORIES : INFLOW_CATEGORIES;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    isOut ? 'Fornecedores' : 'Venda de Sucata'
  );
  const [justification, setJustification] = useState('');
  const [impactsOption, setImpactsOption] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryClick = (cat: { id: string; label: string; defaultImpact: boolean }) => {
    setSelectedCategory(cat.label);
    setImpactsOption(cat.defaultImpact);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (selectedCategory || '').trim();
    if (!finalCategory) {
      setError('Selecione ou digite uma categoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const result = await categorizeOrphan(transactionId, finalCategory, justification, impactsOption);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onSuccess(finalCategory, justification, impactsOption);
    } else {
      setError(result.error || 'Erro ao salvar justificativa.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isOut ? "Justificar Débito Bancário" : "Justificar Crédito Bancário"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Card de Identificação da Transação */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 border ${
              isOut 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isOut ? <ArrowUpRight size={18} /> : <Landmark size={18} />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-zinc-200 truncate" title={transactionTitle}>
                {transactionTitle || (isOut ? 'Débito Bancário OFX' : 'Crédito Bancário OFX')}
              </p>
              <span className="text-[11px] text-zinc-400">Extrato Bancário da Filial</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-base font-bold font-mono ${isOut ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isOut ? '- ' : '+ '} 
              {Math.abs(transactionAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* 1. Escolha de Impacto Contábil */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {isOut ? 'Destino do Débito' : 'Destino da Justificativa'}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {isOut ? (
              <>
                <button
                  type="button"
                  onClick={() => setImpactsOption(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    impactsOption
                      ? 'bg-rose-500/10 border-rose-500 text-rose-300 ring-1 ring-rose-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Receipt size={14} className={impactsOption ? 'text-rose-400' : 'text-zinc-400'} />
                      Somar ao Contas a Pagar
                    </span>
                    {impactsOption && <Check size={14} className="text-rose-400" />}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Despesa operacional da filial
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImpactsOption(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    !impactsOption
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200 ring-1 ring-zinc-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Ban size={14} className={!impactsOption ? 'text-amber-400' : 'text-zinc-400'} />
                      Apenas Conciliar
                    </span>
                    {!impactsOption && <Check size={14} className="text-zinc-200" />}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Já provisionado ou transferência
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setImpactsOption(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    impactsOption
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <TrendingUp size={14} className={impactsOption ? 'text-emerald-400' : 'text-zinc-400'} />
                      Somar ao Faturamento
                    </span>
                    {impactsOption && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Receita avulsa (Sucata, serviços)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImpactsOption(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    !impactsOption
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200 ring-1 ring-zinc-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Ban size={14} className={!impactsOption ? 'text-amber-400' : 'text-zinc-400'} />
                      Apenas Conciliar
                    </span>
                    {!impactsOption && <Check size={14} className="text-zinc-200" />}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Aporte, transferência, rendimento
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. Categoria em Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {isOut ? 'Categoria de Despesa' : 'Motivo / Categoria'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickCategories.map(cat => {
              const isSelected = selectedCategory.toLowerCase() === cat.label.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                    isSelected
                      ? isOut 
                        ? 'bg-rose-600 text-white border-rose-500 font-semibold shadow-sm'
                        : 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          
          <input
            type="text"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder={isOut ? "Ou digite outra categoria de despesa..." : "Ou digite outra categoria..."}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600 mt-1"
          />
        </div>

        {/* 3. Observações */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Observação / Detalhes (Opcional)
          </label>
          <input
            type="text"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={isOut ? "Ex: Pagamento fornecedor de peças..." : "Ex: Venda de sucata loja Santo André..."}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !selectedCategory}
            className={`text-xs text-white font-semibold gap-1.5 px-4 ${
              isOut ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Salvar Justificativa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
