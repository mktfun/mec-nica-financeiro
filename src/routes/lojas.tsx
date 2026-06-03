import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ChevronRight, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';

import { StoreFormDialog } from '@/components/dashboard/StoreFormDialog';
import { useState, useMemo } from 'react';
import { StoreRow, ReconciliationRow } from '@/lib/supabase';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { useConciliacaoDetalhes } from '@/hooks/useConciliacao';
import { useAllStoresBalances } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/lojas')({
  component: LojasPage,
});

function LojasPage() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreRow | undefined>();
  const [search, setSearch] = useState('');

  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: conciliations = [], isLoading: loadingConciliations } = useConciliacaoDetalhes();
  const { data: allBalances = {}, isLoading: loadingBalances } = useAllStoresBalances();
  const deleteMutation = useDeleteStore();

  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [stores, search]);

  const isLoading = loadingStores || loadingConciliations || loadingBalances;

  const handleEdit = (store: StoreRow) => {
    setStoreToEdit(store);
    setIsFormOpen(true);
  };

  const handleDelete = async (store: StoreRow) => {
    if (confirm(`Tem certeza que deseja excluir a loja ${store.name}?`)) {
      await deleteMutation.mutateAsync(store.id);
    }
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="font-display font-bold text-3xl mb-2">Lojas da Rede</h1>
            <p className="text-[var(--text-secondary)] text-sm">Visão consolidada do fluxo de caixa e conciliação por unidade.</p>
          </div>
          <Button variant="primary" onClick={() => { setStoreToEdit(undefined); setIsFormOpen(true); }} className="gap-2">
            <Plus size={16} /> Nova Loja
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar loja por nome ou ID..." 
            className="pl-12 h-14 bg-[var(--bg-surface-elevated)] border-transparent rounded-[var(--radius-full)] text-lg"
          />
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner size="sm" text="" />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center p-8 text-[var(--text-tertiary)]">Nenhuma loja encontrada.</div>
          ) : (
            filteredStores.map((store) => {
              const rec = conciliations.find(c => c.store_id === store.id) || null;
              const status = rec?.status || 'pending';
              const divergence = rec?.divergence || 0;
              const financialTotal = rec?.financial_total || 0;

              return (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card 
                    variant="glass" 
                    className="p-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer group flex items-center justify-between"
                    onClick={() => navigate({ to: '/loja/$lojaId', params: { lojaId: store.id } })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--bg-canvas)]">
                        <img src={store.avatar_url || ''} alt={store.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-lg">{store.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={status === 'approved' ? 'success' : status === 'divergence' ? 'danger' : 'warning'}>
                            {status === 'approved' ? 'Conciliado' : status === 'divergence' ? 'Divergência' : 'Pendente'}
                          </Badge>
                          <span className="text-xs text-[var(--text-tertiary)]">ID: {store.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-sm text-[var(--text-secondary)]">Saldo Real</p>
                        <p className="font-display font-semibold"><AnimatedNumber value={allBalances[store.id] || 0} format="currency" /></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--text-secondary)]">Status Caixa</p>
                        <p className={`font-display font-bold ${divergence !== 0 ? 'text-[var(--color-accent-danger)]' : 'text-[var(--text-primary)]'}`}>
                          {divergence !== 0 ? (
                            <span>-<AnimatedNumber value={Math.abs(divergence)} format="currency" /></span>
                          ) : status === 'pending' ? (
                            <span className="text-[var(--text-tertiary)] text-sm">Pendente</span>
                          ) : (
                            "Bateu"
                          )}
                        </p>
                      </div>
                      <ChevronRight className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>



        <StoreFormDialog 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          storeToEdit={storeToEdit}
        />
      </div>
    </AppShell>
  );
}

