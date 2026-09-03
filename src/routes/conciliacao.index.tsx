import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, Search, UploadCloud, Lock, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStores } from '@/hooks/useStores';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { useJustifiedTransactions } from '@/hooks/useJustifiedTransactions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { ConciliacaoLojasView } from '@/components/conciliacao/ConciliacaoLojasView';
import { BreakdownModal } from '@/components/conciliacao/BreakdownModal';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useQueryClient } from '@tanstack/react-query';
import { ReconciliationChatWorkspace } from '@/components/conciliacao/chat/ReconciliationChatWorkspace';
import { toast } from 'sonner';

export const Route = createFileRoute('/conciliacao/')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      date: (search.date as string) || undefined,
    };
  },
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const { date: searchDate } = Route.useSearch();
  const [selectedDate, setSelectedDate] = useState(searchDate || '');
  const [breakdownStore, setBreakdownStore] = useState<{ id: string; name: string } | null>(null);
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { canImport } = useUserPermissions();

  // Controle de alternância de modo (Painel Clássico vs Workspace Conversacional)
  const [viewMode, setViewMode] = useState<'classic' | 'chat'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlView = urlParams.get('view');
        if (urlView === 'chat' || urlView === 'classic') return urlView;
      }
      const saved = localStorage.getItem('conciliacao_view_mode');
      return saved === 'chat' ? 'chat' : 'classic';
    } catch {
      return 'classic';
    }
  });

  const handleViewChange = (mode: 'classic' | 'chat') => {
    setViewMode(mode);
    try {
      localStorage.setItem('conciliacao_view_mode', mode);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('view', mode);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  };

  const { data: availableDates = [], isLoading: loadingDates } = useAvailableConciliacaoDates();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: summary, isLoading: loadingSummary } = useDailyReconciliationSummary(selectedDate);
  const { data: justifiedData } = useJustifiedTransactions(selectedDate);

  useEffect(() => {
    if (searchDate && searchDate !== selectedDate) {
      setSelectedDate(searchDate);
    } else if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    } else if (!selectedDate && !loadingDates) {
      setSelectedDate(new Date().toISOString().substring(0, 10));
    }
  }, [availableDates, loadingDates, selectedDate, searchDate]);

  const isLoading = loadingStores || loadingSummary || loadingDates || !selectedDate;

  const storesList = summary?.stores || [];
  const isApproved = summary?.status_geral === 'approved';

  const handleDayChange = (offset: number) => {
    if (availableDates.length === 0) return;
    
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex === -1) {
      setSelectedDate(availableDates[availableDates.length - 1]);
      return;
    }
    
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < availableDates.length) {
      setSelectedDate(availableDates[newIndex]);
    }
  };

  const totalSistema = storesList.reduce((acc, log) => acc + (log.previsto_ofx || 0), 0);
  const totalBancarioIn = summary?.total_entradas_ofx ?? summary?.faturamento_ofx ?? 0;
  const totalBancarioRaw = summary?.total_saldo_banco || 0;
  const divergenciaGlobal = summary?.diferenca_final || 0;

  const storesState: StoreSaldoState[] = stores.map(s => {
    const rawLog = storesList.find(l => l.store_id === s.id);
    return {
      store_id: s.id,
      store_name: s.name,
      saldo_banco_itau: rawLog?.saldo_banco ?? (rawLog as any)?.saldo_banco_itau ?? (rawLog as any)?.saldo_banco_ofx ?? 0,
      limite_credito: 0,
      cartao_entrou: rawLog?.maquininha ?? (rawLog as any)?.rede_liquido ?? 0,
      cartao_nao_entrou: (rawLog as any)?.nao_entrou_valor ?? 0,
      dinheiro_loja: (rawLog as any)?.dinheiro_loja ?? 0,
      a_receber: 0,
      na_loja_os: rawLog?.na_loja_os ?? (rawLog as any)?.patio_os ?? 0,
      pix_os: rawLog?.pix ?? (rawLog as any)?.pix_os ?? 0,
      pix_os_expected: rawLog?.pix ?? (rawLog as any)?.pix_os ?? 0,
      faturamento_atual: rawLog?.previsto_ofx ?? (rawLog as any)?.rede_bruto ?? 0,
      faturamento_anterior: 0,
      seguro_sinistro: 0,
      juros_atual: 0,
      caixa_anterior: 0,
      valor_contas: 0
    };
  });

  // MODO CONVERSACIONAL EM TELA CHEIA (FULL-PAGE CHAT HYDRA)
  if (viewMode === 'chat' && selectedDate) {
    return (
      <AppShell>
        <ReconciliationChatWorkspace
          targetDate={selectedDate}
          onSwitchToClassicView={() => handleViewChange('classic')}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer variant="finance" className="space-y-6 pb-20 pt-2">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados do dia..." />
          </div>
        ) : (
          <>
            {/* Barra de Ações: Alternância de Modo & Importação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-xl shadow-sm">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  Painel de Conciliação Diária
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Consolidação dos 5 pilares, faturamento odômetro e conferência por unidade.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* BOTÃO PARA ALTERNAR PARA O WORKSPACE CONVERSACIONAL */}
                <button
                  type="button"
                  onClick={() => handleViewChange('chat')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 cursor-pointer shadow-sm"
                  title="Abrir a conciliação em tela cheia com o Analista Hydra"
                >
                  <MessageSquare size={15} className="text-zinc-400" />
                  <span>Workspace Conversacional</span>
                </button>

                <button
                  onClick={() => {
                    if (!canImport) {
                      toast.error('Você não tem permissão para importar arquivos.');
                      return;
                    }
                    navigate({ to: '/importacoes', search: { date: selectedDate, tab: 'diario' } });
                  }}
                  disabled={!canImport}
                  title={!canImport ? 'Apenas usuários com permissão de importação podem acessar esta área.' : 'Importar arquivos e fechar dia'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                    canImport
                      ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/50 cursor-pointer'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {canImport ? <UploadCloud size={16} /> : <Lock size={15} />}
                  Importar e Fechar Dia
                </button>
              </div>
            </div>

            {/* O Hero Card Unificado */}
            <ResumoDiaPanel 
              selectedDate={selectedDate}
              onDayChange={handleDayChange}
              onDateSelect={setSelectedDate}
              divergenciaGlobal={divergenciaGlobal}
              isApproved={isApproved}
              detalhesCount={storesList.length}
              totalSistema={totalSistema}
              totalBancarioIn={totalBancarioIn}
              totalBancarioRaw={totalBancarioRaw}
              totalOfxIn={totalBancarioIn}
              totalOfxOut={summary?.ofx_out || 0}
              storesData={storesState}
              availableDates={availableDates}
              summary={summary}
            />

            {/* Lista de Lojas — Fechamento Consolidado por Filial */}
            <div className="pt-4">
              <ConciliacaoLojasView
                stores={stores}
                summary={summary ?? null}
                selectedDate={selectedDate}
              />
            </div>

            {/* BreakdownModal — Raio-X por Loja */}
            <BreakdownModal
              isOpen={!!breakdownStore}
              onClose={() => setBreakdownStore(null)}
              storeId={breakdownStore?.id || null}
              storeName={breakdownStore?.name || ''}
              date={selectedDate}
            />
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
