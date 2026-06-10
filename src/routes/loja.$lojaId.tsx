import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, QrCode, Banknote, CreditCard, Landmark, Store,
  AlertTriangle, Search, CheckCircle2
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useStoreHistory } from '@/hooks/useConciliacao';
import { useExtrato, useBulkInsertTransactions } from '@/hooks/useTransactions';
import { useCashRegisters, useCloseCashRegister } from '@/hooks/useCashRegisters';
import { getDefaultDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
  const [tab, setTab] = useState<'all' | 'in' | 'out' | 'caixa'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: extrato, isLoading: loadingExtrato } = useExtrato(lojaId, startDate, endDate);
  const { data: cashRegisters = [], isLoading: loadingCash } = useCashRegisters(lojaId);
  const closeCashRegister = useCloseCashRegister();
  const bulkInsert = useBulkInsertTransactions();
  
  const [declaredAmounts, setDeclaredAmounts] = useState<Record<string, string>>({});
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const qc = useQueryClient();

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

  // Detectar divergências acionáveis
  const totalEntradas = extrato?.totalIn || 0;
  const totalSaidas = extrato?.totalOut || 0;
  const transactions = extrato?.transactions || [];
  const txSemOS = transactions.filter((tx: any) => tx.type === 'in' && !tx.os_number && tx.subtitle !== 'Ajuste de Saldo Inicial');
  const txComOS = transactions.filter((tx: any) => tx.type === 'in' && tx.os_number);
  const totalSemOS = txSemOS.reduce((acc: number, tx: any) => acc + Number(tx.amount || 0), 0);
  const hasDivergence = totalSemOS > 0 || (totalEntradas > 0 && totalSaidas > 0 && Math.abs(totalEntradas - totalSaidas) > 1);

  // Prepara dados para o gráfico de pizza
  const chartStats = extrato?.transactions.reduce((acc, tx: any) => {
    if (tab === 'in' && tx.type === 'in') {
      if (tx.payment_method) {
        const parsed = parsePaymentMethods(tx.payment_method);
        let foundAny = false;
        for (const [method, amount] of Object.entries(parsed)) {
          if (amount > 0) {
            acc[method] = (acc[method] || 0) + amount;
            foundAny = true;
          }
        }
        if (!foundAny) {
          const method = tx.payment_method;
          acc[method] = (acc[method] || 0) + Number(tx.amount || 0);
        }
      }
    } else if (tab === 'out' && tx.type === 'out') {
      const category = tx.subtitle || 'Outras Despesas';
      acc[category] = (acc[category] || 0) + Number(tx.amount || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  let pieData = chartStats 
    ? Object.entries(chartStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  if (tab === 'all') {
    pieData = [
      { name: 'Receitas (Entradas)', value: totalEntradas || 0 },
      { name: 'Despesas (Saídas)', value: totalSaidas || 0 }
    ].filter(d => d.value > 0);
  }

  let currentColors = COLORS;
  if (tab === 'out') currentColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#ec4899'];
  else if (tab === 'in') currentColors = ['#10b981', '#3b82f6', '#06b6d4', '#6366f1', '#8b5cf6'];
  else if (tab === 'all') currentColors = ['#10b981', '#ef4444'];

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
              <p className="text-[10px] text-[var(--text-tertiary)]">Acumulado real do sistema</p>
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
                value={(extrato?.transactions || []).reduce((acc: number, tx: any) => acc + (tx.type === 'in' ? Number(tx.amount) : 0), 0)} 
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
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Livre para contas (Real)</p>
          </Card>
          
          <Card className="border-l-4 border-l-[var(--color-accent-danger)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Contas (Saídas)</span>
              <ArrowDownRight size={16} className="text-[var(--color-accent-danger)]" />
            </div>
            <div className="font-display text-2xl font-bold text-[var(--color-accent-danger)]">
              <AnimatedNumber 
                value={(extrato?.transactions || []).reduce((acc: number, tx: any) => acc + (tx.type === 'out' ? Number(tx.amount) : 0), 0)} 
                format="currency" 
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Total de saídas registradas</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Resumo de Conciliação e Gráfico */}
          <div className="lg:col-span-1 space-y-6">
            {/* Divergências Acionáveis */}
            {!store.is_matriz && hasDivergence ? (
              <div>
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--color-accent-danger)]">
                  <AlertTriangle size={20} />
                  Divergências
                </h3>
                <Card className="p-0 overflow-hidden border-l-4 border-l-[var(--color-accent-danger)]">
                  {/* Entradas sem OS */}
                  {txSemOS.length > 0 && (
                    <div className="p-4 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--color-accent-danger)] uppercase tracking-wider font-semibold">Entradas sem OS vinculada</span>
                        <Badge variant="danger" className="text-[10px]">{txSemOS.length} registro{txSemOS.length > 1 ? 's' : ''}</Badge>
                      </div>
                      <p className="font-display text-xl font-bold text-[var(--color-accent-danger)] mb-3">
                        R$ {totalSemOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {txSemOS.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between text-xs bg-[var(--bg-surface)] rounded-md px-3 py-2">
                            <div>
                              <span className="text-[var(--text-primary)] font-medium">{tx.title}</span>
                              <span className="text-[var(--text-tertiary)] ml-2">{formatDate(tx.occurred_at)}</span>
                            </div>
                            <span className="font-mono font-semibold text-[var(--color-accent-danger)]">
                              R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-3 leading-relaxed">
                        💡 <strong>Solução:</strong> Vincule essas entradas a uma OS existente, ou crie uma OS de ajuste para zerar a divergência.
                      </p>
                    </div>
                  )}
                  
                  {/* Resumo da divergência */}
                  <div className="p-4 bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Total Entradas (Extrato)</span>
                      <span className="font-mono font-medium">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-[var(--text-secondary)]">Total OSs Vinculadas</span>
                      <span className="font-mono font-medium">R$ {txComOS.reduce((acc: number, tx: any) => acc + Number(tx.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[var(--color-accent-danger)] font-semibold">Diferença</span>
                      <span className="font-mono font-bold text-[var(--color-accent-danger)]">R$ {totalSemOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}

            {pieData.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-4">
                  {tab === 'in' ? 'Formas de Pagamento' : tab === 'out' ? 'Distribuição de Despesas' : 'Visão Geral'}
                </h3>
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

            {!store.is_matriz && (
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
            )}
          </div>

          {/* Coluna Direita: Extrato / Transações */}
          <div className="lg:col-span-2">
            {!store.is_matriz && !hasDivergence && totalEntradas > 0 && (
              <Card className="mb-6 p-4 border-l-4 border-l-[var(--color-success)] bg-[var(--color-success)]/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-[var(--color-success)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-success)]">Sem Divergências</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Todas as entradas deste período estão perfeitamente vinculadas a OSs.</p>
                  </div>
                </div>
              </Card>
            )}

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
            <div className="flex border-b border-[var(--border-subtle)] mb-4 overflow-x-auto">
              <button
                onClick={() => { setTab('all'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'all' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Todas as Transações
              </button>
              <button
                onClick={() => { setTab('in'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'in' ? 'border-[var(--color-success)] text-[var(--color-success)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Apenas Entradas
              </button>
              <button
                onClick={() => { setTab('out'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'out' ? 'border-[var(--color-accent-danger)] text-[var(--color-accent-danger)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
              >
                Apenas Saídas
              </button>
              {!store.is_matriz && (
                <button
                  onClick={() => { setTab('caixa'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'caixa' ? 'border-[var(--color-warning)] text-[var(--color-warning)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
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
              ) : loadingExtrato ? (
                <div className="flex justify-center p-12">
                  <LoadingSpinner size="sm" text="" />
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

                              {tx.payment_method && formatPaymentBadges(tx.payment_method)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 text-right">
                          <div className={`font-mono font-semibold ${
                            isIn ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'
                          }`}>
                            {isIn ? '+' : '-'} <AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                          </div>
                          {tx.os_number && !store.is_matriz && (
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

