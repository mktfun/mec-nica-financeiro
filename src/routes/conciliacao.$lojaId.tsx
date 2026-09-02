import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { Store, ArrowLeft, CreditCard, Landmark, Car, TableProperties, AlertTriangle } from 'lucide-react';
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
      className={`px-4 py-2.5 border-b-2 text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
        active 
          ? 'border-emerald-500 text-white' 
          : 'border-transparent text-[var(--text-tertiary)] hover:text-white hover:border-zinc-700'
      }`}
    >
      {Icon && <Icon size={14} className={active ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />}
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
  const { data: dailySummary, isLoading: isLoadingSummary } = useDailyReconciliationSummary(targetDate);
  const storesList = dailySummary?.stores || dailySummary?.stores_detail || [];
  const storeRecon = storesList.find(s => s.store_id === lojaId || s.store_id === store?.id || s.store_name?.toLowerCase() === store?.name?.toLowerCase());
  
  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;

  const rawLog: any = storeRecon;
  const isMissing = !isLoadingSummary && !rawLog;
  const log = {
    saldo_banco: isMissing ? null : Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_ofx ?? 0),
    maquininha: isMissing ? null : Number(rawLog?.maquininha ?? rawLog?.rede_liquido ?? 0),
    pix: isMissing ? null : Number(rawLog?.pix ?? rawLog?.pix_os ?? 0),
    na_loja_os: isMissing ? null : Number(rawLog?.na_loja_os ?? rawLog?.patio_os ?? 0),
    previsto_ofx: isMissing ? null : Number(rawLog?.previsto_ofx ?? rawLog?.previsto ?? 0),
    diferenca: isMissing ? null : Number(rawLog?.diferenca ?? 0),
    status: rawLog?.status || 'pending',
    isMissingData: isMissing
  };

  const isDiferencaOk = Math.abs(log.diferenca || 0) <= 0.05 && (log.status === 'approved' || log.status === 'conciliado');

  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display">Loja não encontrada</h2>
          <Link to="/conciliacao" search={{ date: targetDate }} className="mt-4 text-emerald-400 hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  const totalJuros = transactions.filter(t => (t as any).source === 'rede_taxa').reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <AppShell>
      <PageContainer variant="finance" className="space-y-6 pb-20 pt-2">
        <div>
          <Link to="/conciliacao" search={{ date: targetDate }} className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-3">
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
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
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

        {!isLoadingSummary && !storeRecon && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={18} />
            <div>
              <h3 className="text-red-400 font-semibold text-sm">Dados Ausentes na Agregação</h3>
              <p className="text-red-300/80 text-xs mt-1 leading-relaxed">
                A rotina de conciliação do dia não retornou os dados estruturais para esta filial. 
                Isso pode ocorrer se a filial não possui transações (extrato bancário, OS ou maquininha) nesta data,
                ou devido a uma falha na consolidação do sistema. Os cards abaixo exibirão "N/D" (Não Disponível).
              </p>
            </div>
          </div>
        )}

        {/* Painel Único de Fundo Contínuo Envelopando as 6 Métricas — Idêntico ao Fechamento por Filial */}
        <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 font-sans tabular-nums text-xs">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
            
            {/* 1. SALDO TOTAL */}
            <div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                SALDO TOTAL
              </span>
              <p className={`font-bold text-sm sm:text-base font-mono ${log.isMissingData ? 'text-zinc-500' : (log.saldo_banco || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.saldo_banco || 0} format="currency" />}
              </p>
            </div>

            {/* 2. Maquininha */}
            <div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                Maquininha
              </span>
              <p className={`font-bold text-sm font-mono ${log.isMissingData ? 'text-zinc-500' : 'text-[var(--color-primary)]'}`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.maquininha || 0} format="currency" />}
              </p>
            </div>

            {/* 3. PIX */}
            <div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                PIX
              </span>
              <p className={`font-bold text-sm font-mono ${log.isMissingData ? 'text-zinc-500' : 'text-[var(--color-primary)]'}`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.pix || 0} format="currency" />}
              </p>
            </div>

            {/* 4. Na Loja OS */}
            <div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                Na Loja OS
              </span>
              <p className={`font-bold text-sm font-mono ${log.isMissingData ? 'text-zinc-500' : 'text-[var(--color-accent-warning)]'}`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.na_loja_os || 0} format="currency" />}
              </p>
            </div>

            {/* 5. Previsto */}
            <div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                Previsto
              </span>
              <p className={`font-bold text-sm font-mono ${log.isMissingData ? 'text-zinc-500' : 'text-[var(--text-primary)]'}`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.previsto_ofx || 0} format="currency" />}
              </p>
              <span className="text-[9px] text-[var(--text-tertiary)] block mt-0.5 font-medium">
                Total Previsto
              </span>
            </div>

            {/* 6. Diferença */}
            <div className="xl:border-l xl:border-white/10 xl:pl-6">
              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                log.isMissingData ? 'text-zinc-500' : isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
              }`}>
                Diferença
              </span>
              <p className={`font-bold text-sm font-mono ${
                log.isMissingData ? 'text-zinc-500' : isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
              }`}>
                {log.isMissingData ? 'N/D' : <AnimatedNumber value={log.diferenca || 0} format="currency" />}
              </p>
            </div>
          </div>
        </div>

        {isMarcoZero ? (
          <div className="min-h-[400px]">
            <LegacyOsTable storeId={lojaId} date={targetDate} />
          </div>
        ) : (
          <>
            {/* Navegação entre as 3 Abas Canônicas */}
            <div className="flex border-b border-[var(--border-subtle)] pb-px overflow-x-auto gap-1">
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
            <div className="min-h-[400px] pt-1">
              {activeTab === 'cartao' && <StoreCartaoMaquininhaView storeId={lojaId} date={targetDate} />}
              {activeTab === 'extrato' && <StoreExtratoBancarioView storeId={lojaId} date={targetDate} />}
              {activeTab === 'os' && <StoreOrdensServicoView storeId={lojaId} date={targetDate} />}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
