import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Calendar,
  Sparkles,
  Command,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MessageList } from '@/components/chat/MessageList';
import { PromptInput } from '@/components/chat/PromptInput';
import { useReconciliationChat } from '@/hooks/useReconciliationChat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ReconciliationChatWorkspaceProps {
  targetDate: string;
  onSwitchToClassicView?: () => void;
  onReturnToSelector?: () => void;
  className?: string;
}

const formatBrl = (val?: number) => {
  if (val === undefined || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const ReconciliationChatWorkspace: React.FC<ReconciliationChatWorkspaceProps> = ({
  targetDate,
  onSwitchToClassicView,
  onReturnToSelector,
  className
}) => {
  const [showStoreBreakdown, setShowStoreBreakdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Hook de Chat de Conciliação
  const {
    messages,
    isLoading,
    sendMessage,
    confirmProposal,
    rejectProposal
  } = useReconciliationChat({ targetDate });

  // 2. Consulta Canônica dos 5 Pilares e Detalhe das Lojas
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['dailyReconciliationSummary', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', {
        p_date: targetDate,
        p_force_dynamic: true
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!targetDate
  });

  const summary = summaryData || {};
  const isApproved = summary.status_geral === 'approved' || Math.abs(Number(summary.diferenca_final || 0)) <= 50;
  const isClosed = summary.is_closed === true;
  const stores = summary.stores || summary.stores_detail || [];

  // Auto-scroll ao receber novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Função para selar fechamento diário
  const handleCloseDay = async () => {
    if (!isApproved) {
      toast.error('A conciliação ainda possui divergência superior à tolerância contábil.');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('close_daily_snapshot', {
        p_date: targetDate,
        p_notes: 'Fechamento homologado via Workspace Conversacional Hydra'
      });
      if (error) throw error;
      toast.success(`Fechamento do dia ${targetDate} homologado e selado com sucesso!`);
      refetchSummary();
    } catch (err: any) {
      toast.error(`Falha ao selar fechamento: ${err.message}`);
    }
  };

  return (
    <div className={cn('flex flex-col h-[calc(100vh-64px)] bg-zinc-950 text-zinc-100 overflow-hidden', className)}>
      {/* ========================================================================= */}
      {/* 1. SCOREBOARD SUPERIOR DOS 5 PILARES & LIVE DELTA TRACKER (ZINC-950)     */}
      {/* ========================================================================= */}
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Lado Esquerdo: Data e Identificador */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{targetDate}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">Workspace Conversacional</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 font-mono text-[11px]">Hydra Multi-Braço</span>
            </div>
          </div>

          {/* Centro: Os 4 Grandes Números Contábeis */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Caixa Atual</span>
              <span className="text-zinc-200 tabular-nums font-medium">
                {formatBrl(summary.caixa_atual)}
              </span>
            </div>

            <div className="hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Faturamento</span>
              <span className="text-zinc-200 tabular-nums font-medium">
                {formatBrl(summary.faturamento_periodo)}
              </span>
            </div>

            <div className="hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Contas a Pagar</span>
              <span className="text-zinc-200 tabular-nums font-medium">
                {formatBrl(summary.subtotal_contas)}
              </span>
            </div>

            {/* LIVE DELTA BADGE SÓBRIO */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Diferença (Δ)</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-mono font-semibold tabular-nums border flex items-center gap-1.5',
                  isApproved
                    ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40'
                    : 'text-rose-400 bg-rose-950/30 border-rose-800/40'
                )}
              >
                {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {formatBrl(summary.diferenca_final)}
              </span>
            </div>
          </div>

          {/* Lado Direito: Ações de Fechamento e Troca de Modo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStoreBreakdown((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/60 transition-colors"
              title="Exibir semáforo das 10 filiais"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">10 Lojas</span>
              {showStoreBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {onReturnToSelector && (
              <button
                type="button"
                onClick={onReturnToSelector}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-850 border border-zinc-700 hover:bg-zinc-800 transition-colors"
                title="Voltar para a tela de escolha de modalidade"
              >
                <span>↩ Escolha de Modo</span>
              </button>
            )}

            {onSwitchToClassicView && (
              <button
                type="button"
                onClick={onSwitchToClassicView}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/60 transition-colors"
                title="Voltar para a visão clássica de tabelas"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Painel Clássico</span>
              </button>
            )}

            {/* BOTÃO DE SELAGEM DO CAIXA */}
            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800">
                <Lock className="w-3.5 h-3.5 text-zinc-500" /> Fechado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCloseDay}
                disabled={!isApproved}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all',
                  isApproved
                    ? 'text-emerald-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm cursor-pointer'
                    : 'text-zinc-600 bg-zinc-900 border border-zinc-800/60 cursor-not-allowed opacity-60'
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Homologar Dia</span>
              </button>
            )}
          </div>
        </div>

        {/* GAVETA EXPANSÍVEL: MATRIZ DAS 10 FILIAIS */}
        {showStoreBreakdown && (
          <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
            {stores.map((st: any) => {
              const storeDiff = (st.dif_entradas || 0) - (st.dif_saidas || 0);
              const storeOk = Math.abs(storeDiff) <= 5.0;

              return (
                <div
                  key={st.store_id || st.name}
                  className={cn(
                    'p-2 rounded-lg border flex flex-col justify-between gap-1',
                    storeOk
                      ? 'bg-zinc-900/40 border-zinc-800/60'
                      : 'bg-rose-950/15 border-rose-900/30 text-rose-300'
                  )}
                >
                  <span className="text-zinc-400 truncate font-sans text-xs">
                    {st.name || st.store_id}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Saldo:</span>
                    <span className="text-zinc-300 tabular-nums">
                      {formatBrl(st.saldo_banco)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Dif:</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        storeOk ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {formatBrl(storeDiff)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE MENSAGENS E FEED CONVERSACIONAL                                */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onConfirmProposal={confirmProposal}
          onRejectProposal={rejectProposal}
          assistantName="Analista de Conciliação"
        />
        <div ref={messagesEndRef} />
      </main>

      {/* ========================================================================= */}
      {/* 3. BARRA INFERIOR DE COMANDOS & PROMPT INPUT                              */}
      {/* ========================================================================= */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-3">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Pílulas de Comandos Rápidos Contábeis */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => sendMessage('/auto-match')}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/60 transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              <span>/auto-match</span>
            </button>

            <button
              type="button"
              onClick={() => sendMessage('/lojas')}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/60 transition-colors shrink-0 disabled:opacity-50"
            >
              <Building2 className="w-3 h-3" />
              <span>/lojas</span>
            </button>

            <button
              type="button"
              onClick={() => sendMessage('Quais filiais ainda estão divergentes e o que falta para zerar a diferença?')}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/60 transition-colors shrink-0 disabled:opacity-50"
            >
              <span>Auditar filiais pendentes</span>
            </button>
          </div>

          {/* Componente PromptInput */}
          <PromptInput
            onSubmit={(value) => sendMessage(value)}
            placeholder="Digite sua consulta contábil ou use /auto-match, /lojas..."
            disabled={isLoading}
            className="w-full"
          />
        </div>
      </footer>
    </div>
  );
};
