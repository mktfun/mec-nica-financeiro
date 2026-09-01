import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, Search, UploadCloud, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStores } from '@/hooks/useStores';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { useJustifiedTransactions } from '@/hooks/useJustifiedTransactions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { BreakdownModal } from '@/components/conciliacao/BreakdownModal';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const Route = createFileRoute('/conciliacao/')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [breakdownStore, setBreakdownStore] = useState<{ id: string; name: string } | null>(null);
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { canImport } = useUserPermissions();

  const { data: availableDates = [], isLoading: loadingDates } = useAvailableConciliacaoDates();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: summary, isLoading: loadingSummary } = useDailyReconciliationSummary(selectedDate);
  const { data: justifiedData } = useJustifiedTransactions(selectedDate);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    } else if (!selectedDate && !loadingDates) {
      setSelectedDate(new Date().toISOString().substring(0, 10));
    }
  }, [availableDates, loadingDates, selectedDate]);

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

  return (
    <AppShell>
      <PageContainer variant="finance" className="space-y-6 pb-20 pt-2">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados do dia..." />
          </div>
        ) : (
          <>
            {/* Botão de Ação Rápida: Importação & Fechamento Diário */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-xl shadow-sm">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  Painel de Conciliação Diária
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Consolidação dos 5 pilares, faturamento odômetro e conferência por unidade.
                </p>
              </div>
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
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                  canImport
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/50 cursor-pointer'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {canImport ? <UploadCloud size={16} /> : <Lock size={15} />}
                Importar e Fechar Dia
              </button>
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

            {/* Lista de Lojas — Fechamento Consolidado */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Store size={18} className="text-[var(--color-primary)]" />
                  Fechamento por Filial
                </h3>
                <span className="text-xs text-[var(--text-tertiary)] font-mono">
                  {stores.length} lojas monitoradas
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map((store) => {
                  const rawLog = storesList.find(l => l.store_id === store.id);
                  const log = {
                    saldo_banco: rawLog?.saldo_banco ?? (rawLog as any)?.saldo_banco_itau ?? (rawLog as any)?.saldo_banco_ofx ?? 0,
                    saldo_banco_ofx: rawLog?.saldo_banco_ofx ?? rawLog?.saldo_banco ?? 0,
                    maquininha: rawLog?.maquininha ?? (rawLog as any)?.rede_liquido ?? 0,
                    rede_bruto: (rawLog as any)?.rede_bruto ?? 0,
                    rede_liquido: (rawLog as any)?.rede_liquido ?? rawLog?.maquininha ?? 0,
                    pix: rawLog?.pix ?? (rawLog as any)?.pix_os ?? 0,
                    na_loja_os: rawLog?.na_loja_os ?? (rawLog as any)?.patio_os ?? 0,
                    previsto_ofx: rawLog?.previsto_ofx ?? (rawLog as any)?.rede_bruto ?? 0,
                    diferenca: rawLog?.diferenca ?? (rawLog as any)?.nao_entrou_valor ?? 0,
                    status_compensacao: (rawLog?.status_compensacao || 'sem_movimento') as any,
                    nao_entrou_valor: (rawLog as any)?.nao_entrou_valor ?? 0,
                    status: (rawLog?.status || 'pending') as any
                  };

                  const isDiferencaOk = Math.abs(log.diferenca || 0) === 0 && (log.status === 'approved' || log.status === 'conciliado');

                  return (
                    <div key={store.id} className="relative group">
                      <Link
                        to="/conciliacao/$lojaId"
                        params={{ lojaId: store.id }}
                        search={{ date: selectedDate }}
                        className="block transition-all hover:scale-[1.005] duration-200"
                      >
                        <Card className={`p-4 sm:p-5 border flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 transition-all shadow-md hover:shadow-xl cursor-pointer ${
                          isDiferencaOk ? 'hover:border-[var(--color-accent-teal)]/40' : 'hover:border-[var(--color-accent-danger)]/40'
                        }`}>
                          
                          {/* Nome da Loja & Status */}
                          <div className="w-full xl:w-64 shrink-0 flex items-center gap-4">
                            <div className={`w-2 h-14 rounded-full ${isDiferencaOk ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-base sm:text-lg text-white leading-tight">{store.name}</p>
                                {log.status_compensacao === 'entrou' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    ENTROU
                                  </span>
                                )}
                                {(log.status_compensacao === 'parcial' || log.status_compensacao === 'nao_entrou' || log.status_compensacao === 'a_compensar') && (log.nao_entrou_valor || 0) > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    A COMPENSAR (+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.nao_entrou_valor || 0)})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">ID: {store.id}</p>
                            </div>
                          </div>

                          {/* Painel Único de Fundo Contínuo Envelopando as 6 Métricas */}
                          <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
                              
                              {/* 1. SALDO TOTAL */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  SALDO TOTAL
                                </span>
                                <p className={`font-bold text-sm sm:text-base font-mono ${(log.saldo_banco || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  <AnimatedNumber value={log.saldo_banco || 0} format="currency" />
                                </p>
                              </div>

                              {/* 2. Maquininha */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Maquininha
                                </span>
                                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                                  <AnimatedNumber value={log.maquininha || 0} format="currency" />
                                </p>
                              </div>

                              {/* 3. PIX */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  PIX
                                </span>
                                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                                  <AnimatedNumber value={log.pix || 0} format="currency" />
                                </p>
                              </div>

                              {/* 4. Na Loja OS */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Na Loja OS
                                </span>
                                <p className="font-bold text-sm text-[var(--color-accent-warning)] font-mono">
                                  <AnimatedNumber value={log.na_loja_os || 0} format="currency" />
                                </p>
                              </div>

                              {/* 5. Previsto */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Previsto
                                </span>
                                <p className="font-bold text-sm text-[var(--text-primary)] font-mono">
                                  <AnimatedNumber value={log.previsto_ofx || 0} format="currency" />
                                </p>
                                <span className="text-[9px] text-[var(--text-tertiary)] block mt-0.5 font-medium">
                                  Total Previsto
                                </span>
                              </div>

                              {/* 6. Diferença */}
                              <div className="xl:border-l xl:border-white/10 xl:pl-6">
                                <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                                  isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                                }`}>
                                  Diferença
                                </span>
                                <p className={`font-bold text-sm font-mono ${
                                  isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                                }`}>
                                  <AnimatedNumber value={log.diferenca || 0} format="currency" />
                                </p>
                              </div>
                            </div>
                          </div>

                        </Card>
                      </Link>

                      {/* Botão Raio-X — flutuante sobre o Card, fora do Link para não navegar */}
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBreakdownStore({ id: store.id, name: store.name }); }}
                        title="Ver transações detalhadas desta loja"
                        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--bg-canvas)]/80 border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]/40 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Search size={11} />
                        Raio-X
                      </button>
                    </div>
                  );
                })}
              </div>
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
