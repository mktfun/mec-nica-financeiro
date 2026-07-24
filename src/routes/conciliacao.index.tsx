import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store } from 'lucide-react';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes, useModulo1StoresData } from '@/hooks/useConciliacao';
import { useDailySystemBalance, useDailyBankBalance } from '@/hooks/useTransactions';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { Modulo1SaldoPanel } from '@/components/conciliacao/Modulo1SaldoPanel';

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

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-6xl mx-auto pb-20 pt-2">
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados da conciliação..." />
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
            />

            {/* Painel Módulo 1 — Aba SALDO (Saldos por Loja & Consolidado Planilha 2307) */}
            <Modulo1SaldoPanel 
              storesData={storesModulo1}
              selectedDate={selectedDate}
            />

            {/* Lista de Lojas */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-[var(--text-primary)] font-display">
                <Store size={18} className="text-[var(--color-primary)]" />
                Fechamento Individual por Loja
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map(store => {
                  const sys = dailyBalances?.[store.id] || 0;
                  const bankIn = bankBalances?.[store.id]?.in || 0;
                  const div = sys - bankIn;
                  
                  const hasDeclarations = true;
                  const isStoreOk = hasDeclarations && Math.abs(div) < 0.01;
                  const isStoreDivergent = hasDeclarations && Math.abs(div) >= 0.01;

                  return (
                    <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }} key={store.id} className="block">
                      <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/5 cursor-pointer border border-[var(--border-subtle)] backdrop-blur-md">
                        <div className="flex-1 flex items-center gap-4">
                          <div className={`w-2 h-12 rounded-full ${isStoreOk ? 'bg-[var(--color-accent-teal)]' : isStoreDivergent ? 'bg-[var(--color-accent-danger)]' : 'bg-white/10'}`} />
                          <div>
                            <p className="font-semibold text-lg text-[var(--text-primary)] font-display">{store.name}</p>
                            <p className="text-xs text-[var(--text-tertiary)] font-mono">ID: {store.id}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 bg-[var(--bg-canvas)] p-4 rounded-xl border border-[var(--border-subtle)] flex-1 xl:flex-none justify-between xl:justify-start">
                          <div className="min-w-[120px]">
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Sistema (Fechamento do Dia)</p>
                            <p className="font-display font-medium text-[var(--text-secondary)]"><AnimatedNumber value={sys} format="currency" /></p>
                          </div>
                          
                          <div className="min-w-[130px]">
                            <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider mb-1">Entradas OFX (Fechamento)</p>
                            <p className="font-display font-medium text-[var(--text-primary)]"><AnimatedNumber value={bankIn} format="currency" /></p>
                          </div>

                          <div className="min-w-[120px] text-right">
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Divergência (Fechamento)</p>
                            <p className={`font-display font-bold ${!hasDeclarations ? 'text-white/30' : isStoreOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                              {!hasDeclarations ? '-' : <AnimatedNumber value={div} format="currency" />}
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
