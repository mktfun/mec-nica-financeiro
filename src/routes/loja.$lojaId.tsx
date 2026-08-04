import { useState, useEffect } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, QrCode, Banknote, CreditCard, Landmark, Store,
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreHistory } from '@/hooks/useConciliacao';
import { useExtrato, useBulkInsertTransactions } from '@/hooks/useTransactions';
import { useCashRegisters, useCloseCashRegister } from '@/hooks/useCashRegisters';
import { useTripleMatch } from '@/hooks/useTripleMatch';
import { supabase, TransactionRow } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/loja/$lojaId')({
  component: LojaDashboardPage,
});

function getDefaultPeriod() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function getIconForMethod(method: string) {
  const m = method.toLowerCase();
  if (m.includes('pix')) return <QrCode size={16} />;
  if (m.includes('dinheiro') || m.includes('espécie')) return <Banknote size={16} />;
  if (m.includes('credito') || m.includes('crédito') || m.includes('debito') || m.includes('débito')) return <CreditCard size={16} />;
  return <Landmark size={16} />;
}



function LojaDashboardPage() {
  const { lojaId } = useParams({ from: '/loja/$lojaId' });
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  
  const { data: history = [], isLoading: loadingHistory } = useStoreHistory(lojaId);
  
  const period = getDefaultPeriod();
  const [startDate, setStartDate] = useState(period.start);
  const [endDate, setEndDate] = useState(period.end);
  const [tab, setTab] = useState<'extrato' | 'saidas' | 'entradas' | 'caixa'>('extrato');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: cashRegisters = [], isLoading: loadingCash } = useCashRegisters(lojaId);
  const closeCashRegister = useCloseCashRegister();
  const bulkInsert = useBulkInsertTransactions();
  const { data: extrato } = useExtrato(lojaId, startDate, endDate);
  
  const [declaredAmounts, setDeclaredAmounts] = useState<Record<string, string>>({});
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const qc = useQueryClient();
  // DEVE ficar antes de qualquer return condicional (Rules of Hooks)
  const [concBanco, setConcBanco] = useState(0);
  const [concSistema, setConcSistema] = useState(0);
  const [concDespesas, setConcDespesas] = useState(0);
  const [loadingConc, setLoadingConc] = useState(false);

  useEffect(() => {
    if (!lojaId || !startDate || !endDate) return;
    setLoadingConc(true);
    (async () => {
      const [ofxRes, sysRes, despRes] = await Promise.all([
        supabase.from('transactions').select('amount, type').eq('store_id', lojaId).eq('source', 'ofx').gte('occurred_at', startDate).lte('occurred_at', endDate),
        supabase.from('transactions').select('amount').eq('store_id', lojaId).in('source', ['patio', 'maquininha']).eq('type', 'in').gte('occurred_at', startDate).lte('occurred_at', endDate),
        supabase.from('transactions').select('amount').eq('store_id', lojaId).eq('source', 'despesa').gte('occurred_at', startDate).lte('occurred_at', endDate),
      ]);
      setConcBanco((ofxRes.data || []).reduce((s, r) => s + (r.type === 'in' ? Number(r.amount) : -Number(r.amount)), 0));
      setConcSistema((sysRes.data || []).reduce((s, r) => s + Number(r.amount), 0));
      setConcDespesas((despRes.data || []).reduce((s, r) => s + Number(r.amount), 0));
      setLoadingConc(false);
    })();
  }, [lojaId, startDate, endDate]);

  const latestReconciliation = history.length > 0 ? history[0] : null;

  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display">Loja não encontrada</h2>
          <Link to="/lojas" className="mt-4 text-[var(--color-primary)] hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  // Helper para extrair strings como "Credito: 10000.00; PIX: 200.00;"
  const parsePaymentMethods = (raw: string): Record<string, number> => {
    const result: Record<string, number> = {};
    if (!raw) return result;
    
    // Remove qualquer sufixo de [Juros ...] antes de parsear
    const cleanRaw = raw.replace(/\s*\[.*?\]/g, '');
    const parts = cleanRaw.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      const [methodName, amountStr] = trimmed.split(':');
      if (methodName && amountStr) {
        const name = methodName.trim().toUpperCase();
        const amount = parseFloat(amountStr.trim());
        if (!isNaN(amount)) {
          let cleanName = name;
          if (name.includes('CREDITO') || name.includes('CRÉDITO') || name.includes('CRED')) cleanName = 'Crédito';
          else if (name.includes('DEBITO') || name.includes('DÉBITO') || name.includes('DEB')) cleanName = 'Débito';
          else if (name.includes('PIX')) cleanName = 'PIX';
          else if (name.includes('DINHEIRO') || name.includes('ESPÉCIE')) cleanName = 'Dinheiro';
          else if (name.includes('CONTA') || name.includes('TRANSFER') || name.includes('PAGAMENTO')) cleanName = 'Depósito/Transf.';
          
          result[cleanName] = (result[cleanName] || 0) + amount;
        }
      }
    }
    return result;
  };

  // Helper para formatar forma de pagamento como badges
  const formatPaymentBadges = (raw: string) => {
    if (!raw) return null;
    const parsed = parsePaymentMethods(raw);
    const entries = Object.entries(parsed).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      // Fallback: se não conseguir parsear, mostra o texto limpo
      const clean = raw.replace(/\s*\[.*?\]/g, '').replace(/;\s*$/g, '').trim();
      if (!clean) return null;
      return <span className="text-[var(--text-secondary)] text-[11px]">{clean}</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map(([method, amount]) => (
          <span key={method} className="inline-flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
            {getIconForMethod(method)}
            <span className="font-medium">{method}</span>
            <span className="text-[var(--text-tertiary)]">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </span>
        ))}
      </div>
    );
  };

  const handleSetInitialBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'));
    if (isNaN(val)) return alert('Valor inválido');
    
    // Calcula a diferença necessária para atingir o saldo desejado
    const currentBalance = extrato?.globalBalance || 0;
    const diff = val - currentBalance;
    
    if (diff === 0) {
      alert('O saldo já é exatamente este valor.');
      return setIsBalanceModalOpen(false);
    }

    try {
      await bulkInsert.mutateAsync([{
        store_id: store.id,
        type: diff > 0 ? 'in' : 'out',
        amount: Math.abs(diff),
        title: 'Ajuste de Saldo em Conta',
        subtitle: 'Ajuste de Saldo Inicial',
        occurred_at: new Date().toISOString()
      }]);
      alert('Saldo ajustado com sucesso!');
      setIsBalanceModalOpen(false);
      setBalanceInput('');
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
        .eq('store_id', store.id)
        .eq('subtitle', 'Ajuste de Saldo Inicial');
        
      if (error) throw error;
      
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      
      alert('Ajustes de saldo zerados com sucesso!');
      setIsBalanceModalOpen(false);
    } catch (e: any) {
      alert('Erro ao resetar saldo: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const apuradoSistema = concSistema - concDespesas;
  const diferencaConc = concBanco - apuradoSistema;

  let pieData: { name: string; value: number }[] = [];
  let currentColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f43f5e'];

  if (tab === 'extrato' || tab === 'caixa') {
    pieData = [
      { name: 'Receitas (Entradas)', value: extrato?.totalIn || 0 },
      { name: 'Despesas (Saídas)', value: extrato?.totalOut || 0 }
    ].filter(d => d.value > 0);
    currentColors = ['#10b981', '#ef4444'];
  } else if (tab === 'saidas') {
    const saidasStats = (extrato?.transactions || []).filter((tx: TransactionRow) => tx.type === 'out').reduce((acc: Record<string, number>, tx: TransactionRow) => {
      const cat = tx.subtitle || 'Outras Saídas';
      acc[cat] = (acc[cat] || 0) + Number(tx.amount);
      return acc;
    }, {});
    pieData = Object.entries(saidasStats).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
  } else if (tab === 'entradas') {
    const entradasStats = (extrato?.transactions || []).filter((tx: TransactionRow) => tx.type === 'in').reduce((acc: Record<string, number>, tx: TransactionRow) => {
      const method = tx.subtitle || 'Outras Entradas';
      acc[method] = (acc[method] || 0) + Number(tx.amount);
      return acc;
    }, {});
    pieData = Object.entries(entradasStats).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
  }


  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-6xl mx-auto">
        {/* Header com Navegação */}
        <div>
          <Link to="/lojas" className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div className="flex items-center gap-4">
            {store.avatar_url ? (
              <img src={store.avatar_url} alt={store.name} className="w-16 h-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Store size={24} />
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-3xl">{store.name}</h1>
              <p className="text-[var(--text-secondary)]">{store.address || 'Sem endereço cadastrado'}</p>
            </div>
          </div>
        </div>
        
        {/* Painel Financeiro Consolidado */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[var(--color-primary)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Saldo da Loja</span>
              <Landmark size={16} className="text-[var(--color-primary)]" />
            </div>
            <div className="font-display text-2xl font-bold">
              <AnimatedNumber 
                value={extrato?.globalBalance || 0} 
                format="currency" 
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[var(--text-tertiary)]">Último saldo reportado pelo banco</p>
              <button 
                onClick={() => setIsBalanceModalOpen(true)}
                className="text-[10px] text-[var(--color-primary)] hover:underline flex items-center gap-1 bg-[var(--color-primary)]/10 px-2 py-1 rounded"
              >
                Ajustar Saldo
              </button>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-success)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Faturamento (Entradas)</span>
              <ArrowUpRight size={16} className="text-[var(--color-success)]" />
            </div>
            <div className="font-display text-2xl font-bold text-[var(--color-success)]">
              <AnimatedNumber 
                value={(extrato?.transactions || []).reduce((acc: number, tx: TransactionRow) => acc + (tx.type === 'in' ? Number(tx.amount) : 0), 0)} 
                format="currency" 
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Total de valores que entraram</p>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-accent-teal)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Valor Disponível</span>
              <Wallet size={16} className="text-[var(--color-accent-teal)]" />
            </div>
            <div className="font-display text-2xl font-bold text-[var(--color-accent-teal)]">
              <AnimatedNumber 
                value={extrato?.globalBalance || 0} 
                format="currency" 
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[var(--text-tertiary)]">Livre para contas (Real)</p>
              {(store as any).account_limit != null && (store as any).account_limit > 0 && (
                <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                  Limite: R$ {Number((store as any).account_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-accent-danger)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Contas (Saídas)</span>
              <ArrowDownRight size={16} className="text-[var(--color-accent-danger)]" />
            </div>
            <div className="font-display text-2xl font-bold text-[var(--color-accent-danger)]">
              <AnimatedNumber 
                value={(extrato?.transactions || []).reduce((acc: number, tx: TransactionRow) => acc + (tx.type === 'out' ? Number(tx.amount) : 0), 0)} 
                format="currency" 
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Total de saídas registradas</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Resumo de Conciliação e Gráfico */}
          <div className="lg:col-span-1 space-y-6">


            {pieData.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-4">
                  {tab === 'in' ? 'Formas de Pagamento' : tab === 'out' ? 'Distribuição de Despesas' : 'Visão Geral'}
                </h3>
                <Card variant="glass" className="p-4 shadow-sm">
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentColors[index % currentColors.length] }} />
                          <span className="text-[var(--text-secondary)]">{entry.name}</span>
                        </div>
                        <span className="font-medium">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Coluna Direita: Extrato / Transações */}
          <div className="lg:col-span-2">


            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <h3 className="font-display font-semibold text-xl flex items-center gap-2">
                <Wallet size={20} className="text-[var(--color-primary)]" />
                Extrato Bancário
              </h3>
              
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">De</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Até</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="flex flex-col justify-center border-l-2 border-l-[var(--color-success)] py-4">
                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight size={14} className="text-[var(--color-success)]" />
                  Entradas
                </span>
                <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                  <AnimatedNumber value={extrato?.totalIn || 0} format="currency" />
                </div>
              </Card>
              
              <Card className="flex flex-col justify-center border-l-2 border-l-[var(--color-accent-danger)] py-4">
                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight size={14} className="text-[var(--color-accent-danger)]" />
                  Saídas (Despesas)
                </span>
                <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                  <AnimatedNumber value={extrato?.totalOut || 0} format="currency" />
                </div>
              </Card>
            </div>

            <div className="flex border-b border-[var(--border-subtle)] mb-4 overflow-x-auto">
              <button
                onClick={() => { setTab('extrato'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'extrato' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                Extrato Bancário
              </button>
              <button
                onClick={() => { setTab('saidas'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'saidas' ? 'border-[var(--color-accent-danger)] text-[var(--color-accent-danger)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                Saídas
              </button>
              <button
                onClick={() => { setTab('entradas'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'entradas' ? 'border-[var(--color-success)] text-[var(--color-success)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                Entradas
              </button>
              {!store.is_matriz && (
                <button
                  onClick={() => { setTab('caixa'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'caixa' ? 'border-[var(--color-warning)] text-[var(--color-warning)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Caixa Físico {cashRegisters.filter(c => c.status === 'pending').length > 0 && <span className="ml-1 bg-[var(--color-warning)] text-black text-[10px] px-1.5 py-0.5 rounded-full">{cashRegisters.filter(c => c.status === 'pending').length}</span>}
                </button>
              )}
            </div>

            <Card className="p-0 overflow-hidden">
              {tab === 'caixa' ? (
                loadingCash ? (
                  <div className="flex justify-center p-12"><LoadingSpinner size="sm" text="Carregando caixas..." /></div>
                ) : cashRegisters.length === 0 ? (
                  <div className="text-center py-20">
                    <Banknote size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-30" />
                    <p className="text-[var(--text-secondary)] font-medium">Nenhum registro de dinheiro em espécie.</p>
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
                              <h4 className="font-display font-semibold text-lg text-[var(--text-primary)]">Caixa de {formatDate(cr.date)}</h4>
                              <p className="text-sm text-[var(--text-secondary)]">Fechamento do dinheiro físico da loja.</p>
                            </div>
                            <Badge variant={isPending ? 'warning' : 'success'}>
                              {isPending ? 'Pendente de Conferência' : 'Caixa Fechado'}
                            </Badge>
                          </div>
                          
                          <div className="bg-[var(--bg-canvas)] rounded-[var(--radius-lg)] p-5 border border-[var(--border-subtle)]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apurado (OSs)</p>
                                <p className="text-xl font-mono font-medium">R$ {Number(cr.expected_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Valor Contado</p>
                                {isPending ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={declaredVal}
                                        onChange={(e) => setDeclaredAmounts(prev => ({ ...prev, [cr.id]: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[var(--color-warning)] transition-colors"
                                      />
                                    </div>
                                    <button 
                                      onClick={handleClose}
                                      disabled={!declaredVal || closeCashRegister.isPending}
                                      className="bg-[var(--color-warning)] text-black px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--color-warning)]/90 disabled:opacity-50 transition-colors"
                                    >
                                      Fechar Caixa
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xl font-mono font-medium">R$ {Number(cr.declared_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Divergência</p>
                                {isPending ? (
                                  <p className="text-[var(--text-tertiary)] text-sm mt-2 italic">Aguardando contagem...</p>
                                ) : (
                                  <p className={`text-xl font-mono font-bold ${cr.divergence === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
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
              ) : tab === 'extrato' || tab === 'entradas' || tab === 'saidas' ? (
                <div className="overflow-x-auto">
                  {(() => {
                    let txs = extrato?.transactions || [];
                    if (tab === 'entradas') txs = txs.filter((t: TransactionRow) => t.type === 'in');
                    if (tab === 'saidas') txs = txs.filter((t: TransactionRow) => t.type === 'out');
                    
                    if (txs.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <p className="text-[var(--text-secondary)] font-medium">Nenhuma transação encontrada neste período.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                          <tr>
                            <th className="px-4 py-3 font-medium">Data</th>
                            <th className="px-4 py-3 font-medium">Tipo</th>
                            <th className="px-4 py-3 font-medium">Descrição</th>
                            <th className="px-4 py-3 font-medium">Categoria / Método</th>
                            <th className="px-4 py-3 font-medium text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {txs.map((tx: TransactionRow, i: number) => (
                            <tr key={tx.id || i} className="hover:bg-[var(--bg-surface)] transition-colors">
                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                {formatDate(tx.occurred_at || tx.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={tx.type === 'in' ? 'success' : 'danger'}>
                                  {tx.type === 'in' ? 'Entrada' : 'Saída'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-primary)] font-medium max-w-[250px] truncate" title={tx.title}>
                                {tx.title || (tx.type === 'in' ? 'Entrada' : 'Saída')}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-tertiary)]">
                                {tx.subtitle || '-'}
                              </td>
                              <td className={`px-4 py-3 text-right font-mono font-medium ${tx.type === 'in' ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'}`}>
                                {tx.type === 'in' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              ) : null}
            </Card>
          </div>

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
                <Button variant="danger" size="sm" onClick={handleResetBalance} disabled={isProcessing} className="bg-transparent border border-[var(--color-accent-danger)] text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)] hover:text-white transition-colors">
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
      </div>
    </AppShell>
  );
}

