import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FileSpreadsheet, Filter, ArrowUpRight, ArrowDownRight, 
  Wallet, Calendar, CreditCard, Banknote, Landmark, QrCode
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useExtrato } from '@/hooks/useTransactions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/historico')({
  component: HistoricoPage,
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

function HistoricoPage() {
  const period = getDefaultPeriod();
  const [startDate, setStartDate] = useState(period.start);
  const [endDate, setEndDate] = useState(period.end);
  const [storeFilter, setStoreFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: stores = [] } = useStores();
  const { data: extrato, isLoading } = useExtrato(storeFilter, startDate, endDate);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl flex items-center gap-3">
              <Wallet size={28} className="text-[var(--color-primary)]" />
              Extrato Bancário
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Consolidação de entradas, saídas e saldo por período.
            </p>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-colors"
          >
            <Filter size={14} />
            Filtros
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="flex flex-wrap gap-4 items-end bg-[var(--bg-surface-elevated)] border-[var(--color-primary)]/20">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Loja</label>
                  <select
                    value={storeFilter}
                    onChange={e => setStoreFilter(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  >
                    <option value="">Todas as lojas</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">De</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Até</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-success)]">
            <span className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
              <ArrowUpRight size={16} className="text-[var(--color-success)]" />
              Entradas no Período
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              <AnimatedNumber value={extrato?.totalIn || 0} format="currency" />
            </div>
          </Card>
          
          <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-accent-danger)]">
            <span className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
              <ArrowDownRight size={16} className="text-[var(--color-accent-danger)]" />
              Saídas no Período
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              <AnimatedNumber value={extrato?.totalOut || 0} format="currency" />
            </div>
          </Card>

          <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary)]/5">
            <span className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
              <Wallet size={16} className="text-[var(--color-primary)]" />
              Saldo Consolidado
            </span>
            <div className="mt-2 text-3xl font-display font-bold text-[var(--text-primary)]">
              <AnimatedNumber value={extrato?.balance || 0} format="currency" />
            </div>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
            <h3 className="font-semibold text-[var(--text-primary)]">Lançamentos do Período</h3>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="sm" text="" />
            </div>
          ) : extrato?.transactions.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
              <p className="text-[var(--text-tertiary)] font-medium">Nenhum lançamento encontrado.</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1 opacity-70">
                Importe planilhas ou adicione transações para ver o histórico.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {extrato?.transactions.map((tx: any, i: number) => {
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
                        <Icon size={20} />
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                          {tx.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                            <Calendar size={12} />
                            {formatDate(tx.occurred_at)}
                          </span>
                          
                          {tx.store_name && (
                            <span className="flex items-center gap-1">
                              • Loja: {tx.store_name}
                            </span>
                          )}

                          {tx.payment_method && (
                            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                              • {getIconForMethod(tx.payment_method)}
                              {tx.payment_method}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 text-right">
                      <div className={`font-mono font-semibold text-lg ${
                        isIn ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-danger)]'
                      }`}>
                        {isIn ? '+' : '-'} <AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                      </div>
                      {tx.os_number && (
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">
                          OS: {tx.os_number}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
