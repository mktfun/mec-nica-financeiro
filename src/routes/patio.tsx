import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { usePatioOS } from '@/hooks/usePatio';
import { useStores } from '@/hooks/useStores';

export const Route = createFileRoute('/patio')({
  component: PatioPage,
});

type FilterTab = 'todas' | 'em_aberto' | 'pago_parcial' | 'finalizado';

function PatioPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: patioData = [], isLoading: isLoadingPatio } = usePatioOS();
  const { data: stores = [], isLoading: isLoadingStores } = useStores();

  const isLoading = isLoadingPatio || isLoadingStores;

  const emAberto = patioData.filter(os => os.status === 'em_aberto');
  const pagoParcial = patioData.filter(os => os.status === 'pago_parcial');
  
  const totalEmAberto = emAberto.reduce((a, os) => a + Number(os.total_value || 0) - Number(os.paid_value || 0), 0);
  const maiorOS = patioData.length > 0 ? Math.max(...patioData.map(os => Number(os.total_value || 0))) : 0;
  const maiorOSRecord = patioData.find(os => Number(os.total_value || 0) === maiorOS);
  const maiorOSStoreName = stores.find(s => s.id === maiorOSRecord?.store_id)?.name || '';

  const filtered = patioData
    .filter(os => activeTab === 'todas' || os.status === activeTab)
    .filter(os => selectedStore === 'todas' || os.store_id === selectedStore)
    .filter(os => {
      if (searchQuery === '') return true;
      const q = searchQuery.toLowerCase();
      const storeName = stores.find(s => s.id === os.store_id)?.name.toLowerCase() || '';
      return (os.os_number?.toLowerCase().includes(q)) || 
             (os.plate?.toLowerCase().includes(q)) ||
             storeName.includes(q);
    });

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <Link to="/conciliacao" className="hover:text-[var(--text-primary)] transition-colors">Financeiro</Link>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-medium">Carros no Pátio</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-3xl">Carros no Pátio</h1>
            <Badge variant="success" className="text-xs">{emAberto.length} OS em aberto</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
              <input
                type="text"
                placeholder="Buscar OS, placa, loja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--color-primary)] w-56"
              />
            </div>
            <select 
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] max-w-[200px] truncate"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="todas">Todas as lojas</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-[var(--text-secondary)]">Ordens de serviço abertas e pagamentos pendentes lidos diretamente do Supabase.</p>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">● Total em Aberto</span>
                <div className="font-display text-2xl font-bold mt-1">
                  <AnimatedNumber value={totalEmAberto} format="currency" />
                </div>
              </Card>
              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">● Maior OS</span>
                <div className="font-display text-2xl font-bold mt-1">
                  <AnimatedNumber value={maiorOS} format="currency" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{maiorOSStoreName}</p>
              </Card>
              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">● Sem Pagamento</span>
                <div className="font-display text-2xl font-bold mt-1">{emAberto.length} OS</div>
              </Card>
              <Card className="border-l-4 border-l-[var(--color-accent-danger)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">● Pagas Parcialmente</span>
                <div className="font-display text-2xl font-bold mt-1">{pagoParcial.length} OS</div>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
              <TabBtn active={activeTab === 'todas'} onClick={() => setActiveTab('todas')}>Todas</TabBtn>
              <TabBtn active={activeTab === 'em_aberto'} onClick={() => setActiveTab('em_aberto')}>Em Aberto</TabBtn>
              <TabBtn active={activeTab === 'pago_parcial'} onClick={() => setActiveTab('pago_parcial')}>Pagas Parcial</TabBtn>
              <TabBtn active={activeTab === 'finalizado'} onClick={() => setActiveTab('finalizado')}>Finalizadas Hoje</TabBtn>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                    <th className="text-left py-3 px-4 font-medium">OS #</th>
                    <th className="text-left py-3 px-4 font-medium">Loja</th>
                    <th className="text-left py-3 px-4 font-medium">Placa</th>
                    <th className="text-right py-3 px-4 font-medium">Valor Total ↕</th>
                    <th className="text-right py-3 px-4 font-medium">Valor Pago</th>
                    <th className="text-left py-3 px-4 font-medium">Forma Pgto</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-tertiary)]">Nenhuma ordem de serviço encontrada.</td>
                    </tr>
                  ) : filtered.map((os, i) => {
                    const storeName = stores.find(s => s.id === os.store_id)?.name || os.store_id;
                    const totalVal = Number(os.total_value || 0);
                    const paidVal = Number(os.paid_value || 0);
                    
                    return (
                      <motion.tr
                        key={os.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === os.id ? null : os.id)}
                      >
                        <td className="py-3.5 px-4 font-medium">{os.os_number}</td>
                        <td className="py-3.5 px-4">{storeName}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">{os.plate}</td>
                        <td className="py-3.5 px-4 text-right font-display font-semibold">
                          <AnimatedNumber value={totalVal} format="currency" />
                        </td>
                        <td className={`py-3.5 px-4 text-right font-display ${paidVal > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {paidVal > 0 ? <AnimatedNumber value={paidVal} format="currency" /> : 'R$ 0,00'}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">{os.payment_method || '-'}</td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              os.status === 'finalizado' ? 'success' :
                              os.status === 'pago_parcial' ? 'warning' : 'danger'
                            }
                          >
                            {os.status === 'finalizado' ? 'Finalizado' :
                            os.status === 'pago_parcial' ? 'Pago parcial' : 'Em aberto'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[var(--text-tertiary)]">{os.days_open || 0}d</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
