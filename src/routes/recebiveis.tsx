import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getDefaultDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  UploadCloud, 
  Edit3, 
  Trash2,
  Calendar
} from 'lucide-react';
import { 
  useReceivablesByDate, 
  ReceivableItem, 
  useMarkReceived, 
  useDeleteReceivable 
} from '@/hooks/useRecebiveis';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ReceivableFormModal } from '@/components/recebiveis/ReceivableFormModal';
import { ImportRecebiveisModal } from '@/components/recebiveis/ImportRecebiveisModal';
import { toast } from 'sonner';

export const Route = createFileRoute('/recebiveis')({
  component: RecebiveisPage,
});

type FilterTab = 'todas' | 'em_aberto' | 'vencidos' | 'liquidados';

function RecebiveisPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('todas');
  const [targetDate, setTargetDate] = useState<string>(() => '2026-08-25');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [formInitialStoreId, setFormInitialStoreId] = useState<string | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<ReceivableItem | null>(null);

  const { data: summaryData, isLoading: loadingRec } = useReceivablesByDate(targetDate);
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const markReceived = useMarkReceived();
  const deleteReceivable = useDeleteReceivable();

  const isLoading = loadingRec || loadingStores;

  const allItems = summaryData?.items || [];
  const totalAberto = summaryData?.totalPending || 0;
  const totalVencidos = summaryData?.totalOverdue || 0;
  const totalAVencerHoje = summaryData?.totalDueToday || 0;
  const totalRecebido = summaryData?.totalReceived || 0;

  const pendentes = allItems.filter(r => r.status === 'pendente');
  const vencidos = allItems.filter(r => r.temporal_status === 'vencido');
  const recebidos = allItems.filter(r => r.status === 'recebido');

  // Identifica apenas as lojas que POSSUEM títulos para o dropdown de filtro
  const activeStores = Array.from(new Set(allItems.map(i => i.store_id))).map(storeId => {
    const storeObj = stores.find(s => s.id === storeId);
    return {
      id: storeId,
      name: storeObj ? storeObj.name : storeId
    };
  });

  const filtered = allItems.filter(r => {
    if (activeTab === 'em_aberto' && r.status !== 'pendente') return false;
    if (activeTab === 'vencidos' && r.temporal_status !== 'vencido') return false;
    if (activeTab === 'liquidados' && r.status !== 'recebido') return false;

    if (selectedStore !== 'todas' && r.store_id !== selectedStore) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchStore = String(r.store_name || '').toLowerCase().includes(q);
      const matchDesc = String(r.description || '').toLowerCase().includes(q);
      const matchType = String(r.type || '').toLowerCase().includes(q);
      const matchOs = String(r.os_number || '').toLowerCase().includes(q);
      if (!matchStore && !matchDesc && !matchType && !matchOs) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleTabChange = (t: FilterTab) => { setActiveTab(t); setPage(1); };
  const handleSearchChange = (val: string) => { setSearchQuery(val); setPage(1); };
  const handleStoreChange = (val: string) => { setSelectedStore(val); setPage(1); };

  const handleOpenAdd = (storeId?: string) => {
    setEditingItem(null);
    setFormInitialStoreId(storeId);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: ReceivableItem) => {
    setEditingItem(item);
    setFormInitialStoreId(item.store_id);
    setIsFormModalOpen(true);
  };

  const handleQuickReceive = async (item: ReceivableItem) => {
    try {
      await markReceived.mutateAsync({
        id: item.id,
        paidValue: item.value
      });
      toast.success(`Título de ${formatCurrency(item.value)} baixado com sucesso!`);
    } catch (err: any) {
      toast.error('Erro ao baixar título: ' + (err.message || err));
    }
  };

  const handleDelete = async (item: ReceivableItem) => {
    if (!window.confirm(`Deseja realmente excluir "${item.description}"?`)) return;
    try {
      await deleteReceivable.mutateAsync(item.id);
      toast.success('Título excluído com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || err));
    }
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <span className="hover:text-[var(--text-primary)] cursor-pointer transition-colors">Financeiro</span>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-medium">Recebíveis</span>
        </div>

        {/* Header Canônico com cores do Design System */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-3xl">Recebíveis</h1>
              <Badge variant="success" className="uppercase tracking-wider">
                {pendentes.length} {pendentes.length === 1 ? 'título em aberto' : 'títulos em aberto'}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Controle de boletos, títulos e valores a receber por filial (Pilar 3 da Conciliação).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Seletor de Competência */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-white/10 rounded-[var(--radius-md)] px-3 py-2 text-sm text-white">
              <Calendar size={14} className="text-[var(--text-tertiary)]" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => { setTargetDate(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>

            {/* Busca */}
            <div className="relative flex-1 lg:w-60">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar loja, descrição, OS..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-white/10 rounded-[var(--radius-md)] pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {/* Select de Loja (Apenas Lojas com Recebíveis) */}
            <select
              value={selectedStore}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="bg-[var(--bg-surface)] border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2.5rem' }}
            >
              <option value="todas">Todas as lojas</option>
              {activeStores.map(s => (
                <option key={s.id} value={s.id}>{s.name?.replace('Loja ', '')}</option>
              ))}
            </select>

            {/* Botões de Ação com Estilo Canônico */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs py-2 px-3.5 border-white/10 text-white hover:bg-white/5"
            >
              <UploadCloud size={14} />
              Importar Planilha
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 text-xs py-2 px-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium shadow-sm"
            >
              <Plus size={14} />
              Novo Recebível
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="sm" text="" />
          </div>
        ) : (
          <>
            {/* 4 Summary Cards Canônicos (border-l-4) com Valores Diretos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[var(--color-primary)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total a Receber</p>
                <p className="font-display font-bold text-2xl text-[var(--color-primary)] font-mono">
                  {formatCurrency(totalAberto)}
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Vencidos</p>
                <p className="font-display font-bold text-2xl text-[var(--color-accent-danger)] font-mono">
                  {formatCurrency(totalVencidos)}
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-warning)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">A Vencer Hoje</p>
                <p className="font-display font-bold text-2xl text-[var(--text-primary)] font-mono">
                  {formatCurrency(totalAVencerHoje)}
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-teal)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Liquidados no Período</p>
                <p className="font-display font-bold text-2xl text-[var(--color-accent-teal)] font-mono">
                  {formatCurrency(totalRecebido)}
                </p>
              </Card>
            </div>

            {/* Tabs de Filtro de Status */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-px flex-wrap gap-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <TabBtn active={activeTab === 'todas'} onClick={() => handleTabChange('todas')}>
                  Todas ({allItems.length})
                </TabBtn>
                <TabBtn active={activeTab === 'em_aberto'} onClick={() => handleTabChange('em_aberto')}>
                  Em Aberto ({pendentes.length})
                </TabBtn>
                <TabBtn active={activeTab === 'vencidos'} onClick={() => handleTabChange('vencidos')}>
                  Vencidos ({vencidos.length})
                </TabBtn>
                <TabBtn active={activeTab === 'liquidados'} onClick={() => handleTabChange('liquidados')}>
                  Liquidados ({recebidos.length})
                </TabBtn>
              </div>
            </div>

            {/* Timeline List */}
            <Card className="p-0 overflow-hidden mt-4">
              {paginatedData.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[var(--text-secondary)] font-medium">Nenhum título a receber encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {paginatedData.map((r, i) => {
                    const isRecebido = r.status === 'recebido';
                    const isVencido = r.temporal_status === 'vencido';

                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors group ${
                          isRecebido ? 'opacity-70 bg-zinc-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 sm:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isRecebido ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                            isVencido ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' :
                            'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          }`}>
                            <DollarSign size={18} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors text-sm">
                                {r.description}
                              </h4>
                              <Badge
                                variant={
                                  isRecebido ? 'success' :
                                  isVencido ? 'danger' : 'warning'
                                }
                                className="text-[10px]"
                              >
                                {isRecebido ? 'Liquidado' : isVencido ? 'Vencido' : 'Pendente'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                              <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] uppercase">
                                {r.type}
                              </span>

                              {r.os_number && (
                                <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-300 font-mono text-[10px]">
                                  OS #{r.os_number}
                                </span>
                              )}

                              {r.installment && (
                                <span className="bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[10px]">
                                  Parc. {r.installment}
                                </span>
                              )}

                              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                Loja: {r.store_name?.replace('Loja ', '')}
                              </span>

                              <span className="flex items-center gap-1 text-[var(--text-secondary)] font-mono">
                                Vencimento: {r.due_date.split('-').reverse().join('/')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0">
                          <div className="text-right">
                            <div className={`font-mono font-bold text-lg ${
                              isRecebido ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'
                            }`}>
                              {formatCurrency(r.value)}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">
                              Competência: {r.date.split('-').reverse().join('/')}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isRecebido && (
                              <button
                                type="button"
                                onClick={() => handleQuickReceive(r)}
                                disabled={markReceived.isPending}
                                title="Baixar / Liquidar Título"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                <CheckCircle2 size={14} />
                                Baixar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              title="Editar Título"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(r)}
                              disabled={deleteReceivable.isPending}
                              title="Excluir Título"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Paginação Canônica */}
              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    Página {page} de {totalPages} ({filtered.length} títulos)
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
            </Card>
          </>
        )}

        {/* Modais */}
        <ReceivableFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          targetDate={targetDate}
          initialStoreId={formInitialStoreId}
          editItem={editingItem}
        />

        <ImportRecebiveisModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          targetDate={targetDate}
        />
      </div>
    </AppShell>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
        active
          ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}
