import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { getDefaultDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRecebiveis } from '@/hooks/useRecebiveis';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/recebiveis')({
  component: RecebiveisPage,
});

type FilterTab = 'todos' | 'pendente' | 'recebido' | 'vencido';

function RecebiveisPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Padrão: início do mês atual até fim do mês atual
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const { data: recebiveis = [], isLoading: loadingRec } = useRecebiveis({ startDate, endDate });
  const { data: stores = [], isLoading: loadingStores } = useStores();

  const isLoading = loadingRec || loadingStores;

  const pendentes = recebiveis.filter(r => r.status === 'pendente');
  const recebidos = recebiveis.filter(r => r.status === 'recebido');
  const vencidos = recebiveis.filter(r => r.status === 'vencido');

  const totalReceber = pendentes.reduce((a, r) => a + Number(r.value || 0), 0);
  const totalVencidos = vencidos.reduce((a, r) => a + Number(r.value || 0), 0);
  
  const todayStr = getDefaultDate();
  
  const totalRecebidoHoje = recebidos
    .filter(r => r.due_date === todayStr)
    .reduce((a, r) => a + Number(r.value || 0), 0);
    
  const totalAVencerHoje = pendentes
    .filter(r => r.due_date === todayStr)
    .reduce((a, r) => a + Number(r.value || 0), 0);

  const filtered = recebiveis.filter(r => {
    if (activeTab !== 'todos' && r.status !== activeTab) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesStore = String(r.store_name || '').toLowerCase().includes(q);
      const matchesType = String(r.type || '').toLowerCase().includes(q);
      if (!matchesStore && !matchesType) return false;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleTabChange = (t: FilterTab) => { setActiveTab(t); setPage(1); };
  const handleSearchChange = (val: string) => { setSearchQuery(val); setPage(1); };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <Link to="/conciliacao" className="hover:text-[var(--text-primary)] transition-colors">Financeiro</Link>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-medium">Recebíveis</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl">Recebíveis</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Valores a receber por forma de pagamento e vencimento.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] px-3 py-1.5 text-sm w-full sm:w-auto">
              <span className="text-[var(--text-tertiary)]">De:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
              <span className="text-[var(--text-tertiary)] ml-2">Até:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <div className="w-full sm:w-64 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar loja, tipo..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="sm" text="" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[var(--color-primary)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Total a Receber</span>
                  <DollarSign size={16} className="text-[var(--color-primary)]" />
                </div>
                <div className="font-display text-2xl font-bold">
                  <AnimatedNumber value={totalReceber} format="currency" />
                </div>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Vencidos</span>
                  <AlertTriangle size={16} className="text-[var(--color-accent-danger)]" />
                </div>
                <div className="font-display text-2xl font-bold text-[var(--color-accent-danger)]">
                  <AnimatedNumber value={totalVencidos} format="currency" />
                </div>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-warning)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">A Vencer Hoje</span>
                  <Clock size={16} className="text-[var(--color-accent-warning)]" />
                </div>
                <div className="font-display text-2xl font-bold">
                  <AnimatedNumber value={totalAVencerHoje} format="currency" />
                </div>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-teal)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Recebidos Hoje</span>
                  <CheckCircle2 size={16} className="text-[var(--color-accent-teal)]" />
                </div>
                <div className="font-display text-2xl font-bold text-[var(--color-accent-teal)]">
                  <AnimatedNumber value={totalRecebidoHoje} format="currency" />
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-px overflow-x-auto">
              <TabBtn active={activeTab === 'todos'} onClick={() => handleTabChange('todos')}>Todos</TabBtn>
              <TabBtn active={activeTab === 'pendente'} onClick={() => handleTabChange('pendente')}>Pendentes ({pendentes.length})</TabBtn>
              <TabBtn active={activeTab === 'recebido'} onClick={() => handleTabChange('recebido')}>Recebidos ({recebidos.length})</TabBtn>
              <TabBtn active={activeTab === 'vencido'} onClick={() => handleTabChange('vencido')}>Vencidos ({vencidos.length})</TabBtn>
            </div>

            {/* Timeline List */}
            <Card className="p-0 overflow-hidden mt-4">
              {paginatedData.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[var(--text-secondary)] font-medium">Nenhum recebível encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {paginatedData.map((r, i) => {
                    const storeName = stores.find(s => s.id === r.store_id)?.name || r.store_id;
                    const isRecebido = r.status === 'recebido';
                    const isVencido = r.status === 'vencido';
                    
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 sm:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isRecebido ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                            isVencido ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' :
                            'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]'
                          }`}>
                            <DollarSign size={18} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors text-sm">
                                {storeName?.replace('Loja ', '')}
                              </h4>
                              <Badge
                                variant={
                                  isRecebido ? 'success' :
                                  isVencido ? 'danger' : 'warning'
                                }
                                className="text-[10px]"
                              >
                                {isRecebido ? 'Recebido' : isVencido ? 'Vencido' : 'Pendente'}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                              <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] uppercase">
                                {r.type}
                              </span>
                              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                Vencimento: {new Date(r.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 text-right">
                          <div className={`font-mono font-bold text-lg ${
                            isRecebido ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'
                          }`}>
                            R$ {Number(r.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-1">
                            Lançado em: {new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              {/* Pagination */}
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
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}
