import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, AlertCircle, X, ChevronRight, Store, CircleDashed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoDiaria, useSaveDailyCash } from '@/hooks/useConciliacao';
import { useTransactionsPorDataELoja, useWeeklyRevenueTrend } from '@/hooks/useTransactions';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate());
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: conciliacaoData = {}, isLoading: loadingDiaria } = useConciliacaoDiaria(selectedDate);
  const { data: trendData = [] } = useWeeklyRevenueTrend();
  
  const isLoading = loadingStores || loadingDiaria;
  
  const totalFaturadoHoje = stores.reduce((acc, store) => {
    return acc + (conciliacaoData[store.id]?.financial_total || 0);
  }, 0);

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const storeData = selectedStoreId ? conciliacaoData[selectedStoreId] : null;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Revolut Hero Section */}
        <div className="relative w-full rounded-[32px] bg-[#0A0A0A] overflow-hidden border border-white/5 shrink-0 flex flex-col justify-between pt-8 h-[280px]">
           {/* Date Picker no canto direito absoluto */}
           <div className="absolute top-6 right-6 z-20">
             <div className="flex items-center gap-2 bg-[#1A1A1A] border border-white/10 px-4 py-2 rounded-full shadow-sm hover:bg-[#222] transition-colors">
               <input
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
               />
             </div>
           </div>

           <div className="px-8 z-10">
             <p className="text-white/50 text-sm font-medium tracking-wide uppercase">Faturado Hoje</p>
             <h1 className="text-5xl md:text-6xl font-bold text-white mt-1 font-display tracking-tight">
               <AnimatedNumber value={totalFaturadoHoje} format="currency" />
             </h1>
             <div className="mt-6 flex gap-3">
                <button className="bg-[#CCFF00] hover:bg-[#b8e600] text-black font-semibold rounded-full px-6 py-2.5 text-sm transition-colors shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                  Ver Relatório
                </button>
                <button className="bg-[#1A1A1A] hover:bg-[#222] text-white border border-white/10 font-medium rounded-full px-6 py-2.5 text-sm transition-colors">
                  Exportar
                </button>
             </div>
           </div>

           {/* Seamless Line Chart Background */}
           <div className="absolute bottom-0 left-0 right-0 h-[120px] opacity-70 pointer-events-none">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={trendData}>
                 <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#CCFF00" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#CCFF00" stopOpacity={1} />
                      <stop offset="100%" stopColor="#CCFF00" stopOpacity={0.3} />
                    </linearGradient>
                 </defs>
                 <Line 
                   type="monotone" 
                   dataKey="value" 
                   stroke="url(#colorTrend)" 
                   strokeWidth={3} 
                   dot={false}
                   isAnimationActive={true}
                 />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Lista de Unidades Estilo Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-8 scrollbar-hide">
          <div className="flex justify-between items-end mb-4 px-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Unidades</h2>
            <span className="text-white/50 text-sm">{stores.length} ativas</span>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <LoadingSpinner size="md" text="Sincronizando..." />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stores.map((store) => {
                const data = conciliacaoData[store.id];
                const status = data?.status || 'pending';
                const faturado = data?.financial_total || 0;
                const expectsCash = data?.expects_cash;
                
                return (
                  <motion.div
                    key={store.id}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedStoreId(store.id)}
                    className="flex items-center justify-between bg-[#111] hover:bg-[#1A1A1A] rounded-[24px] p-4 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 
                          ${status === 'approved' ? 'bg-[#CCFF00]/10 text-[#CCFF00]' : 
                            status === 'divergence' ? 'bg-red-500/10 text-red-500' : 
                            'bg-white/5 text-white/50'}`}>
                         {status === 'approved' ? <CheckCircle2 size={24} /> : 
                          status === 'divergence' ? <AlertCircle size={24} /> : 
                          <CircleDashed size={24} />}
                       </div>
                       <div>
                         <h3 className="font-semibold text-lg text-white">{store.name}</h3>
                         <p className="text-white/50 text-xs">Atualizado hoje</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-end">
                         <span className="font-mono text-base font-medium text-white">
                           {faturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </span>
                         {expectsCash && (
                            <span className="flex items-center gap-1.5 text-[#CCFF00] text-[10px] uppercase font-bold tracking-wider mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse shadow-[0_0_5px_#CCFF00]" />
                              Requer Ação
                            </span>
                         )}
                       </div>
                       <ChevronRight size={20} className="text-white/20" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Lateral (Revolut Style) */}
        <AnimatePresence>
          {selectedStoreId && selectedStore && storeData && (
            <>
              {/* Overlay Escuro */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedStoreId(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              
              {/* Painel Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0A0A0A] z-50 flex flex-col shadow-2xl rounded-l-[32px] md:rounded-l-[40px] overflow-hidden border-l border-white/10"
              >
                <RevolutDrawerContent 
                  store={selectedStore} 
                  storeData={storeData} 
                  date={selectedDate} 
                  onClose={() => setSelectedStoreId(null)} 
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}

// Drawer Content Refatorado
function RevolutDrawerContent({ store, storeData, date, onClose }: { store: any, storeData: any, date: string, onClose: () => void }) {
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
        { onSettled: () => setIsSaving(false) }
      );
    }
  };

  const hasCashExpected = storeData.expects_cash === true;
  
  return (
    <div className="flex flex-col h-full relative">
       {/* Hero do Drawer */}
       <div className="bg-[#CCFF00] p-6 pb-8 text-black shrink-0 relative">
          <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors">
             <X size={20} />
          </button>
          
          <div className="mt-12">
            <p className="text-black/60 text-sm font-semibold uppercase tracking-wider mb-1">{store.name}</p>
            <h2 className="text-4xl font-bold font-display tracking-tight">
               <AnimatedNumber value={storeData.financial_total || 0} format="currency" />
            </h2>
          </div>
       </div>

       {/* Corpo: Transações */}
       <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0A] -mt-4 rounded-t-[32px] relative z-10">
          <h3 className="text-white/80 font-bold text-lg mb-4">Movimentações</h3>
          
          {loadingTx ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">Nenhuma transação encontrada.</div>
          ) : (
            <div className="space-y-1 pb-32">
               {transactions.map((tx: any) => (
                 <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                         <Store size={18} className={tx.type === 'in' ? 'text-white' : 'text-white/50'} />
                       </div>
                       <div>
                         <p className="text-sm font-medium text-white line-clamp-1">{tx.title}</p>
                         <p className="text-xs text-white/50">{tx.payment_method || 'N/A'}</p>
                       </div>
                    </div>
                    <span className={`font-mono text-sm font-medium ${tx.type === 'in' ? 'text-white' : 'text-white/60'}`}>
                       {tx.type === 'in' ? '+' : '-'} R$ {Number(tx.amount || 0).toFixed(2).replace('.', ',')}
                    </span>
                 </div>
               ))}
            </div>
          )}
       </div>

       {/* Smart Cash Footer (Sticky Liquid Glass) */}
       {hasCashExpected && (
         <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent pointer-events-none z-20">
            <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 p-5 rounded-[32px] pointer-events-auto shadow-2xl">
               <div className="flex justify-between items-center mb-3">
                 <span className="text-white font-medium">Caixa Físico</span>
                 {storeData.status === 'divergence' && <span className="text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded-full">Divergência</span>}
                 {storeData.status === 'approved' && <span className="text-[#CCFF00] text-xs font-bold bg-[#CCFF00]/10 px-2 py-1 rounded-full">Batido</span>}
               </div>
               
               <div className="flex items-center gap-2">
                 <div className="flex-1 bg-black/50 border border-white/10 rounded-full px-5 py-3 flex items-center gap-2">
                   <span className="text-white/50 font-mono">R$</span>
                   <input
                     type="text"
                     placeholder="0,00"
                     value={cashValue}
                     onChange={(e) => setCashValue(e.target.value)}
                     className="bg-transparent text-white font-mono font-medium text-lg focus:outline-none w-full"
                   />
                 </div>
                 <button 
                   onClick={handleSaveCash}
                   disabled={isSaving}
                   className="bg-[#CCFF00] hover:bg-[#b8e600] text-black w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                 >
                   {isSaving ? <LoadingSpinner size="sm" /> : <ChevronRight size={24} />}
                 </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
