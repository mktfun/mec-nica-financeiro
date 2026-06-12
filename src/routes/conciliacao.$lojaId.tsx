import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, CheckCircle2, Store
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useTripleMatch } from '@/hooks/useTripleMatch';
import { useExtrato } from '@/hooks/useTransactions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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

function ConciliacaoLojaPage() {
  const { lojaId } = useParams({ from: '/conciliacao/$lojaId' });
  const { date } = Route.useSearch();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  
  const { data: extrato, isLoading: loadingExtrato } = useExtrato(lojaId, targetDate, targetDate);
  const { data: tripleMatchData = [], isLoading: loadingTripleMatch } = useTripleMatch(lojaId, targetDate, targetDate);

  const [tab, setTab] = useState<'triple-match' | 'extrato'>('triple-match');

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

  const transactions = extrato?.transactions || [];

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
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Store size={24} />
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-3xl">Conciliação: {store.name}</h1>
              <p className="text-[var(--text-secondary)]">Data alvo: {formatDate(targetDate)}</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-[var(--border-subtle)] mb-4">
          <button
            onClick={() => setTab('triple-match')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'triple-match' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
          >
            Triple Match (Pátio x Maquininha x Banco)
          </button>
          <button
            onClick={() => setTab('extrato')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'extrato' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
          >
            Extrato Bancário do Dia
          </button>
        </div>

        <Card className="p-0 overflow-hidden">
          {tab === 'triple-match' ? (
            loadingTripleMatch ? (
              <div className="flex justify-center p-12"><LoadingSpinner size="sm" text="Carregando Conciliação 3-WAY..." /></div>
            ) : tripleMatchData.length === 0 ? (
              <div className="text-center py-20">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-30" />
                <p className="text-[var(--text-secondary)] font-medium">Nenhum dado de conciliação neste dia.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
                      <th className="py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Data</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Origem (OS) + Juros</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Maquininha (D+1)</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Extrato (OFX)</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {tripleMatchData.map((row) => (
                      <tr key={row.date} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{formatDate(row.date)}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-[var(--text-primary)]">R$ {row.osEstimatedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            {row.osAmount > row.osEstimatedAmount && (
                              <span className="text-[10px] text-[var(--text-tertiary)]">Bruto: R$ {row.osAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[var(--text-primary)]">R$ {row.machineAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[var(--text-primary)]">R$ {row.ofxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          {row.status === 'approved' ? (
                            <Badge variant="success">Bateu</Badge>
                          ) : (
                            <Badge variant="danger">Divergente</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            loadingExtrato ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="sm" text="" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20">
                <Wallet size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-30" />
                <p className="text-[var(--text-secondary)] font-medium">Nenhum lançamento encontrado neste dia.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {transactions.map((tx: any, i: number) => {
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
              </div>
            )
          )}
        </Card>
      </div>
    </AppShell>
  );
}
