import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Store, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { OsVsRedeTable } from '@/components/conciliacao/OsVsRedeTable';
import { RedeVsOfxTable } from '@/components/conciliacao/RedeVsOfxTable';
import { PixVsOfxTable } from '@/components/conciliacao/PixVsOfxTable';
import { OfxSemMatchTable } from '@/components/conciliacao/OfxSemMatchTable';
import { ExtratosImportacaoModal } from '@/components/conciliacao/ExtratosImportacaoModal';
import { TableProperties } from 'lucide-react';

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

type TabType = 'os_rede' | 'rede_ofx' | 'pix_ofx' | 'ofx_sem_match' | 'alerts';

function TabBtn({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
        active 
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold' 
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
      }`}
    >
      {children}
    </button>
  );
}

function ConciliacaoLojaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('os_rede');
  const [isExtratosOpen, setIsExtratosOpen] = useState(false);
  const { lojaId } = useParams({ from: '/conciliacao/$lojaId' });
  const { date } = Route.useSearch();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  const { data: transactions = [] } = useTransactionsPorDataELoja(targetDate, lojaId);
  const { data: reconData } = useReconciliationViews(lojaId, targetDate);
  const { data: currentSnapshot } = useDailySnapshot(targetDate);
  const { data: tripleReconData } = usePosTripleReconciliation(targetDate);
  
  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;
  const storePos = tripleReconData?.stores?.find(s => s.store_id === lojaId);


  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display">Loja não encontrada</h2>
          <Link to="/conciliacao" className="mt-4 text-[var(--color-primary)] hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  const totalJuros = transactions.filter(t => (t as any).source === 'rede_taxa').reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-6xl mx-auto">
        <div>
          <Link to="/conciliacao" className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4">
            <ArrowLeft size={16} /> Voltar para Fechamento
          </Link>
          <div className="flex items-center gap-4">
            {store.avatar_url ? (
              <img src={store.avatar_url} alt={store.name} className="w-16 h-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xl">
                {store.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-3xl">Conciliação: {store.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-[var(--text-secondary)]">Data alvo: {formatDate(targetDate)}</p>
                {totalJuros > 0 && (
                  <Badge variant="danger" className="flex items-center gap-1 font-medium bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] border-[var(--color-accent-danger)]/30">
                    Juros/MDR: R$ {totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </div>
              
              <button
                onClick={() => setIsExtratosOpen(true)}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-medium text-zinc-200 transition-colors shadow-sm"
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
        </div>

        {/* Banner de Conciliação de Maquininha da Loja */}
        {storePos && (storePos.rede_liquido > 0 || storePos.ofx_maquininhas > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Vendas Rede (Líquido)</span>
              <p className="text-base font-bold font-mono text-zinc-100">
                {formatCurrency(storePos.rede_liquido)}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Bruto: {formatCurrency(storePos.rede_bruto)}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Creditado no OFX</span>
              <p className="text-base font-bold font-mono text-emerald-400">
                {formatCurrency(storePos.ofx_maquininhas)}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">{storePos.ofx_transacoes?.length || 0} lançamento(s)</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">A Compensar (Não Entrou)</span>
              <p className={`text-base font-bold font-mono ${storePos.nao_entrou_valor > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                {storePos.nao_entrou_valor > 0 ? `+ ${formatCurrency(storePos.nao_entrou_valor)}` : 'R$ 0,00'}
              </p>
              <span className="text-[10px] text-zinc-500">Soma no Saldo da Filial</span>
            </div>

            <div className="space-y-1 flex flex-col justify-center items-start">
              <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Status de Compensação</span>
              {storePos.status_compensacao === 'entrou' && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ENTROU
                </span>
              )}
              {storePos.status_compensacao === 'parcial' && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PARCIAL
                </span>
              )}
              {storePos.status_compensacao === 'nao_entrou' && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  NÃO ENTROU
                </span>
              )}
              {storePos.status_compensacao === 'sem_movimento' && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-zinc-500">
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
            <div className="flex border-b border-[var(--border-subtle)] mb-6 overflow-x-auto hide-scrollbar">
              <TabBtn active={activeTab === 'os_rede'} onClick={() => setActiveTab('os_rede')}>
                1. Cartão (OS → Maquininha)
              </TabBtn>
              <TabBtn active={activeTab === 'rede_ofx'} onClick={() => setActiveTab('rede_ofx')}>
                2. Maquininha (Líq) → Banco
              </TabBtn>
              <TabBtn active={activeTab === 'pix_ofx'} onClick={() => setActiveTab('pix_ofx')}>
                3. PIX (OS → Banco OFX)
              </TabBtn>
              <TabBtn active={activeTab === 'ofx_sem_match'} onClick={() => setActiveTab('ofx_sem_match')}>
                4. Entradas Avulsas / Outras
                {reconData?.ofxSemMatch && reconData.ofxSemMatch.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono font-bold">
                    {reconData.ofxSemMatch.length}
                  </span>
                )}
              </TabBtn>

            </div>

            <div className="min-h-[400px]">
              {activeTab === 'os_rede' && <OsVsRedeTable storeId={lojaId} date={targetDate} />}
              {activeTab === 'rede_ofx' && <RedeVsOfxTable storeId={lojaId} date={targetDate} />}
              {activeTab === 'pix_ofx' && <PixVsOfxTable storeId={lojaId} date={targetDate} />}
              {activeTab === 'ofx_sem_match' && <OfxSemMatchTable storeId={lojaId} date={targetDate} />}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
