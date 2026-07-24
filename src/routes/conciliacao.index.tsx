import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes, useModulo1StoresData } from '@/hooks/useConciliacao';
import { useDailySystemBalance, useDailyBankBalance } from '@/hooks/useTransactions';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { calculateModulo1Saldo } from '@/lib/modulo1Calculations';

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
  const { data: storesModulo1 = [], isLoading: loadingModulo1 } = useModulo1StoresData(selectedDate);

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

  const { storesCalculated } = calculateModulo1Saldo(storesModulo1);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-6xl mx-auto pb-20 pt-2">
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados da conciliação..." />
          </div>
        ) : (
          <>
            {/* O Hero Card Unificado da Conciliação */}
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
              storesData={storesModulo1}
            />

            {/* Lista de Fechamento por Loja */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)] font-display">
                  <Store size={20} className="text-[var(--color-primary)]" />
                  Fechamento Individual por Loja
                </h3>
                <span className="text-xs text-[var(--text-tertiary)] font-mono">
                  {stores.length} Lojas Cadastradas
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map(store => {
                  const calc = storesCalculated[store.id] || {
                    saldo_g13: 0,
                    dinheiro_mp_g14: 0,
                    a_receber_g15: 0,
                    na_loja_g16: 0,
                    saldo_total_g17: 0,
                    resultado_final_g31: 0
                  };

                  return (
                    <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }} key={store.id} className="block">
                      <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:bg-[var(--bg-surface-elevated)] cursor-pointer border border-[var(--border-subtle)] backdrop-blur-md shadow-xl group">
                        
                        {/* Nome da Loja & Status */}
                        <div className="flex items-center gap-4 min-w-[220px]">
                          <div className={`w-2 h-12 rounded-full ${calc.resultado_final_g31 >= 0 ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base text-[var(--text-primary)] font-display group-hover:text-[var(--color-primary)] transition-colors">
                                {store.name}
                              </p>
                              <ChevronRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">ID: {store.id}</span>
                          </div>
                        </div>

                        {/* Régua das 6 Colunas */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 bg-[var(--bg-canvas)] p-4 rounded-xl border border-[var(--border-subtle)] flex-1 font-mono text-xs">
                          
                          {/* 1. Banco Itaú */}
                          <div>
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Banco Itaú</p>
                            <p className="font-bold text-[var(--color-accent-light-blue)]">
                              <AnimatedNumber value={calc.saldo_g13} format="currency" />
                            </p>
                          </div>

                          {/* 2. Dinheiro MP */}
                          <div>
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Dinheiro MP</p>
                            <p className="font-bold text-[var(--color-accent-teal)]">
                              <AnimatedNumber value={calc.dinheiro_mp_g14} format="currency" />
                            </p>
                          </div>

                          {/* 3. A Receber */}
                          <div>
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">A Receber</p>
                            <p className="font-bold text-[var(--color-primary)]">
                              <AnimatedNumber value={calc.a_receber_g15} format="currency" />
                            </p>
                          </div>

                          {/* 4. Na Loja OS */}
                          <div>
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Na Loja OS</p>
                            <p className="font-bold text-[var(--color-accent-warning)]">
                              <AnimatedNumber value={calc.na_loja_g16} format="currency" />
                            </p>
                          </div>

                          {/* 5. Saldo Total */}
                          <div>
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Saldo Total</p>
                            <p className="font-bold text-[var(--text-primary)]">
                              <AnimatedNumber value={calc.saldo_total_g17} format="currency" />
                            </p>
                          </div>

                          {/* 6. Resultado Final */}
                          <div className="text-right border-l border-[var(--border-subtle)] pl-3">
                            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans font-bold">Resultado Final</p>
                            <p className={`font-bold text-sm ${calc.resultado_final_g31 >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                              <AnimatedNumber value={calc.resultado_final_g31} format="currency" />
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
