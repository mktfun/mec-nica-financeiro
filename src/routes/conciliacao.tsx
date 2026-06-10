import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, CalendarDays, Store, AlertTriangle, ChevronRight, CreditCard, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes, useSaveDailyCash } from '@/hooks/useConciliacao';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate());

  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: resumo, isLoading: loadingResumo, refetch: refetchResumo } = useConciliacaoResumo(selectedDate);
  const { data: detalhes = [], isLoading: loadingDetalhes, refetch: refetchDetalhes } = useConciliacaoDetalhes(selectedDate);

  const { mutate: saveDailyCash } = useSaveDailyCash();
  
  const [cashValues, setCashValues] = useState<Record<string, string>>({});

  const isLoading = loadingStores || loadingResumo || loadingDetalhes;

  const resultado = resumo?.totalDivergence || 0;
  const isApproved = resultado === 0 && (resumo?.approved || 0) > 0;
  
  const handleSaveCash = (storeId: string) => {
    const valueStr = cashValues[storeId];
    if (!valueStr) return;
    const numValue = parseFloat(valueStr.replace(',', '.'));
    if (!isNaN(numValue) && numValue >= 0) {
      saveDailyCash({ storeId, value: numValue, date: selectedDate });
      setCashValues(prev => {
        const next = { ...prev };
        delete next[storeId];
        return next;
      });
    }
  };

  const handleDayChange = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  const totalFisico = detalhes.reduce((acc, r) => acc + (r.daily_cash || 0), 0);
  const totalMaquininha = detalhes.reduce((acc, r) => acc + (r.machine_total || 0), 0);
  const totalSistema = detalhes.reduce((acc, r) => acc + (r.financial_total || 0), 0);
  const divergenciaGlobal = totalSistema - (totalFisico + totalMaquininha);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-5xl mx-auto pb-20">
        
        {/* Header: Title and Date Navigator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface-elevated)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Conciliação Diária</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Fechamento de caixa unificado e apuração de divergências físicas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDayChange(-1)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-secondary)]"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-2 rounded-xl">
                <CalendarDays size={16} className="text-[var(--color-primary)]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <button 
                onClick={() => handleDayChange(1)}
                disabled={selectedDate === getDefaultDate()}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="md" text="Carregando resultados do dia..." />
          </div>
        ) : (
          <>
            {/* Status Global */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-md transition-colors duration-500 ${
                isApproved && divergenciaGlobal === 0 && detalhes.length > 0
                  ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30 shadow-[0_0_40px_-10px_var(--color-accent-teal)]'
                  : divergenciaGlobal !== 0
                  ? 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30 shadow-[0_0_40px_-10px_var(--color-accent-danger)]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isApproved && divergenciaGlobal === 0 && detalhes.length > 0 ? 'bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)]' : divergenciaGlobal !== 0 ? 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]' : 'bg-white/10 text-white/60'}`}>
                  {isApproved && divergenciaGlobal === 0 && detalhes.length > 0 ? <CheckCircle2 size={32} /> : divergenciaGlobal !== 0 ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isApproved && divergenciaGlobal === 0 && detalhes.length > 0 ? 'Caixas Batidos com Sucesso' : divergenciaGlobal !== 0 ? 'Divergência Encontrada no Dia' : 'Aguardando Fechamento'}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {divergenciaGlobal !== 0 
                      ? 'O total arrecadado no sistema não confere com a soma de (Físico + Maquininha).'
                      : 'Todos os valores declarados e importados batem com as transações registradas.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-right flex-wrap md:flex-nowrap">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Apurado Sistema</p>
                  <p className="text-xl font-display font-bold"><AnimatedNumber value={totalSistema} format="currency" /></p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Declarado Físico</p>
                  <p className="text-xl font-display font-bold"><AnimatedNumber value={totalFisico} format="currency" /></p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-primary)] uppercase tracking-wider mb-1">Total Maquininhas</p>
                  <p className="text-xl font-display font-bold text-[var(--color-primary)]"><AnimatedNumber value={totalMaquininha} format="currency" /></p>
                </div>
              </div>
            </motion.div>

            {/* Lista de Lojas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Store size={18} className="text-[var(--color-primary)]" />
                Fechamento por Loja
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {stores.map(store => {
                  const rec = detalhes.find(r => r.store_id === store.id);
                  const sys = rec?.financial_total || 0;
                  const fis = rec?.daily_cash || 0;
                  const maq = rec?.machine_total || 0;
                  const div = sys - (fis + maq);
                  
                  const hasDeclarations = (rec?.daily_cash !== undefined && rec?.daily_cash !== null) || (rec?.machine_total !== undefined && rec?.machine_total !== null);
                  const isStoreOk = hasDeclarations && Math.abs(div) < 0.01;
                  const isStoreDivergent = hasDeclarations && Math.abs(div) >= 0.01;

                  return (
                    <Card key={store.id} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:border-white/20 transition-colors">
                      <div className="flex-1 flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${isStoreOk ? 'bg-[var(--color-accent-teal)]' : isStoreDivergent ? 'bg-[var(--color-accent-danger)]' : 'bg-white/10'}`} />
                        <div>
                          <p className="font-semibold text-lg">{store.name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">ID: {store.id}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 bg-black/20 p-4 rounded-xl border border-white/5 flex-1 xl:flex-none justify-between xl:justify-start">
                        <div className="min-w-[120px]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Sistema (Cartão+Din)</p>
                          <p className="font-display font-medium text-[var(--text-secondary)]"><AnimatedNumber value={sys} format="currency" /></p>
                        </div>
                        
                        <div className="min-w-[130px]">
                          <p className="text-[10px] text-[var(--color-primary)] opacity-80 uppercase tracking-wider mb-1">Apurado Maquininha</p>
                          <p className="font-display font-medium text-white"><AnimatedNumber value={maq} format="currency" /></p>
                        </div>

                        <div className="min-w-[140px]">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Declarado Físico (R$)</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={fis.toFixed(2)}
                              value={cashValues[store.id] !== undefined ? cashValues[store.id] : ''}
                              onChange={(e) => setCashValues({ ...cashValues, [store.id]: e.target.value })}
                              className="w-24 bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            />
                            {cashValues[store.id] !== undefined && cashValues[store.id] !== '' && (
                              <button 
                                onClick={() => handleSaveCash(store.id)}
                                className="text-xs bg-[var(--color-primary)] text-white px-2 py-1 rounded hover:opacity-90 font-medium"
                              >
                                Salvar
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="min-w-[120px] text-right">
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Divergência</p>
                          <p className={`font-display font-bold ${!hasDeclarations ? 'text-white/30' : isStoreOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                            {!hasDeclarations ? '-' : <AnimatedNumber value={div} format="currency" />}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Removed BankReconciliationDashboard from here as per Spec 032 */}
      </div>
    </AppShell>
  );
}
