import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { mockStores } from '@/mock/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { StoreDetailsSheet } from '@/components/dashboard/StoreDetailsSheet';
import { useState } from 'react';
import { MockStore } from '@/mock/data';

export const Route = createFileRoute('/lojas')({
  component: LojasPage,
});
function LojasPage() {
  const [selectedStore, setSelectedStore] = useState<MockStore | null>(null);

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Lojas da Rede</h1>
          <p className="text-[var(--text-secondary)] text-sm">Visão consolidada do fluxo de caixa e conciliação por unidade.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
          <Input 
            placeholder="Pesquisar loja por nome ou ID..." 
            className="pl-12 h-14 bg-[var(--bg-surface-elevated)] border-transparent rounded-[var(--radius-full)] text-lg"
          />
        </div>

        <div className="flex flex-col gap-3">
          {mockStores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                variant="glass" 
                className="p-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer group flex items-center justify-between"
                onClick={() => setSelectedStore(store)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--bg-canvas)]">
                    <img src={store.avatarUrl} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-lg">{store.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={store.status === 'approved' ? 'success' : store.status === 'divergence' ? 'danger' : 'warning'}>
                        {store.status === 'approved' ? 'Conciliado' : 'Divergência'}
                      </Badge>
                      <span className="text-xs text-[var(--text-tertiary)]">ID: {store.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm text-[var(--text-secondary)]">Fechamento</p>
                    <p className="font-display font-semibold"><AnimatedNumber value={store.financialTotal} format="currency" /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-secondary)]">Status Caixa</p>
                    <p className={`font-display font-bold ${store.divergence !== 0 ? 'text-[var(--color-accent-danger)]' : 'text-[var(--text-primary)]'}`}>
                      {store.divergence !== 0 ? (
                        <span>-<AnimatedNumber value={Math.abs(store.divergence)} format="currency" /></span>
                      ) : (
                        "Bateu"
                      )}
                    </p>
                  </div>
                  <ChevronRight className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <StoreDetailsSheet 
          store={selectedStore} 
          onClose={() => setSelectedStore(null)} 
        />
      </div>
    </AppShell>
  );
}
