import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBotRunHistory } from '@/hooks/useBotRuns';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { StoreFormDialog } from '@/components/dashboard/StoreFormDialog';
import { useState } from 'react';
import { StoreRow } from '@/lib/supabase';

export const Route = createFileRoute('/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: botRuns = [], isLoading: loadingBots } = useBotRunHistory();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const deleteStore = useDeleteStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreRow | undefined>();

  const handleEditStore = (store: StoreRow) => {
    setStoreToEdit(store);
    setIsFormOpen(true);
  };

  const handleDeleteStore = async (store: StoreRow) => {
    if (confirm(`Tem certeza que deseja excluir a loja ${store.name}?`)) {
      await deleteStore.mutateAsync(store.id);
    }
  };

  const lastRun = botRuns[0];

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Configurações</h1>
          <p className="text-[var(--text-secondary)] text-sm">Gerencie o comportamento do motor de conciliação autônomo e lojas.</p>
        </div>

        <div className="space-y-6">
          {/* Motor de Conciliação */}
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Motor de Conciliação</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Sincronização Automática (07:00)</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Executar o bot de coleta todos os dias de manhã.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Notificações Críticas por WhatsApp</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Avisar os sócios quando houver divergências de Pix.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>

              {lastRun && (
                <div className="mt-4 p-3 bg-[var(--bg-canvas)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <p className="text-sm font-medium">Última Execução do Bot</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-secondary)]">
                    <span>{new Date(lastRun.started_at).toLocaleString()}</span>
                    <span className={lastRun.status === 'success' ? 'text-[var(--color-accent-success)]' : 'text-[var(--color-accent-danger)]'}>
                      {lastRun.status.toUpperCase()}
                    </span>
                  </div>
                  {lastRun.log_text && <p className="text-xs mt-1 font-mono text-[var(--text-tertiary)]">{lastRun.log_text}</p>}
                </div>
              )}
            </div>
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
              <Button variant="primary" className="w-full sm:w-auto" disabled={loadingBots}>
                Forçar Execução do Motor Agora
              </Button>
            </div>
          </Card>

          {/* Gerenciamento de Lojas */}
          <Card variant="glass" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-lg">Gerenciamento de Lojas</h3>
              <Button variant="outline" size="sm" onClick={() => { setStoreToEdit(undefined); setIsFormOpen(true); }}>
                Nova Loja
              </Button>
            </div>
            {loadingStores ? (
               <div className="flex justify-center p-4">
               <svg className="animate-spin w-5 h-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
               </svg>
             </div>
            ) : (
              <div className="space-y-3">
                {stores.map(store => (
                  <div key={store.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)] text-sm">{store.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Gerente: {store.manager || 'Não definido'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditStore(store)}>Editar</Button>
                      <Button variant="outline" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30" onClick={() => handleDeleteStore(store)}>Excluir</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* IA */}
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Inteligência Artificial (LLM)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Modelo Atual</p>
                  <p className="text-sm text-[#00a87e] mt-1">Gemini 2.0 Flash (Crédito Google Ativo)</p>
                </div>
                <Button variant="outline" size="sm">Alterar Provedor</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <StoreFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        storeToEdit={storeToEdit}
      />
    </AppShell>
  );
}
