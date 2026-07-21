import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { ArrowLeft, Store } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { RedeVsExtratoTable } from '@/components/conciliacao/RedeVsExtratoTable';
import { TransactionRow } from '@/lib/supabase';
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
  const totalJuros = transactions.filter(t => t.source === 'rede_taxa').reduce((acc, t) => acc + Number(t.amount || 0), 0);

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

        <Card className="p-0 overflow-hidden">
          <RedeVsExtratoTable storeId={lojaId} date={targetDate} />
        </Card>
      </div>
    </AppShell>
  );
}
