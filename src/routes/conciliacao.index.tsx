import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Store, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes } from '@/hooks/useConciliacao';
import { useDailySystemBalance, useDailyBankBalance } from '@/hooks/useTransactions';
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

  const isLoading = loadingStores || loadingResumo || loadingDetalhes || loadingBalances || loadingBankBalances;

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
    return {
      store_id: s.id,
      store_name: s.name,
      saldo_banco_itau_ofx: bankIn,
      faturamento_sistema: sys,
      dinheiro_mp_manual: 0,
      a_receber_pendente: 0,
      na_loja_os_patio: 0,
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
            {/* O Hero Card Unificado com Design Restaurado */}
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

            {/* Lista de Lojas com Micro-animações e Hover Lift 3D */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold font-display flex items-center gap-2 text-[var(--text-primary)]">
                  <Store size={20} className="text-[var(--color-primary)]" />
                  Fechamento Individual por Loja (Módulo 1)
                </h3>
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {stores.length} Unidades Operacionais
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map((store, index) => {
                  const sys = dailyBalances?.[store.id] || 0;
                  const bankIn = bankBalances?.[store.id]?.in || 0;
                  const div = sys - bankIn;
                  const isStoreOk = Math.abs(div) < 0.01;

                  return (
                    <motion.div
                      key={store.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.05 }}
                    >
                      <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }} className="block group">
                        <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all duration-300 hover:scale-[1.012] hover:bg-[var(--bg-surface-elevated)]/90 hover:border-white/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] cursor-pointer border border-white/10 backdrop-blur-md rounded-2xl relative overflow-hidden">
                          
                          {/* Efeito Feixe de Brilho no Hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                          {/* Nome da Loja & Status Indicator Pill */}
                          <div className="flex items-center gap-4 min-w-[220px] relative z-10">
                            <div className={`w-2.5 h-12 rounded-full shadow-md transition-transform group-hover:scale-y-110 ${
                              isStoreOk 
                                ? 'bg-[var(--color-accent-teal)] shadow-[0_0_12px_rgba(0,168,126,0.5)]' 
                                : 'bg-[var(--color-accent-danger)] shadow-[0_0_12px_rgba(226,59,74,0.5)]'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-base text-[var(--text-primary)] font-display group-hover:text-[var(--color-primary-bright)] transition-colors">
                                  {store.name}
                                </p>
                                <ChevronRight size={16} className="text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                              </div>
                              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">ID: {store.id}</span>
                            </div>
                          </div>

                          {/* Régua das 6 Colunas do Módulo 1 */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 bg-[var(--bg-canvas)]/70 p-4 rounded-xl border border-[var(--border-subtle)] flex-1 font-sans tabular-nums text-xs relative z-10 shadow-inner">
                            
                            {/* 1. Banco Itaú */}
                            <div>
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Banco Itaú</p>
                              <p className="font-bold text-[var(--color-accent-light-blue)]">
                                <AnimatedNumber value={bankIn} format="currency" />
                              </p>
                            </div>

                            {/* 2. Dinheiro MP */}
                            <div>
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Dinheiro MP</p>
                              <p className="font-bold text-[var(--color-accent-teal)]">
                                <AnimatedNumber value={0} format="currency" />
                              </p>
                            </div>

                            {/* 3. A Receber */}
                            <div>
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">A Receber</p>
                              <p className="font-bold text-[var(--color-primary)]">
                                <AnimatedNumber value={0} format="currency" />
                              </p>
                            </div>

                            {/* 4. Na Loja OS */}
                            <div>
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Na Loja OS</p>
                              <p className="font-bold text-[var(--color-accent-warning)]">
                                <AnimatedNumber value={0} format="currency" />
                              </p>
                            </div>

                            {/* 5. Saldo Total */}
                            <div>
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Saldo Total</p>
                              <p className="font-bold text-[var(--text-primary)]">
                                <AnimatedNumber value={sys} format="currency" />
                              </p>
                            </div>

                            {/* 6. Resultado Final */}
                            <div className="text-right border-l border-[var(--border-subtle)] pl-3">
                              <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans font-bold">Resultado Final</p>
                              <p className={`font-bold text-sm ${isStoreOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                                <AnimatedNumber value={div} format="currency" />
                              </p>
                            </div>

                          </div>
                        </Card>
                      </Link>
                    </motion.div>
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
