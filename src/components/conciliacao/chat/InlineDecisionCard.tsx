import React, { useEffect, useCallback } from 'react';
import { Check, X, ArrowRight, Building2, Tag, FileText, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineDecisionProposal {
  id: string;
  armId?: string;
  title: string;
  description: string;
  storeId?: string;
  storeName?: string;
  amount?: number;
  currentDelta?: number;
  projectedDelta?: number;
  actionPayload: {
    transactionId: string;
    actionType: 'link_os' | 'revenue_adjustment' | 'expense_bill' | 'justify_only';
    targetId?: string;
    amount?: number;
    category?: string;
    justification?: string;
  };
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface InlineDecisionCardProps {
  proposal: InlineDecisionProposal;
  onConfirm: (proposal: InlineDecisionProposal) => void;
  onReject: (proposal: InlineDecisionProposal) => void;
  disabled?: boolean;
  className?: string;
}

const formatCurrency = (val?: number) => {
  if (val === undefined || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const InlineDecisionCard: React.FC<InlineDecisionCardProps> = ({
  proposal,
  onConfirm,
  onReject,
  disabled = false,
  className
}) => {
  const isPending = proposal.status === 'pending';

  // Escuta atalhos de teclado se a proposta estiver pendente
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isPending || disabled) return;

      // Não interceptar se o foco estiver em um input ou textarea ativo
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === '1' || e.key === 'Enter') {
        e.preventDefault();
        onConfirm(proposal);
      } else if (e.key === '2' || e.key === 'Escape') {
        e.preventDefault();
        onReject(proposal);
      }
    },
    [isPending, disabled, proposal, onConfirm, onReject]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={cn(
        'w-full max-w-lg mt-3 p-3.5 rounded-xl border font-sans transition-all duration-200',
        isPending
          ? 'bg-zinc-950/80 border-zinc-800 shadow-sm hover:border-zinc-700'
          : proposal.status === 'confirmed'
          ? 'bg-emerald-950/15 border-emerald-900/40 opacity-90'
          : 'bg-zinc-900/30 border-zinc-800/40 opacity-60',
        className
      )}
    >
      {/* Cabeçalho do Card: Filial e Tipo de Ação */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-medium text-zinc-300">
            {proposal.storeName || proposal.storeId || 'Holding Central'}
          </span>
        </div>

        {/* Badge de Status Sóbrio (Sem emojis) */}
        {proposal.status === 'confirmed' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50">
            <Check className="w-3 h-3" /> Ação Aplicada
          </span>
        )}
        {proposal.status === 'rejected' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800">
            <X className="w-3 h-3" /> Ignorada
          </span>
        )}
        {isPending && (
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono font-medium">
            Aguardando Decisão
          </span>
        )}
      </div>

      {/* Título e Descrição da Proposta */}
      <div className="space-y-1 mb-3">
        <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          {proposal.title}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {proposal.description}
        </p>
      </div>

      {/* Painel Quantitativo de Impacto no Delta */}
      {(proposal.amount !== undefined || proposal.projectedDelta !== undefined) && (
        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 mb-3 text-xs">
          {proposal.amount !== undefined && (
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">Valor da Transação</span>
              <span className="font-mono font-medium text-zinc-200 tabular-nums">
                {formatCurrency(proposal.amount)}
              </span>
            </div>
          )}

          {proposal.projectedDelta !== undefined && (
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">Delta Projetado</span>
              <span
                className={cn(
                  'font-mono font-medium tabular-nums',
                  Math.abs(proposal.projectedDelta) <= 50
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                )}
              >
                {formatCurrency(proposal.projectedDelta)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Botões de Decisão (Apenas se pendente) */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onConfirm(proposal)}
            disabled={disabled}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirmar Ação</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 dark:bg-zinc-300 text-zinc-200 dark:text-zinc-900 border border-zinc-700 dark:border-zinc-400">
              1 / Enter
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => onReject(proposal)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rejeitar</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
              2 / Esc
            </kbd>
          </button>
        </div>
      )}
    </div>
  );
};
