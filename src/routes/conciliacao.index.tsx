import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store } from 'lucide-react';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes, useModulo1StoresData } from '@/hooks/useConciliacao';
import { useDailySystemBalance, useDailyBankBalance } from '@/hooks/useTransactions';
import { useBackgroundAiReconciler } from '@/hooks/useBackgroundAiReconciler';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { StoreSaldoState } from '@/lib/modulo1Calculations';

export const Route = createFileRoute('/conciliacao/')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate());

  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: resumo, isLoading: loadingResumo } = useConciliacaoResumo(selectedDate);
  const { data: detalhes = [], isLoading: loadingDetalhes } = useConciliacaoDetalhes(selectedDate);
  const { data: dailyBalances, isLoading: loadingBalances } = useDailySystemBalance(selectedDate);
  const { data: bankBalances, isLoading: loadingBankBalances } = useDailyBankBalance(selectedDate);
  const { data: modulo1StoresData = [], isLoading: loadingModulo1 } = useModulo1StoresData(selectedDate);

  // Ativa o Reconciliador de IA Headless em background para itens não pareados do dia
  const firstStoreId = stores[0]?.id || '';
  useBackgroundAiReconciler(firstStoreId, selectedDate, detalhes, [], []);

  const isLoading = loadingStores || loadingResumo || loadingDetalhes || loadingBalances || loadingBankBalances || loadingModulo1;

  const resultado = resumo?.totalDivergence || 0;
  const isApproved = resultado === 0 && (resumo?.approved || 0) > 0;

  const handleDayChange = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  const totalSistema = Object.values(dailyBalances || {}).reduce((acc, val) => acc + Number(val), 0);
  const totalBancarioIn = Object.values(bankBalances || {}).reduce((acc, val) => acc + (val.in || 0), 0);
  const totalBancarioRaw = Object.values(bankBalances || {}).reduce((acc, val) => acc + (val.rawBalance || 0), 0);
  const divergenciaGlobal = totalSistema - totalBancarioIn;

  const storesState: StoreSaldoState[] = stores.map(s => {
    const sys = dailyBalances?.[s.id] || 0;
    const bankIn = bankBalances?.[s.id]?.in || 0;
    const storeMod1 = modulo1StoresData.find(m => m.store_id === s.id);

    return {
      store_id: s.id,
      store_name: s.name,
      saldo_banco_itau: (storeMod1?.saldo_banco_itau || 0) > 0 ? storeMod1!.saldo_banco_itau : bankIn,
      limite_credito: (s as any).credit_limit || 0,
      cartao_entrou: storeMod1?.cartao_entrou || 0,
      cartao_nao_entrou: 0,
      dinheiro_loja: 0,
      dinheiro_mp_manual: undefined,
      a_receber: storeMod1?.a_receber || 0,
      na_loja_os: storeMod1?.na_loja_os || 0,
      faturamento_atual: sys || storeMod1?.faturamento_atual || 0,
      faturamento_anterior: (sys || storeMod1?.faturamento_atual || 0) * 0.9,
      seguro_sinistro: 0,
      juros_atual: 0,
      caixa_anterior: (s as any).previous_caixa || 0,
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
              detalhesCount={detalhes.length}
              totalSistema={totalSistema}
              totalBancarioIn={totalBancarioIn}
              totalBancarioRaw={totalBancarioRaw}
              storesData={storesState}
            />

            {/* Lista de Lojas Visual Original */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Store size={18} className="text-[var(--color-primary)]" />
                Fechamento por Loja
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map((store) => {
                  const sys = dailyBalances?.[store.id] || 0;
                  const bankIn = bankBalances?.[store.id]?.in || 0;
                  const div = sys - bankIn;
                  const isStoreOk = Math.abs(div) < 0.01;

                  return (
                    <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }} key={store.id} className="block">
                      <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-md">
                        
                        {/* Nome da Loja & Status Indicator */}
                        <div className="flex-1 flex items-center gap-4">
                          <div className={`w-2 h-12 rounded-full ${isStoreOk ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
                          <div>
                            <p className="font-semibold text-lg">{store.name}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">ID: {store.id}</p>
                          </div>
                        </div>

                        {/* Caixa Interna com as 6 Colunas do Módulo 1 */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 bg-black/20 p-4 rounded-xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
                          
                          {/* 1. Banco Itaú */}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans">Banco Itaú</p>
                            <p className="font-bold text-[var(--color-accent-light-blue)]">
                              <AnimatedNumber value={bankIn} format="currency" />
                            </p>
                          </div>

                          {/* 2. Dinheiro MP */}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans">Dinheiro MP</p>
                            <p className="font-bold text-[var(--color-accent-teal)]">
                              <AnimatedNumber value={0} format="currency" />
                            </p>
                          </div>

                          {/* 3. A Receber */}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans">A Receber</p>
                            <p className="font-bold text-[var(--color-primary)]">
                              <AnimatedNumber value={0} format="currency" />
                            </p>
                          </div>

                          {/* 4. Na Loja OS */}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans">Na Loja OS</p>
                            <p className="font-bold text-[var(--color-accent-warning)]">
                              <AnimatedNumber value={0} format="currency" />
                            </p>
                          </div>

                          {/* 5. Saldo Total */}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans">Saldo Total</p>
                            <p className="font-bold text-[var(--text-primary)]">
                              <AnimatedNumber value={sys} format="currency" />
                            </p>
                          </div>

                          {/* 6. Resultado Final */}
                          <div className="text-right border-l border-white/5 pl-3">
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1 font-sans font-bold">Resultado Final</p>
                            <p className={`font-bold ${isStoreOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                              <AnimatedNumber value={div} format="currency" />
                            </p>
                          </div>

                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
