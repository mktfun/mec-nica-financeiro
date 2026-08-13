import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStores } from '@/hooks/useStores';
import { useBackendConciliacao, useGlobalOfxOut } from '@/hooks/useBackendConciliacao';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { BreakdownModal } from '@/components/conciliacao/BreakdownModal';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/conciliacao/')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [breakdownStore, setBreakdownStore] = useState<{ id: string; name: string } | null>(null);

  const { data: availableDates = [], isLoading: loadingDates } = useAvailableConciliacaoDates();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: logsData = [], isLoading: loadingLogs } = useBackendConciliacao(selectedDate);
  const { data: globalOfxOut = 0, isLoading: loadingOfxOut } = useGlobalOfxOut(selectedDate);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    } else if (!selectedDate && !loadingDates) {
      setSelectedDate(new Date().toISOString().substring(0, 10));
    }
  }, [availableDates, loadingDates, selectedDate]);

  const isLoading = loadingStores || loadingLogs || loadingOfxOut || loadingDates || !selectedDate;

  const resultado = logsData.reduce((acc, log) => acc + log.diferenca, 0);
  const isApproved = logsData.every(log => log.status === 'approved');

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

  const totalSistema = logsData.reduce((acc, log) => acc + log.previsto_ofx, 0);
  const totalBancarioIn = logsData.reduce((acc, log) => acc + log.faturamento_banco, 0);
  const totalBancarioRaw = totalBancarioIn;
  const divergenciaGlobal = resultado;

  // Buscar taxas reais da maquininha por loja para a data selecionada
  const { data: feesByStore = {} } = useQuery({
    queryKey: ['fees-by-store', selectedDate],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!selectedDate) return {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('pos_transactions')
        .select('store_id, fee_amount')
        .eq('target_date', selectedDate);
      if (error || !data) return {};
      return (data as { store_id: string; fee_amount: number }[]).reduce(
        (acc: Record<string, number>, row) => {
          acc[row.store_id] = (acc[row.store_id] || 0) + Number(row.fee_amount || 0);
          return acc;
        },
        {}
      );
    },
    enabled: !!selectedDate,
  });


  const storesState: StoreSaldoState[] = stores.map(s => {
    const log = logsData.find(l => l.store_id === s.id);
    return {
      store_id: s.id,
      store_name: s.name,
      saldo_banco_itau: log?.faturamento_banco || 0,
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
      juros_atual: feesByStore[s.id] || 0,  // FIX: antes era hardcode 0
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
            {/* O Hero Card Unificado */}
            <ResumoDiaPanel 
              selectedDate={selectedDate}
              onDayChange={handleDayChange}
              onDateSelect={setSelectedDate}
              divergenciaGlobal={divergenciaGlobal}
              isApproved={isApproved}
              detalhesCount={logsData.length}
              totalSistema={totalSistema}
              totalBancarioIn={totalBancarioIn}
              totalBancarioRaw={totalBancarioRaw}
              totalOfxIn={totalBancarioIn}
              totalOfxOut={globalOfxOut}
              storesData={storesState}
              availableDates={availableDates}
            />

            {/* Lista de Lojas Visual Original */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Store size={18} className="text-[var(--color-primary)]" />
                Fechamento por Loja
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map((store) => {
                  const log = logsData.find(l => l.store_id === store.id) || {
                    faturamento_banco: 0,
                    maquininha: 0,
                    pix: 0,
                    na_loja_os: 0,
                    previsto_ofx: 0,
                    diferenca: 0,
                    status: 'pending'
                  };

                  const isDiferencaOk = log.status === 'approved';

                  return (
                    <div key={store.id} className="relative group">
                      <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }} className="block">
                        <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-md">
                          
                          {/* Nome da Loja & Status */}
                          <div className="w-full xl:w-56 shrink-0 flex items-center gap-4">
                            <div className={`w-2 h-14 rounded-full ${isDiferencaOk ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
                              <div>
                                <p className="font-semibold text-base sm:text-lg text-white leading-tight">{store.name}</p>
                                <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">ID: {store.id}</p>
                              </div>
                            </div>

                          {/* Painel Único de Fundo Contínuo Envelopando as 6 Métricas */}
                          <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
                              
                              {/* 1. Faturam. Banco (OFX) */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Saldo Banco Itaú
                                </span>
                                <p className="font-bold text-sm text-[var(--text-secondary)] font-mono">
                                  <AnimatedNumber value={log.faturamento_banco} format="currency" />
                                </p>
                              </div>

                              {/* 2. Maquininha */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Maquininha
                                </span>
                                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                                  <AnimatedNumber value={log.maquininha} format="currency" />
                                </p>
                              </div>

                              {/* 3. PIX */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  PIX
                                </span>
                                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                                  <AnimatedNumber value={log.pix} format="currency" />
                                </p>
                              </div>

                              {/* 4. Na Loja OS */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Na Loja OS
                                </span>
                                <p className="font-bold text-sm text-[var(--color-accent-warning)] font-mono">
                                  <AnimatedNumber value={log.na_loja_os} format="currency" />
                                </p>
                              </div>

                              {/* 5. Previsto */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                                  Previsto
                                </span>
                                <p className="font-bold text-sm text-[var(--text-primary)] font-mono">
                                  <AnimatedNumber value={log.previsto_ofx} format="currency" />
                                </p>
                              </div>

                              {/* 6. Diferença */}
                              <div className="xl:border-l xl:border-white/10 xl:pl-6">
                                <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                                  isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                                }`}>
                                  Diferença
                                </span>
                                <p className={`font-bold text-sm font-mono ${isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                                  <AnimatedNumber value={log.diferenca} format="currency" />
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
                        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--bg-canvas)]/80 border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]/40 transition-all opacity-0 group-hover:opacity-100"
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
      </div>
    </AppShell>
  );
}
