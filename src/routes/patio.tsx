import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { usePatioOS, PatioRow } from '@/hooks/usePatio';
import { useStores } from '@/hooks/useStores';

export const Route = createFileRoute('/patio')({
  component: PatioPage,
});

type FilterTab = 'todas' | 'em_aberto' | 'pago_parcial' | 'finalizadas_periodo';

function PatioPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('todas');
  const [selectedOs, setSelectedOs] = useState<PatioRow | null>(null);
  
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  const { data: patioData = [], isLoading: loadingPatio } = usePatioOS();
  const { data: stores = [], isLoading: loadingStores } = useStores();

  const isLoading = loadingPatio || loadingStores;

  const totalAberto = patioData.reduce((a, os) => a + (Number(os.total_value) - Number(os.paid_value)), 0);
  
  const openOs = patioData.filter(os => os.status === 'em_aberto' || os.status === 'pago_parcial');
  const maxOsValue = openOs.length > 0 ? Math.max(...openOs.map(os => Number(os.total_value))) : 0;
  const noPayment = patioData.filter(os => os.status === 'em_aberto').length;
  const partialPayment = patioData.filter(os => os.status === 'pago_parcial').length;

  const filtered = patioData.filter(os => {
    // Tab filter
    if (activeTab === 'em_aberto' && os.status !== 'em_aberto') return false;
    if (activeTab === 'pago_parcial' && os.status !== 'pago_parcial') return false;
    if (activeTab === 'finalizadas_periodo') {
      if (os.status !== 'finalizado') return false;
      const closed = os.closed_at || os.updated_at.split('T')[0];
      if (closed < startDate || closed > endDate) return false;
    }

    // Store filter
    if (selectedStore !== 'todas' && os.store_id !== selectedStore) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesOs = String(os.os_number).toLowerCase().includes(q);
      const matchesPlate = String(os.plate || '').toLowerCase().includes(q);
      const matchesStore = String(os.store_name || '').toLowerCase().includes(q);
      if (!matchesOs && !matchesPlate && !matchesStore) return false;
    }

    return true;
  });

  const renderPaymentMethods = (str: string | null) => {
    if (!str || str.trim() === '') return <span className="text-[var(--text-tertiary)]">-</span>;
    const parts = str.split(';').filter(p => p.trim());
    return (
      <div className="flex flex-wrap gap-1">
        {parts.map((p, i) => {
          const [method, val] = p.split(':');
          return (
            <span key={i} className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px]">
              <span className="font-medium text-[var(--text-secondary)]">{method?.trim()}</span>
              {val && <span className="text-white">R$ {parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <span className="hover:text-[var(--text-primary)] cursor-pointer transition-colors">Financeiro</span>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-medium">Carros no Pátio</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-3xl">Carros no Pátio</h1>
              <Badge variant="success" className="uppercase tracking-wider">{openOs.length} OS em aberto</Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Ordens de serviço abertas e pagamentos pendentes lidos diretamente do Supabase.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar OS, placa, loja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2.5rem' }}
            >
              <option value="todas">Todas as lojas</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

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
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total em Aberto</p>
                <p className="font-display font-bold text-2xl text-[var(--color-accent-danger)]">
                  <AnimatedNumber value={totalAberto} format="currency" />
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-warning)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Maior OS</p>
                <p className="font-display font-bold text-2xl">
                  <AnimatedNumber value={maxOsValue} format="currency" />
                </p>
              </Card>

              <Card className="border-l-4 border-l-white/20">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Sem Pagamento</p>
                <p className="font-display font-bold text-2xl text-white">
                  {noPayment} <span className="text-sm font-normal text-[var(--text-tertiary)]">OS</span>
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-teal)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Pagas Parcialmente</p>
                <p className="font-display font-bold text-2xl text-white">
                  {partialPayment} <span className="text-sm font-normal text-[var(--text-tertiary)]">OS</span>
                </p>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-px flex-wrap gap-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <TabBtn active={activeTab === 'todas'} onClick={() => setActiveTab('todas')}>Todas</TabBtn>
                <TabBtn active={activeTab === 'em_aberto'} onClick={() => setActiveTab('em_aberto')}>Em Aberto</TabBtn>
                <TabBtn active={activeTab === 'pago_parcial'} onClick={() => setActiveTab('pago_parcial')}>Pagas Parcial</TabBtn>
                <TabBtn active={activeTab === 'finalizadas_periodo'} onClick={() => setActiveTab('finalizadas_periodo')}>Finalizadas (Período)</TabBtn>
              </div>
              
              {activeTab === 'finalizadas_periodo' && (
                <div className="flex items-center gap-2 mb-2 lg:mb-0">
                  <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Período:</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <span className="text-[var(--text-tertiary)]">até</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                    <th className="text-left py-3 px-4 font-medium">OS #</th>
                    <th className="text-left py-3 px-4 font-medium">Loja</th>
                    <th className="text-left py-3 px-4 font-medium">Placa</th>
                    <th className="text-right py-3 px-4 font-medium flex items-center justify-end gap-1">Valor Total <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg></th>
                    <th className="text-right py-3 px-4 font-medium">Valor Pago</th>
                    <th className="text-left py-3 px-4 font-medium">Forma Pgto</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-tertiary)]">Nenhuma ordem de serviço encontrada.</td>
                    </tr>
                  ) : filtered.map((os, i) => (
                    <motion.tr
                      key={os.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setSelectedOs(os)}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium">{os.os_number}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] font-medium">
                        {os.store_name?.replace('Loja ', '')}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] text-xs uppercase tracking-widest">{os.plate || '-'}</td>
                      <td className="py-3 px-4 text-right font-display font-bold">
                        R$ {Number(os.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-medium text-[var(--color-primary-bright)]">
                        R$ {Number(os.paid_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">{renderPaymentMethods(os.payment_method)}</td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            os.status === 'finalizado' ? 'success' : 
                            os.status === 'pago_parcial' ? 'warning' : 'danger'
                          } 
                          className="text-[10px]"
                        >
                          {os.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-tertiary)]">{os.days_open || 0}d</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal isOpen={!!selectedOs} onClose={() => setSelectedOs(null)} title={`Detalhes da OS #${selectedOs?.os_number}`}>
        {selectedOs && (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Loja</span>
                <span className="font-medium text-white">{selectedOs.store_name}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Placa</span>
                <span className="font-mono text-white">{selectedOs.plate || 'Não informada'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Data de Abertura</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedOs.opened_at ? new Date(selectedOs.opened_at).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
              {selectedOs.closed_at && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Data de Fechamento</span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {new Date(selectedOs.closed_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-lg border border-white/10">
              <h4 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Financeiro</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary)]">Valor Total da OS:</span>
                  <span className="font-bold text-white">R$ {Number(selectedOs.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary)]">Valor Pago (Liquidado):</span>
                  <span className="font-bold text-[var(--color-primary-bright)]">R$ {Number(selectedOs.paid_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedOs.total_value) - Number(selectedOs.paid_value) > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10 mt-2">
                    <span className="text-[var(--text-secondary)]">Saldo em Aberto (A Pagar):</span>
                    <span className="font-bold text-[var(--color-accent-danger)]">R$ {(Number(selectedOs.total_value) - Number(selectedOs.paid_value)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedOs.payment_method && (
              <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-lg border border-white/10">
                <h4 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Formas de Pagamento Extratadas</h4>
                {renderPaymentMethods(selectedOs.payment_method)}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelectedOs(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AppShell>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}
