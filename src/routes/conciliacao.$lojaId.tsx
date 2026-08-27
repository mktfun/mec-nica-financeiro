import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Store, ArrowLeft, CreditCard, Landmark, Car, TableProperties } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { StoreCartaoMaquininhaView } from '@/components/conciliacao/StoreCartaoMaquininhaView';
import { StoreExtratoBancarioView } from '@/components/conciliacao/StoreExtratoBancarioView';
import { StoreOrdensServicoView } from '@/components/conciliacao/StoreOrdensServicoView';
import { ExtratosImportacaoModal } from '@/components/conciliacao/ExtratosImportacaoModal';

import { useTransactionsPorDataELoja } from '@/hooks/useTransactions';
import { useDailySnapshot } from '@/hooks/useDailySnapshot';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { LegacyOsTable } from '@/components/conciliacao/LegacyOsTable';
import { formatCurrency } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export const Route = createFileRoute('/conciliacao/$lojaId')({
  component: ConciliacaoLojaPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      date: search.date as string || undefined,
    };
  },
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

type TabType = 'cartao' | 'extrato' | 'os';

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon?: any; children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-5 py-3 border-b-2 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
        active 
          ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-500/5' 
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {Icon && <Icon size={16} className={active ? 'text-emerald-400' : 'text-zinc-500'} />}
      {children}
    </button>
  );
}

function ConciliacaoLojaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('cartao');
  const [isExtratosOpen, setIsExtratosOpen] = useState(false);
  const { lojaId } = useParams({ from: '/conciliacao/$lojaId' });
  const { date } = Route.useSearch();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  const { data: transactions = [] } = useTransactionsPorDataELoja(targetDate, lojaId);
  const { data: currentSnapshot } = useDailySnapshot(targetDate);
  const { data: dailySummary } = useDailyReconciliationSummary(targetDate);
  const storeRecon = dailySummary?.stores?.find(s => s.store_id === lojaId);
  
  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;

  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display">Loja não encontrada</h2>
          <Link to="/conciliacao" className="mt-4 text-emerald-400 hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  const totalJuros = transactions.filter(t => (t as any).source === 'rede_taxa').reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-6xl mx-auto">
        <div>
          <Link to="/conciliacao" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-3">
            <ArrowLeft size={14} /> Voltar para Fechamento
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {store.avatar_url ? (
                <img src={store.avatar_url} alt={store.name} className="w-14 h-14 rounded-2xl border border-zinc-800 bg-zinc-900 object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-lg font-mono">
                  {store.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display font-bold text-2xl text-zinc-100">Conciliação: {store.name}</h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-zinc-400 font-mono">Data alvo: {formatDate(targetDate)}</p>
                  {totalJuros > 0 && (
                    <Badge variant="danger" className="flex items-center gap-1 font-medium bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                      Taxas MDR: {formatCurrency(totalJuros)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsExtratosOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition-colors shadow-sm self-start sm:self-auto"
            >
              <TableProperties size={14} className="text-zinc-400" />
              📊 Extratos Brutos (Originais)
            </button>
            
            <ExtratosImportacaoModal 
              isOpen={isExtratosOpen}
              onClose={() => setIsExtratosOpen(false)}
              storeId={lojaId}
              storeName={store.name}
              targetDate={targetDate}
            />
          </div>
        </div>

        {/* Painel Executivo de Fechamento da Filial */}
        {storeRecon && (
          <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 font-sans tabular-nums text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
              {/* 1. Saldo Bancos + Cartões */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Saldo Bancos + Cartões
                </span>
                <p className={`font-bold text-sm font-mono ${(storeRecon.saldo_banco || 0) < 0 ? 'text-rose-400' : 'text-[var(--color-accent-light-blue)]'}`}>
                  <AnimatedNumber value={storeRecon.saldo_banco || 0} format="currency" />
                </p>
                <div className="text-[10px] text-zinc-500 mt-0.5 flex flex-col font-mono">
                  <span className={(storeRecon.saldo_banco_ofx || 0) < 0 ? 'text-rose-400/80 font-semibold' : ''}>
                    OFX: <AnimatedNumber value={storeRecon.saldo_banco_ofx ?? storeRecon.saldo_banco ?? 0} format="currency" />
                  </span>
                  {(storeRecon.nao_entrou_valor || 0) > 0 && (
                    <span className="text-amber-400 font-semibold">
                      + Maq: + {formatCurrency(storeRecon.nao_entrou_valor || 0)}
                    </span>
                  )}
                  {(storeRecon.dinheiro_loja || 0) > 0 && (
                    <span className="text-amber-300 font-semibold">
                      + Cofre: + {formatCurrency(storeRecon.dinheiro_loja || 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Maquininha */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Maquininha
                </span>
                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                  <AnimatedNumber value={storeRecon.maquininha || storeRecon.rede_liquido || 0} format="currency" />
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Líquido do dia
                </span>
              </div>

              {/* 3. PIX */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  PIX
                </span>
                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                  <AnimatedNumber value={storeRecon.pix || storeRecon.pix_os || 0} format="currency" />
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Identificado
                </span>
              </div>

              {/* 4. Na Loja OS */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Na Loja OS
                </span>
                <p className="font-bold text-sm text-amber-400 font-mono">
                  <AnimatedNumber value={storeRecon.na_loja_os || storeRecon.patio_os || 0} format="currency" />
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Pátio aberto
                </span>
              </div>

              {/* 5. Previsto */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Previsto
                </span>
                <p className="font-bold text-sm text-zinc-100 font-mono">
                  <AnimatedNumber value={storeRecon.previsto_ofx || ((storeRecon.maquininha || 0) + (storeRecon.pix || 0))} format="currency" />
                </p>
                <span className="text-[9px] text-zinc-500 block mt-0.5 font-medium">
                  Total Previsto
                </span>
              </div>

              {/* 6. Diferença & Status */}
              <div className="xl:border-l xl:border-white/10 xl:pl-6">
                <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  (storeRecon.diferenca || 0) === 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(storeRecon.diferenca || 0) === 0 ? 'Status' : 'Diferença'}
                </span>
                {(storeRecon.diferenca || 0) === 0 ? (
                  <Badge variant="success" className="text-xs">
                    100% Conciliado
                  </Badge>
                ) : (
                  <p className="font-bold text-sm text-red-400 font-mono">
                    <AnimatedNumber value={storeRecon.diferenca || 0} format="currency" />
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isMarcoZero ? (
          <div className="min-h-[400px]">
            <LegacyOsTable storeId={lojaId} date={targetDate} />
          </div>
        ) : (
          <>
            {/* Navegação entre as 3 Abas */}
            <div className="flex border-b border-zinc-800 overflow-x-auto hide-scrollbar">
              <TabBtn active={activeTab === 'cartao'} onClick={() => setActiveTab('cartao')} icon={CreditCard}>
                1. Cartão / Maquininha
              </TabBtn>
              <TabBtn active={activeTab === 'extrato'} onClick={() => setActiveTab('extrato')} icon={Landmark}>
                2. Extrato Bancário (OFX & PIX)
              </TabBtn>
              <TabBtn active={activeTab === 'os'} onClick={() => setActiveTab('os')} icon={Car}>
                3. Ordens de Serviço (OS & Pátio)
              </TabBtn>
            </div>

            {/* Conteúdo das Abas */}
            <div className="min-h-[400px] pt-2">
              {activeTab === 'cartao' && <StoreCartaoMaquininhaView storeId={lojaId} date={targetDate} />}
              {activeTab === 'extrato' && <StoreExtratoBancarioView storeId={lojaId} date={targetDate} />}
              {activeTab === 'os' && <StoreOrdensServicoView storeId={lojaId} date={targetDate} />}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
