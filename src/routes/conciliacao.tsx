import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, ArrowRight, TrendingUp, CalendarDays, Wallet, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoDiaria, useSaveDailyCash } from '@/hooks/useConciliacao';
import { useTransactionsPorDataELoja } from '@/hooks/useTransactions';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate());
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: conciliacaoData = {}, isLoading: loadingDiaria } = useConciliacaoDiaria(selectedDate);
  
  const isLoading = loadingStores || loadingDiaria;
  
  // Set first store as selected if none is selected
  if (!isLoading && stores.length > 0 && !selectedStoreId) {
    setSelectedStoreId(stores[0].id);
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const storeData = selectedStoreId ? conciliacaoData[selectedStoreId] : null;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header - Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Fechamento de Caixa</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">Valide as transações e o físico loja a loja.</p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 rounded-lg shadow-sm">
            <CalendarDays size={18} className="text-[var(--color-primary)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <LoadingSpinner size="md" text="Carregando dados das lojas..." />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Lado Esquerdo - Master (Lista de Lojas) */}
            <div className="lg:w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 pb-8">
              <h2 className="font-semibold text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-2">Unidades ({stores.length})</h2>
              {stores.map((store) => {
                const data = conciliacaoData[store.id];
                const status = data?.status || 'pending';
                const isActive = selectedStoreId === store.id;

                return (
                  <motion.div
                    key={store.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`cursor-pointer rounded-xl p-4 transition-all duration-300 border relative overflow-hidden ${
                      isActive 
                        ? 'bg-[var(--bg-surface-elevated)] border-[var(--color-primary)] shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.15)]' 
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]" />
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-semibold ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}>{store.name}</h3>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1.5">
                           Faturado: <AnimatedNumber value={data?.financial_total || 0} format="currency" />
                        </div>
                      </div>
                      <div>
                        {status === 'approved' && <Badge variant="success" className="text-[10px]">✓ OK</Badge>}
                        {status === 'divergence' && <Badge variant="danger" className="text-[10px]">⚠ Divergência</Badge>}
                        {status === 'pending' && <Badge variant="warning" className="text-[10px]">• Pendente</Badge>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Lado Direito - Detail (Transações e Caixa) */}
            <div className="lg:w-2/3 flex flex-col h-full overflow-y-auto pb-8">
              {selectedStore && storeData && (
                <StoreDetailPane 
                  store={selectedStore} 
                  storeData={storeData} 
                  date={selectedDate} 
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// StoreDetailPane component to handle the Right Side (Details)
function StoreDetailPane({ store, storeData, date }: { store: any, storeData: any, date: string }) {
  const { data: transactions = [], isLoading: loadingTx } = useTransactionsPorDataELoja(date, store.id);
  const { mutate: saveDailyCash } = useSaveDailyCash();
  const [cashValue, setCashValue] = useState(storeData.daily_cash ? storeData.daily_cash.toString() : '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCash = () => {
    const numValue = parseFloat(cashValue.replace(',', '.'));
    if (!isNaN(numValue) && numValue >= 0) {
      setIsSaving(true);
      saveDailyCash(
        { storeId: store.id, value: numValue, date },
        { 
          onSettled: () => setIsSaving(false)
        }
      );
    }
  };

  const hasCashExpected = storeData.expects_cash === true;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={store.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6"
      >
        <Card variant="glass" className="p-6 border-[var(--border-strong)] relative overflow-hidden">
           {/* Liquid glass effect background element */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
           
           <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div>
               <h2 className="text-2xl font-display font-bold text-white">{store.name}</h2>
               <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-secondary)]">
                 <span className="flex items-center gap-1"><CalendarDays size={14}/> {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                 <span>•</span>
                 <span>{transactions.length} transações</span>
               </div>
             </div>
             
             <div className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Faturado Hoje</span>
                <span className="text-2xl font-mono font-bold text-[var(--color-primary)]">
                  <AnimatedNumber value={storeData.financial_total || 0} format="currency" />
                </span>
             </div>
           </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Transações */}
          <div className="flex flex-col gap-3">
             <h3 className="font-semibold text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
               <TrendingUp size={16} /> Movimentação do Dia
             </h3>
             
             {loadingTx ? (
               <div className="h-32 animate-pulse bg-[var(--bg-surface-elevated)] rounded-xl" />
             ) : transactions.length === 0 ? (
               <div className="text-center p-8 text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-xl text-sm">
                 Nenhuma transação registrada nesta data.
               </div>
             ) : (
               <div className="space-y-2">
                 {transactions.map(tx => (
                   <div key={tx.id} className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'in' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]'}`}>
                         {tx.type === 'in' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                       </div>
                       <div>
                         <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{tx.title}</p>
                         <p className="text-[10px] text-[var(--text-tertiary)] uppercase mt-0.5">{tx.payment_method || 'N/A'}</p>
                       </div>
                     </div>
                     <span className={`font-mono font-bold text-sm ${tx.type === 'in' ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
                       {tx.type === 'in' ? '+' : '-'} R$ {Number(tx.amount || 0).toFixed(2).replace('.', ',')}
                     </span>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Coluna 2: Dinheiro em Caixa e Resumo */}
          <div className="flex flex-col gap-4">
             <h3 className="font-semibold text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
               <Wallet size={16} /> Fechamento de Gaveta
             </h3>

             {hasCashExpected ? (
                <Card className="bg-[var(--bg-surface-elevated)] border-[var(--color-primary)]/30 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.05)]">
                  <div className="mb-4">
                    <h4 className="font-medium text-white text-sm">Dinheiro Físico</h4>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Houve movimentação ou há pendências em espécie para hoje nesta loja. Informe o valor contado na gaveta.</p>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[var(--text-secondary)] font-mono text-lg">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={cashValue}
                      onChange={(e) => setCashValue(e.target.value)}
                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-lg text-white font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                    />
                  </div>

                  <button 
                    onClick={handleSaveCash}
                    disabled={isSaving}
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <LoadingSpinner size="sm" text="Salvando..." /> : 'Gravar Físico'}
                  </button>

                  {storeData.status === 'divergence' && (
                    <div className="mt-4 p-3 bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/20 rounded-lg flex items-start gap-2">
                      <AlertCircle size={16} className="text-[var(--color-accent-danger)] mt-0.5 shrink-0" />
                      <div className="text-xs text-[var(--color-accent-danger)]">
                        <strong>Divergência detectada!</strong> O valor físico difere do financeiro no sistema em R$ {Math.abs(storeData.divergence).toFixed(2).replace('.', ',')}.
                      </div>
                    </div>
                  )}
                  {storeData.status === 'approved' && (
                    <div className="mt-4 p-3 bg-[var(--color-accent-teal)]/10 border border-[var(--color-accent-teal)]/20 rounded-lg flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--color-accent-teal)] shrink-0" />
                      <div className="text-xs text-[var(--color-accent-teal)]">
                        <strong>Caixa batido!</strong> O físico bate perfeitamente com o financeiro.
                      </div>
                    </div>
                  )}
                </Card>
             ) : (
                <Card className="bg-[var(--bg-canvas)] border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center p-8 text-center">
                   <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-elevated)] flex items-center justify-center mb-3 text-[var(--text-tertiary)]">
                     <Wallet size={20} />
                   </div>
                   <h4 className="font-medium text-white text-sm mb-1">Sem Operações em Dinheiro</h4>
                   <p className="text-xs text-[var(--text-tertiary)] max-w-[200px] mx-auto">
                     O sistema não detectou OS abertas aguardando espécie ou recebimentos em dinheiro hoje. O input de gaveta está oculto.
                   </p>
                </Card>
             )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
