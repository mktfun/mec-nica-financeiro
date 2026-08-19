import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStores } from '@/hooks/useStores';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { useJustifiedTransactions } from '@/hooks/useJustifiedTransactions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { BreakdownModal } from '@/components/conciliacao/BreakdownModal';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { UploadCloud, Lock } from 'lucide-react';
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
    if (availableDates.length > 0) {
      const currentIndex = availableDates.indexOf(selectedDate);
      if (currentIndex !== -1) {
        const newIndex = currentIndex + offset;
        if (newIndex >= 0 && newIndex < availableDates.length) {
          setSelectedDate(availableDates[newIndex]);
          return;
        }
      }
    }
    
    // Fallback fluido: adiciona ou subtrai 1 dia diretamente no calendário
    if (selectedDate) {
      const d = new Date(selectedDate + 'T12:00:00Z');
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().substring(0, 10));
    }
  };

  const totalSistema = storesList.reduce((acc, log) => acc + (log.previsto_ofx || 0), 0);
  const totalBancarioIn = summary?.faturamento_ofx || 0;
  const totalBancarioRaw = summary?.total_saldo_banco || 0;
  const divergenciaGlobal = summary?.diferenca_final || 0;

  const storesState: StoreSaldoState[] = stores.map(s => {
    const log = storesList.find(l => l.store_id === s.id);
    return {
      store_id: s.id,
      store_name: s.name,
      saldo_banco_itau: log?.saldo_banco || 0,
      limite_credito: 0,
      cartao_entrou: log?.maquininha || 0,
      cartao_nao_entrou: 0,
      dinheiro_loja: 0,
      a_receber: 0,
      na_loja_os: log?.na_loja_os || 0,
      pix_os: log?.pix || 0,
      pix_os_expected: log?.pix || 0,
      faturamento_atual: log?.previsto_ofx || 0,
      faturamento_anterior: 0,
      seguro_sinistro: 0,
      juros_atual: 0,
      caixa_anterior: 0,
      valor_contas: 0
    };
  });

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-5xl mx-auto pb-20 pt-2">
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados do dia..." />
          </div>
        ) : (
          <>
            {/* Botão de Ação Rápida: Importação & Fechamento Diário */}
            <div className="flex justify-between items-center bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  Painel de Conciliação Diária
                </h2>
                <p className="text-xs text-zinc-400">
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
                <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Store size={18} className="text-indigo-400" />
                  Fechamento por Filial
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {stores.length} lojas monitoradas
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-3.5">
                {stores.map((store) => {
                  const log = storesList.find(l => l.store_id === store.id) || {
                    saldo_banco: 0,
                    saldo_banco_ofx: 0,
                    maquininha: 0,
                    pix: 0,
                    na_loja_os: 0,
                    previsto_ofx: 0,
                    diferenca: 0,
                    status_compensacao: 'sem_movimento' as const,
                    nao_entrou_valor: 0,
                    status: 'pending' as const
                  };

                  const storeJustifiedRevenue = justifiedData?.totalByStore[store.id] || 0;
                  const storeAllJustified = justifiedData?.totalAllByStore[store.id] || 0;
                  const rawPrevisto = log.previsto_ofx || 0;
                  const previstoAjustado = Math.max(0, rawPrevisto - storeJustifiedRevenue);
                  const diferencaCalculada = Math.max(0, (log.diferenca || 0) - storeAllJustified);
                  const isDiferencaOk = Math.abs(diferencaCalculada) <= 50 || log.status === 'approved';

                  return (
                    <div key={store.id} className="relative group">
                      <Link
                        to="/conciliacao/$lojaId"
                        params={{ lojaId: store.id }}
                        search={{ date: selectedDate }}
                        className="block"
                      >
                        <div className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/90 rounded-2xl p-4 sm:p-5 transition-all shadow-sm cursor-pointer">
                          
                          {/* Cabeçalho da Loja: Nome, Badges & Ação */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${isDiferencaOk ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : 'bg-rose-500 ring-4 ring-rose-500/20'}`} />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-base text-zinc-100 leading-snug">
                                    {store.name}
                                  </h4>
                                  <span className="text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
                                    {store.id}
                                  </span>
                                  {log.status_compensacao === 'entrou' && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      MAQ: ENTROU
                                    </span>
                                  )}
                                  {(log.status_compensacao === 'parcial' || log.status_compensacao === 'nao_entrou') && (log.nao_entrou_valor || 0) > 0 && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                      NÃO ENTROU (+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.nao_entrou_valor || 0)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-auto">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                                isDiferencaOk
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                Dif: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diferencaCalculada)}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setBreakdownStore({ id: store.id, name: store.name });
                                }}
                                title="Abrir Raio-X da loja"
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
                              >
                                <Search size={12} />
                                Raio-X
                              </button>
                            </div>
                          </div>

                          {/* Grid das 6 Métricas Perfeitamente Alinhadas */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3.5 font-sans tabular-nums">
                            
                            {/* 1. Saldo Bancos */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                SALDO BANCOS
                              </span>
                              <p className="font-bold text-sm sm:text-base text-cyan-300 font-mono truncate">
                                <AnimatedNumber value={log.saldo_banco} format="currency" />
                              </p>
                              <div className="text-[10px] text-zinc-500 mt-1 font-mono flex flex-col gap-0.5">
                                <span>OFX: <AnimatedNumber value={log.saldo_banco_ofx ?? log.saldo_banco} format="currency" /></span>
                                {(log.nao_entrou_valor || 0) > 0 && (
                                  <span className="text-amber-400 font-bold">
                                    + Maq: +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.nao_entrou_valor || 0)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 2. Maquininha */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                MAQUININHA
                              </span>
                              <p className="font-bold text-sm sm:text-base text-indigo-400 font-mono truncate">
                                <AnimatedNumber value={log.maquininha} format="currency" />
                              </p>
                              <span className="text-[10px] text-zinc-500 mt-1 block">
                                Rede Cartões
                              </span>
                            </div>

                            {/* 3. PIX */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                PIX
                              </span>
                              <p className="font-bold text-sm sm:text-base text-blue-400 font-mono truncate">
                                <AnimatedNumber value={log.pix} format="currency" />
                              </p>
                              <span className="text-[10px] text-zinc-500 mt-1 block">
                                Entradas PIX
                              </span>
                            </div>

                            {/* 4. Na Loja OS */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                NA LOJA (OS)
                              </span>
                              <p className="font-bold text-sm sm:text-base text-amber-400 font-mono truncate">
                                <AnimatedNumber value={log.na_loja_os} format="currency" />
                              </p>
                              <span className="text-[10px] text-zinc-500 mt-1 block">
                                Pátio Aberto
                              </span>
                            </div>

                            {/* 5. Previsto */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                PREVISTO
                              </span>
                              <p className="font-bold text-sm sm:text-base text-zinc-100 font-mono truncate">
                                <AnimatedNumber value={previstoAjustado} format="currency" />
                              </p>
                              {storeAllJustified > 0 ? (
                                <span className="text-[10px] text-blue-400 mt-1 block font-medium">
                                  -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(storeAllJustified)} just.
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 mt-1 block">
                                  Faturamento apurado
                                </span>
                              )}
                            </div>

                            {/* 6. Diferença */}
                            <div className={`p-2.5 rounded-xl border ${
                              isDiferencaOk
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-rose-950/20 border-rose-500/30'
                            }`}>
                              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                                isDiferencaOk ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                DIFERENÇA
                              </span>
                              <p className={`font-bold text-sm sm:text-base font-mono truncate ${
                                isDiferencaOk ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                <AnimatedNumber value={diferencaCalculada} format="currency" />
                              </p>
                              <span className={`text-[10px] mt-1 block font-semibold ${
                                isDiferencaOk ? 'text-emerald-500' : 'text-rose-400'
                              }`}>
                                {isDiferencaOk ? '✓ Aprovado' : '⚠ Divergência'}
                              </span>
                            </div>

                          </div>

                        </div>
                      </Link>
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
      </div>
    </AppShell>
  );
}
