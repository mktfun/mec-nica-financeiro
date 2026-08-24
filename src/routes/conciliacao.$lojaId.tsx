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
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { useDailySnapshot } from '@/hooks/useDailySnapshot';
import { usePosTripleReconciliation } from '@/hooks/useBackendConciliacao';
import { LegacyOsTable } from '@/components/conciliacao/LegacyOsTable';
import { formatCurrency } from '@/lib/utils';


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
  const { data: tripleReconData } = usePosTripleReconciliation(targetDate);
  
  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;
  const storePos = tripleReconData?.stores?.find(s => s.store_id === lojaId);

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

        {/* Banner de Conciliação de Maquininha da Loja */}
        {storePos && (storePos.rede_liquido > 0 || storePos.ofx_maquininhas > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Vendas Rede (Líquido)</span>
              <p className="text-base font-bold font-mono text-zinc-100">
                {formatCurrency(storePos.rede_liquido)}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Bruto: {formatCurrency(storePos.rede_bruto)}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Creditado no OFX</span>
              <p className="text-base font-bold font-mono text-emerald-400">
                {formatCurrency(storePos.ofx_maquininhas)}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">{storePos.ofx_transacoes?.length || 0} lançamento(s)</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">A Compensar</span>
              <p className={`text-base font-bold font-mono ${storePos.nao_entrou_valor > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {storePos.nao_entrou_valor > 0 ? `+ ${formatCurrency(storePos.nao_entrou_valor)}` : 'R$ 0,00'}
              </p>
              <span className="text-[10px] text-zinc-500">Soma no Saldo</span>
            </div>

            <div className="space-y-0.5 flex flex-col justify-center items-start">
              <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Status de Compensação</span>
              {storePos.status_compensacao === 'entrou' && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ENTROU
                </span>
              )}
              {storePos.status_compensacao === 'parcial' && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PARCIAL
                </span>
              )}
              {storePos.status_compensacao === 'nao_entrou' && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  NÃO ENTROU
                </span>
              )}
              {storePos.status_compensacao === 'sem_movimento' && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-zinc-500 border border-zinc-800">
                  SEM MOVIMENTO
                </span>
              )}
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
