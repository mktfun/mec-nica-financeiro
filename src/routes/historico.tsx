import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useStores } from '@/hooks/useStores';

export const Route = createFileRoute('/historico')({
  component: HistoricoPage,
});

const iconMap = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  alert: AlertTriangle,
  bank: Building2,
};

function HistoricoPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: stores = [], isLoading: loadingStores } = useStores();

  const isLoading = loadingTx || loadingStores;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display font-bold text-3xl">Histórico de Transações</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Todas as movimentações financeiras da rede lidas do Supabase.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-12 text-[var(--text-tertiary)]">Nenhuma transação registrada.</div>
        ) : (
          <div className="flex flex-col">
            {transactions.map((tx, i) => {
              // Decide icon based on type and category
              const iconKey = tx.type === 'in' ? 'in' : tx.category === 'divergence' ? 'alert' : 'out';
              const Icon = iconMap[iconKey];
              const isExpanded = expandedId === tx.id;
              
              const storeName = stores.find(s => s.id === tx.store_id)?.name || tx.store_id;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className="flex items-center justify-between py-4 border-b border-[var(--border-subtle)] cursor-pointer group hover:bg-[var(--bg-surface-hover)] px-4 -mx-4 rounded-[var(--radius-md)] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        iconKey === 'alert' ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' :
                        iconKey === 'in' ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]' :
                        'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">{tx.description}</h4>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {tx.category} • {new Date(tx.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-semibold font-display text-right ${
                        tx.type === 'in' ? 'text-[var(--color-accent-teal)]' :
                        iconKey === 'alert' ? 'text-[var(--color-accent-danger)]' :
                        'text-[var(--text-primary)]'
                      }`}>
                        {tx.type === 'in' ? '+' : '-'}<AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[var(--bg-surface-elevated)] rounded-[var(--radius-md)] p-4 mb-2 ml-16 text-sm space-y-2 border border-[var(--border-subtle)]"
                    >
                      {tx.store_id && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Loja</span>
                          <span className="font-medium">{storeName}</span>
                        </div>
                      )}
                      {tx.os_number && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">OS</span>
                          <span className="font-medium">{tx.os_number}</span>
                        </div>
                      )}
                      {tx.payment_method && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Forma de Pagamento</span>
                          <span className="font-medium uppercase">{tx.payment_method}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Tipo</span>
                        <Badge variant={tx.type === 'in' ? 'success' : iconKey === 'alert' ? 'danger' : 'neutral'}>
                          {tx.type === 'in' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
