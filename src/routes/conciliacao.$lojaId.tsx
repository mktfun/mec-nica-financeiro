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

import { useTransactionsPorDataELoja } from '@/hooks/useTransactions';
import { useReconciliationViews } from '@/hooks/useConciliacao';


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
  const { lojaId } = useParams({ from: '/conciliacao/$lojaId' });
  const { date } = Route.useSearch();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  const { data: transactions = [] } = useTransactionsPorDataELoja(targetDate, lojaId);
  const { data: reconData } = useReconciliationViews(lojaId, targetDate);


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
            </div>
          </div>
        </div>

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
            4. Banco (Sem Origem)
          </TabBtn>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'os_rede' && <OsVsRedeTable storeId={lojaId} date={targetDate} />}
          {activeTab === 'rede_ofx' && <RedeVsOfxTable storeId={lojaId} date={targetDate} />}
          {activeTab === 'pix_ofx' && <PixVsOfxTable storeId={lojaId} date={targetDate} />}
          {activeTab === 'ofx_sem_match' && <OfxSemMatchTable storeId={lojaId} date={targetDate} />}
        </div>
      </div>
    </AppShell>
  );
}
