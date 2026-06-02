import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, QrCode, Banknote, CreditCard, Landmark, Store 
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreHistory } from '@/hooks/useConciliacao';
import { useExtrato } from '@/hooks/useTransactions';
import { getDefaultDate } from '@/lib/utils';
import { useState } from 'react';

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

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Definindo cores para o gráfico
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

function LojaDashboardPage() {
  const { lojaId } = useParams({ from: '/loja/$lojaId' });
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  
  const { data: history = [], isLoading: loadingHistory } = useStoreHistory(lojaId);
  
  const period = getDefaultPeriod();
  const [startDate, setStartDate] = useState(period.start);
  const [endDate, setEndDate] = useState(period.end);
  const [tab, setTab] = useState<'all' | 'in' | 'out'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: extrato, isLoading: loadingExtrato } = useExtrato(lojaId, startDate, endDate);

  const latestReconciliation = history.length > 0 ? history[0] : null;

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

  // Helper para extrair strings como "Credito: 10000.00; PIX: 200.00;"
  const parsePaymentMethods = (raw: string): Record<string, number> => {
    const result: Record<string, number> = {};
    if (!raw) return result;
    
    const parts = raw.split(';');
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

  // Prepara dados para o gráfico de pizza
  const paymentStats = extrato?.transactions.reduce((acc, tx: any) => {
    if (tx.type === 'in' && tx.payment_method) {
      const parsed = parsePaymentMethods(tx.payment_method);
      let foundAny = false;
      
      for (const [method, amount] of Object.entries(parsed)) {
        if (amount > 0) {
          acc[method] = (acc[method] || 0) + amount;
          foundAny = true;
        }
      }
      
      if (!foundAny) {
        // Fallback: se não tiver o padrão "Nome: 10.00;" usa o método inteiro
        const method = tx.payment_method;
        acc[method] = (acc[method] || 0) + Number(tx.amount || 0);
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = paymentStats 
    ? Object.entries(paymentStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  // Filtra as transações
  const filteredTransactions = (extrato?.transactions || []).filter((tx: any) => {
    if (tab === 'in' && tx.type !== 'in') return false;
    if (tab === 'out' && tx.type !== 'out') return false;
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 max-w-6xl mx-auto">
        {/* Header com Navegação */}
        <div>
          <Link to="/conciliacao" className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Resumo de Conciliação e Gráfico */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                Último Fechamento
              </h3>
              
              {latestReconciliation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card variant="glass" className="p-4 flex flex-col justify-between">
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apurado Sistema</p>
                      <p className="font-display text-lg font-semibold text-[var(--text-primary)]">R$ {(latestReconciliation.os_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-[var(--text-tertiary)] mt-1 leading-tight">Total faturado em OSs neste dia</p>
                    </Card>
                    <Card variant="glass" className="p-4 flex flex-col justify-between">
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Liquidado Conta</p>
                      <p className="font-display text-lg font-semibold text-[var(--text-primary)]">R$ {(latestReconciliation.financial_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-[var(--text-tertiary)] mt-1 leading-tight">Entradas bancárias conciliadas</p>
                    </Card>
                  </div>
                  
                  {latestReconciliation.financial_total === 0 && (
                    <div className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md">
                      <p className="text-xs text-[var(--text-secondary)]">ℹ️ O valor Liquidado está zerado pois ainda não há transações bancárias conciliadas para este dia.</p>
                    </div>
                  )}
                  {latestReconciliation.divergence !== 0 && (
                    <div className="p-4 bg-red-500/10 rounded-[var(--radius-md)] border border-red-500/20">
                      <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Divergência Encontrada</p>
                      <p className="font-display text-xl text-red-500 font-bold">
                        R$ {Math.abs(latestReconciliation.divergence).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-[var(--text-tertiary)]">Referência: {formatDate(latestReconciliation.date)}</p>
                </div>
              ) : (
                <Card variant="glass" className="p-6 text-center text-[var(--text-tertiary)] text-sm">
                  Nenhum fechamento importado para esta loja ainda.
                </Card>
              )}
            </div>

            {pieData.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-4">Formas de Pagamento</h3>
                <Card variant="glass" className="p-4">
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
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-[var(--text-secondary)]">{entry.name}</span>
                        </div>
                        <span className="font-medium">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Histórico de Fechamentos</h3>
              <Card variant="glass" className="p-0 overflow-hidden">
                {loadingHistory ? (
                  <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Carregando histórico...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Sem registros anteriores.</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)] max-h-[400px] overflow-y-auto">
                    {history.map((rec, i) => (
                      <div key={i} className="p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{formatDate(rec.date)}</p>
                          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                            Apurado: R$ {Number(rec.os_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-sm">
                            R$ {Number(rec.financial_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant={rec.status === 'approved' ? 'success' : rec.status === 'divergence' ? 'danger' : 'warning'} className="text-[9px] mt-1 px-1.5 py-0">
                            {rec.status === 'approved' ? 'Conciliado' : rec.status === 'divergence' ? 'Divergência' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
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

            {/* Abas e Filtros */}
            <div className="flex border-b border-[var(--border-subtle)] mb-4">
              <button
                onClick={() => { setTab('all'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'all' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Todas as Transações
              </button>
              <button
                onClick={() => { setTab('in'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'in' ? 'border-[var(--color-success)] text-[var(--color-success)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Apenas Entradas
              </button>
              <button
                onClick={() => { setTab('out'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'out' ? 'border-[var(--color-accent-danger)] text-[var(--color-accent-danger)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Apenas Saídas
              </button>
            </div>

            <Card className="p-0 overflow-hidden min-h-[400px]">
              {loadingExtrato ? (
                <div className="flex justify-center p-12">
                  <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="text-center py-20">
                  <Wallet size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-30" />
                  <p className="text-[var(--text-secondary)] font-medium">Nenhum lançamento encontrado nesta aba.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {paginatedTransactions.map((tx: any, i: number) => {
                    const isIn = tx.type === 'in';
                    const Icon = isIn ? ArrowUpRight : ArrowDownRight;
                    
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 sm:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isIn ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]'
                          }`}>
                            <Icon size={18} />
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors text-sm">
                              {tx.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--text-tertiary)]">
                              <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                                <Calendar size={10} />
                                {formatDate(tx.occurred_at)}
                              </span>

                              {tx.payment_method && (
                                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                  {getIconForMethod(tx.payment_method)}
                                  {tx.payment_method}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 text-right">
                          <div className={`font-mono font-semibold ${
                            isIn ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'
                          }`}>
                            {isIn ? '+' : '-'} <AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                          </div>
                          {tx.os_number && (
                            <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
                              OS: {tx.os_number}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Controles de Paginação */}
                  {totalPages > 1 && (
                    <div className="p-4 flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                      <span className="text-xs text-[var(--text-secondary)]">
                        Página {page} de {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-surface-hover)] disabled:opacity-50 transition-colors"
                        >
                          Anterior
                        </button>
                        <button 
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-surface-hover)] disabled:opacity-50 transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

