import { useState, useEffect, useMemo } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, QrCode, Banknote, CreditCard, Landmark, Store,
  Search, ChevronLeft, ChevronRight, Filter, TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { useStoreAnalyticBreakdown } from '@/hooks/useStoreAnalyticBreakdown';
import { useBulkInsertTransactions } from '@/hooks/useTransactions';
import { useCashRegisters, useCloseCashRegister } from '@/hooks/useCashRegisters';
import { supabase, TransactionRow } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LojaPieCharts } from '@/components/lojas/LojaPieCharts';
import { LojaEvolutionChart } from '@/components/lojas/LojaEvolutionChart';
import { extractSupplierName } from '@/lib/parsers/supplierUtils';

export const Route = createFileRoute('/loja/$lojaId')({
  component: LojaDashboardPage,
});

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function LojaDashboardPage() {
  const { lojaId } = useParams({ from: '/loja/$lojaId' });
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  
  const { data: availableDates = [] } = useAvailableConciliacaoDates();
  
  // Datas de filtro inicializadas dinamicamente
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasInitializedDates, setHasInitializedDates] = useState(false);

  // Auto-seleciona a data mais recente com dados disponíveis
  useEffect(() => {
    if (!hasInitializedDates && availableDates.length > 0) {
      const latest = availableDates[0];
      setStartDate(latest);
      setEndDate(latest);
      setHasInitializedDates(true);
    } else if (!hasInitializedDates && availableDates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setHasInitializedDates(true);
    }
  }, [availableDates, hasInitializedDates]);

  const [tab, setTab] = useState<'extrato' | 'saidas' | 'entradas' | 'caixa'>('extrato');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Consome hook analítico com agregação e tratamento de nulos
  const { data: analyticData, isLoading: loadingAnalytic } = useStoreAnalyticBreakdown(
    lojaId,
    startDate,
    endDate
  );

  const { data: cashRegisters = [], isLoading: loadingCash } = useCashRegisters(lojaId);
  const closeCashRegister = useCloseCashRegister();
  const bulkInsert = useBulkInsertTransactions();
  
  const [declaredAmounts, setDeclaredAmounts] = useState<Record<string, string>>({});
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const qc = useQueryClient();

  // Atalhos rápidos de período
  const handleQuickPeriod = (type: 'latest' | '7days' | 'month' | 'all') => {
    const latestDate = availableDates[0] || new Date().toISOString().split('T')[0];
    const latestObj = new Date(latestDate + 'T12:00:00Z');

    if (type === 'latest') {
      setStartDate(latestDate);
      setEndDate(latestDate);
    } else if (type === '7days') {
      const d = new Date(latestObj);
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(latestDate);
    } else if (type === 'month') {
      const y = latestObj.getFullYear();
      const m = String(latestObj.getMonth() + 1).padStart(2, '0');
      setStartDate(`${y}-${m}-01`);
      setEndDate(latestDate);
    } else if (type === 'all') {
      setStartDate('2026-08-13');
      setEndDate(latestDate);
    }
    setPage(1);
  };

  const handleSetInitialBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'));
    if (isNaN(val)) return alert('Valor inválido');
    
    const currentBalance = analyticData?.current_balance || 0;
    const diff = val - currentBalance;
    
    if (diff === 0) {
      alert('O saldo já é exatamente este valor.');
      return setIsBalanceModalOpen(false);
    }

    try {
      await bulkInsert.mutateAsync([{
        store_id: store!.id,
        type: diff > 0 ? 'in' : 'out',
        amount: Math.abs(diff),
        title: 'Ajuste de Saldo em Conta',
        subtitle: 'Ajuste de Saldo Inicial',
        occurred_at: new Date().toISOString()
      }]);
      alert('Saldo ajustado com sucesso!');
      setIsBalanceModalOpen(false);
      setBalanceInput('');
      qc.invalidateQueries({ queryKey: ['store_analytic_breakdown'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
    } catch (e: any) {
      alert('Erro ao ajustar saldo: ' + e.message);
    }
  };

  const handleResetBalance = async () => {
    if (!confirm('Deseja realmente zerar todos os ajustes manuais de saldo desta loja?')) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('store_id', store!.id)
        .eq('subtitle', 'Ajuste de Saldo Inicial');
        
      if (error) throw error;
      
      qc.invalidateQueries({ queryKey: ['store_analytic_breakdown'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
      
      alert('Ajustes de saldo zerados com sucesso!');
      setIsBalanceModalOpen(false);
    } catch (e: any) {
      alert('Erro ao resetar saldo: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Contagem de lançamentos
  const countIn = useMemo(() => {
    return (analyticData?.transactions || []).filter((t: any) => t.type === 'in').length;
  }, [analyticData?.transactions]);

  const countOut = useMemo(() => {
    return (analyticData?.transactions || []).filter((t: any) => t.type === 'out').length;
  }, [analyticData?.transactions]);

  // Filtragem de transações na tabela
  const filteredTransactions = useMemo(() => {
    let txs = analyticData?.transactions || [];

    if (tab === 'entradas') {
      txs = txs.filter((t: any) => t.type === 'in');
    } else if (tab === 'saidas') {
      txs = txs.filter((t: any) => t.type === 'out');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      txs = txs.filter((t: any) => {
        const title = (t.title || '').toLowerCase();
        const supplier = (t.clean_supplier_name || t.counterpart_name || '').toLowerCase();
        const category = (t.clean_source_name || t.manual_category || t.subtitle || '').toLowerCase();
        const amountStr = String(t.amount || '');
        return title.includes(q) || supplier.includes(q) || category.includes(q) || amountStr.includes(q);
      });
    }

    return txs;
  }, [analyticData?.transactions, tab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display font-semibold">Loja não encontrada</h2>
          <Link to="/lojas" className="mt-4 text-[var(--color-primary)] hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  const currentBalance = analyticData?.current_balance || 0;
  const totalIn = analyticData?.total_in || 0;
  const totalOut = analyticData?.total_out || 0;
  const netResult = analyticData?.net_result || 0;
  const accountLimit = Number((store as any).account_limit || 0);
  const availableValue = currentBalance + accountLimit;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-7xl mx-auto pb-12">
        {/* Top Header com Navegação */}
        <div>
          <Link 
            to="/lojas" 
            className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft size={16} /> Voltar para Lojas
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {store.avatar_url ? (
                <img 
                  src={store.avatar_url} 
                  alt={store.name} 
                  className="w-16 h-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] object-cover shadow-sm" 
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center shadow-sm">
                  <Store size={28} />
                </div>
              )}
              <div>
                <h1 className="font-display font-bold text-3xl tracking-tight text-[var(--text-primary)]">{store.name}</h1>
                <p className="text-sm text-[var(--text-secondary)]">{store.address || 'Sem endereço cadastrado'}</p>
              </div>
            </div>

            {/* Controles de Data e Atalhos Rápidos */}
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-1.5 rounded-lg shadow-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">De</span>
                  <input
                    type="date"
                    min="2026-08-13"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-1.5 rounded-lg shadow-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Até</span>
                  <input
                    type="date"
                    min="2026-08-13"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Botões de Atalho de Período */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => handleQuickPeriod('latest')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all text-[11px]"
                >
                  Último Dia
                </button>
                <button
                  onClick={() => handleQuickPeriod('7days')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all text-[11px]"
                >
                  7 Dias
                </button>
                <button
                  onClick={() => handleQuickPeriod('month')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all text-[11px]"
                >
                  Mês
                </button>
                <button
                  onClick={() => handleQuickPeriod('all')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all text-[11px]"
                >
                  Tudo
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Painel de 4 KPIs Financeiros */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[var(--color-primary)] p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">Saldo da Loja</span>
              <Landmark size={18} className="text-[var(--color-primary)]" />
            </div>
            <div className="font-display text-2xl font-bold tracking-tight">
              <AnimatedNumber value={currentBalance} format="currency" />
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">Último saldo OFX</p>
              <button 
                onClick={() => setIsBalanceModalOpen(true)}
                className="text-[11px] font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1 bg-[var(--color-primary)]/10 px-2 py-0.5 rounded transition-colors"
              >
                Ajustar
              </button>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-success)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">Faturamento (Entradas)</span>
              <ArrowUpRight size={18} className="text-[var(--color-success)]" />
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-[var(--color-success)]">
              <AnimatedNumber value={totalIn} format="currency" />
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-tertiary)]">Total recebido no período</p>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-accent-teal)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">Valor Disponível</span>
              <Wallet size={18} className="text-[var(--color-accent-teal)]" />
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-[var(--color-accent-teal)]">
              <AnimatedNumber value={availableValue} format="currency" />
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <p className="text-[11px] text-[var(--text-tertiary)]">Livre para despesas</p>
              {accountLimit > 0 && (
                <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                  Lim: R$ {accountLimit.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-accent-danger)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">Contas (Saídas)</span>
              <ArrowDownRight size={18} className="text-[var(--color-accent-danger)]" />
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-[var(--color-accent-danger)]">
              <AnimatedNumber value={totalOut} format="currency" />
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <p className="text-[11px] text-[var(--text-tertiary)]">Total de pagamentos</p>
              <span className={`text-[11px] font-bold ${netResult >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
                Líq: {netResult >= 0 ? '+' : ''} R$ {netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </Card>
        </div>

        {/* Layout Principal: Coluna Gráficos & Resumos (Esq) + Coluna Extrato/Tabela (Dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Gráfico de Pizza + Gráfico de Linhas de Evolução */}
          <div className="lg:col-span-5 space-y-6">
            <LojaPieCharts
              activeTab={tab}
              totalIn={totalIn}
              totalOut={totalOut}
              netResult={netResult}
              suppliersOut={analyticData?.suppliers_out || []}
              sourcesIn={analyticData?.sources_in || []}
              isLoading={loadingAnalytic}
            />

            {/* Gráfico de Evolução Diária em 3 Linhas (Entradas, Saídas, Saldo) */}
            <LojaEvolutionChart
              transactions={analyticData?.transactions || []}
              startDate={startDate}
              endDate={endDate}
              isLoading={loadingAnalytic}
            />
          </div>

          {/* Coluna Direita: Extrato e Transações */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header da Tabela com Abas e Campo de Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto">
                <button
                  onClick={() => { setTab('extrato'); setPage(1); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === 'extrato'
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Extrato Bancário
                </button>
                <button
                  onClick={() => { setTab('saidas'); setPage(1); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    tab === 'saidas'
                      ? 'border-[var(--color-accent-danger)] text-[var(--color-accent-danger)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowDownRight size={14} />
                  Saídas
                </button>
                <button
                  onClick={() => { setTab('entradas'); setPage(1); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    tab === 'entradas'
                      ? 'border-[var(--color-success)] text-[var(--color-success)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  Entradas
                </button>
                {!(store as any).is_matriz && (
                  <button
                    onClick={() => { setTab('caixa'); setPage(1); }}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      tab === 'caixa'
                        ? 'border-[var(--color-warning)] text-[var(--color-warning)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Caixa Físico
                    {cashRegisters.filter(c => c.status === 'pending').length > 0 && (
                      <span className="ml-1 bg-[var(--color-warning)] text-black font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        {cashRegisters.filter(c => c.status === 'pending').length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Campo de Busca Rápida */}
              {tab !== 'caixa' && (
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Buscar fornecedor, valor..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              )}
            </div>

            {/* Conteúdo das Abas */}
            <Card className="p-0 overflow-hidden border-[var(--border-subtle)] shadow-sm">
              {tab === 'caixa' ? (
                loadingCash ? (
                  <div className="flex justify-center p-12"><LoadingSpinner size="sm" text="Carregando caixas..." /></div>
                ) : cashRegisters.length === 0 ? (
                  <div className="text-center py-16">
                    <Banknote size={40} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" />
                    <p className="text-[var(--text-secondary)] font-medium text-sm">Nenhum registro de dinheiro em espécie.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {cashRegisters.map(cr => {
                      const isPending = cr.status === 'pending';
                      const declaredVal = declaredAmounts[cr.id] || '';
                      
                      const handleClose = () => {
                        const parsed = parseFloat(declaredVal);
                        if (isNaN(parsed)) return;
                        closeCashRegister.mutate({
                          id: cr.id,
                          expectedAmount: cr.expected_amount,
                          declaredAmount: parsed
                        });
                      };

                      return (
                        <div key={cr.id} className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">Caixa de {formatDate(cr.date)}</h4>
                              <p className="text-xs text-[var(--text-secondary)]">Fechamento do dinheiro físico da loja.</p>
                            </div>
                            <Badge variant={isPending ? 'warning' : 'success'}>
                              {isPending ? 'Pendente de Conferência' : 'Caixa Fechado'}
                            </Badge>
                          </div>
                          
                          <div className="bg-[var(--bg-canvas)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-subtle)]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apurado (OSs)</p>
                                <p className="text-lg font-mono font-medium">R$ {Number(cr.expected_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              
                              <div>
                                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Valor Contado</p>
                                {isPending ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        value={declaredVal}
                                        onChange={(e) => setDeclaredAmounts(prev => ({ ...prev, [cr.id]: e.target.value }))}
                                        placeholder="0.00" 
                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md pl-8 pr-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--color-warning)] transition-colors"
                                      />
                                    </div>
                                    <button 
                                      onClick={handleClose}
                                      disabled={!declaredVal || closeCashRegister.isPending}
                                      className="bg-[var(--color-warning)] text-black px-2.5 py-1 rounded-md text-xs font-medium hover:bg-[var(--color-warning)]/90 disabled:opacity-50 transition-colors"
                                    >
                                      Fechar
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-lg font-mono font-medium">R$ {Number(cr.declared_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                )}
                              </div>

                              <div>
                                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Divergência</p>
                                {isPending ? (
                                  <p className="text-[var(--text-tertiary)] text-xs mt-1 italic">Aguardando contagem...</p>
                                ) : (
                                  <p className={`text-lg font-mono font-bold ${cr.divergence === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
                                    {cr.divergence === 0 ? 'Exato' : `${cr.divergence! > 0 ? '+' : ''} R$ ${cr.divergence?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div>
                  {loadingAnalytic ? (
                    <div className="flex justify-center p-12"><LoadingSpinner size="sm" text="Carregando transações..." /></div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-16">
                      <Wallet size={40} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" />
                      <p className="text-[var(--text-secondary)] font-medium text-sm">Nenhuma transação encontrada no período.</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">Selecione outro período ou ajuste a busca.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                          <thead className="text-[11px] text-[var(--text-secondary)] uppercase bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Data</th>
                              <th className="px-4 py-3 font-semibold">Tipo</th>
                              <th className="px-4 py-3 font-semibold">Fornecedor / Origem</th>
                              <th className="px-4 py-3 font-semibold">Descrição do Extrato</th>
                              <th className="px-4 py-3 font-semibold text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {paginatedTransactions.map((tx: any, i: number) => {
                              const supplierName = tx.clean_supplier_name || extractSupplierName(tx);
                              const isIncome = tx.type === 'in';
                              const amount = Math.abs(Number(tx.amount || 0));

                              return (
                                <tr key={tx.id || i} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono">
                                    {formatDate(tx.target_date || tx.occurred_at || tx.created_at)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant={isIncome ? 'success' : 'danger'} className="text-[10px]">
                                      {isIncome ? 'Entrada' : 'Saída'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[200px] truncate" title={supplierName}>
                                    {supplierName}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--text-tertiary)] max-w-[220px] truncate" title={tx.title}>
                                    {tx.title || '—'}
                                  </td>
                                  <td className={`px-4 py-3 text-right font-mono font-bold ${isIncome ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
                                    {isIncome ? '+' : '-'} R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginação da Tabela */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs text-[var(--text-secondary)]">
                          <span>
                            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, filteredTransactions.length)} de {filteredTransactions.length} lançamentos
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="p-1 rounded border border-[var(--border-subtle)] disabled:opacity-30 hover:bg-[var(--bg-surface)] transition-all"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="px-2 font-medium">Página {page} de {totalPages}</span>
                            <button
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="p-1 rounded border border-[var(--border-subtle)] disabled:opacity-30 hover:bg-[var(--bg-surface)] transition-all"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Modal de Ajuste de Saldo */}
        <Modal 
          isOpen={isBalanceModalOpen} 
          onClose={() => setIsBalanceModalOpen(false)}
          title="Ajustar Saldo Real da Conta"
        >
          <div className="space-y-4 pt-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Informe o saldo atual real desta loja na conta bancária. O sistema criará uma transação de ajuste invisível às DREs para que o saldo exibido passe a bater com a realidade.
            </p>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                Saldo Real Atual (R$)
              </label>
              <Input 
                type="number" 
                step="0.01" 
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                placeholder="Ex: 5000.00" 
                className="text-xl h-14"
              />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetBalance} 
                disabled={isProcessing} 
                className="bg-transparent border border-[var(--color-accent-danger)] text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)] hover:text-white transition-colors"
              >
                Zerar Ajustes
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsBalanceModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSetInitialBalance} disabled={bulkInsert.isPending || !balanceInput || isProcessing}>
                  {bulkInsert.isPending ? 'Ajustando...' : 'Confirmar Ajuste'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>

      </div>
    </AppShell>
  );
}
