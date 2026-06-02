import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { usePatioOS, PatioOSRow } from '@/hooks/usePatio';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Clock, TrendingUp, RefreshCw, Info, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/patio')({
  component: PatioPage,
});

type FilterTab = 'todas' | 'em_aberto' | 'pago_parcial' | 'finalizadas_periodo';

function PatioPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('todas');
  const [selectedOs, setSelectedOs] = useState<PatioOSRow | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
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
    if (activeTab === 'em_aberto' && os.status !== 'em_aberto') return false;
    if (activeTab === 'pago_parcial' && os.status !== 'pago_parcial') return false;
    if (activeTab === 'finalizadas_periodo') {
      if (os.status !== 'finalizado') return false;
      const closed = os.closed_at || os.updated_at.split('T')[0];
      if (closed < startDate || closed > endDate) return false;
    }

    if (selectedStore !== 'todas' && os.store_id !== selectedStore) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesOs = String(os.os_number).toLowerCase().includes(q);
      const matchesPlate = String(os.plate || '').toLowerCase().includes(q);
      const matchesStore = String(os.store_name || '').toLowerCase().includes(q);
      if (!matchesOs && !matchesPlate && !matchesStore) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleTabChange = (t: FilterTab) => { setActiveTab(t); setPage(1); };
  const handleSearchChange = (val: string) => { setSearchQuery(val); setPage(1); };
  const handleStoreChange = (val: string) => { setSelectedStore(val); setPage(1); };

  const renderPaymentMethods = (str: string | null) => {
    if (!str || str.trim() === '') return <span className="text-[var(--text-tertiary)]">-</span>;
    const parts = str.split(';').filter(p => p.trim());
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {parts.map((p, i) => {
          const [method, val] = p.split(':');
          return (
            <span key={i} className="inline-flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded text-[10px]">
              <span className="font-medium text-[var(--text-secondary)]">{method?.trim()}</span>
              {val && <span className="text-[var(--text-primary)]">R$ {parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-[var(--radius-md)] pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            
            <select
              value={selectedStore}
              onChange={(e) => handleStoreChange(e.target.value)}
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
            <LoadingSpinner size="sm" text="" />
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

              <Card className="border-l-4 border-l-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Sem Pagamento</p>
                <p className="font-display font-bold text-2xl text-[var(--text-primary)]">
                  {noPayment} <span className="text-sm font-normal text-[var(--text-tertiary)]">OS</span>
                </p>
              </Card>

              <Card className="border-l-4 border-l-[var(--color-accent-teal)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Pagas Parcialmente</p>
                <p className="font-display font-bold text-2xl text-[var(--text-primary)]">
                  {partialPayment} <span className="text-sm font-normal text-[var(--text-tertiary)]">OS</span>
                </p>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-px flex-wrap gap-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <TabBtn active={activeTab === 'todas'} onClick={() => handleTabChange('todas')}>Todas</TabBtn>
                <TabBtn active={activeTab === 'em_aberto'} onClick={() => handleTabChange('em_aberto')}>Em Aberto</TabBtn>
                <TabBtn active={activeTab === 'pago_parcial'} onClick={() => handleTabChange('pago_parcial')}>Pagas Parcial</TabBtn>
                <TabBtn active={activeTab === 'finalizadas_periodo'} onClick={() => handleTabChange('finalizadas_periodo')}>Finalizadas (Período)</TabBtn>
              </div>
              
              {activeTab === 'finalizadas_periodo' && (
                <div className="flex items-center gap-2 mb-2 lg:mb-0">
                  <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Período:</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <span className="text-[var(--text-tertiary)]">até</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}
            </div>

            {/* Timeline List */}
            <Card className="p-0 overflow-hidden mt-4">
              {paginatedData.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[var(--text-secondary)] font-medium">Nenhuma ordem de serviço encontrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {paginatedData.map((os, i) => {
                    const isAberto = os.status === 'em_aberto';
                    const isParcial = os.status === 'pago_parcial';
                    const isFinalizado = os.status === 'finalizado';
                    
                    return (
                      <motion.div
                        key={os.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedOs(os)}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors group cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 sm:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isFinalizado ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                            isParcial ? 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]' :
                            'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]'
                          }`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors text-sm">
                                OS #{os.os_number}
                              </h4>
                              <Badge 
                                variant={
                                  isFinalizado ? 'success' : 
                                  isParcial ? 'warning' : 'danger'
                                } 
                                className="text-[10px]"
                              >
                                {os.status.replace('_', ' ')}
                              </Badge>
                              {os.days_open > 0 && !isFinalizado && (
                                <Badge variant="neutral" className="text-[10px] bg-[var(--bg-surface-hover)]">
                                  {os.days_open} dias aberta
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                              <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] uppercase">
                                {os.plate || 'SEM PLACA'}
                              </span>
                              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                Loja: {os.store_name?.replace('Loja ', '')}
                              </span>
                            </div>
                            
                            {os.payment_method && renderPaymentMethods(os.payment_method)}
                          </div>
                        </div>
                        
                        <div className="mt-3 sm:mt-0 ml-14 sm:ml-0 text-right">
                          <div className="flex flex-col gap-1 items-end">
                            <div className="text-xs text-[var(--text-secondary)]">
                              Total: <span className="font-display font-medium text-[var(--text-primary)]">R$ {Number(os.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-sm font-display font-bold text-[var(--color-primary-bright)]">
                              Pago: R$ {Number(os.paid_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
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

            <div className="pt-2 border-t border-[var(--border-subtle)] mt-4">
              <div className="bg-[var(--bg-surface-elevated)] p-4 rounded-lg border border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] opacity-5 blur-3xl rounded-full pointer-events-none" />
                <h4 className="text-sm font-display font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[var(--color-primary)]" /> Linha do Tempo (Evolução da OS)
                </h4>
                
                {(!selectedOs.history_log || !Array.isArray(selectedOs.history_log) || selectedOs.history_log.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center mb-3">
                      <CheckCircle2 size={18} />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">OS Criada</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Nenhuma alteração registrada após a criação desta OS.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {/* Nó de Criação Fixo */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-success)]/30 bg-[var(--bg-surface)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      </div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-[var(--color-success)]/5 backdrop-blur-sm p-3 rounded-lg border border-[var(--color-success)]/20 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                            {new Date(selectedOs.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[var(--color-success)] mt-1">Criação da Ordem de Serviço</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Valor inicial: R$ {Number(selectedOs.total_value).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                      </div>
                    </div>

                    {/* Histórico Real */}
                    {selectedOs.history_log.map((log: any, idx: number) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white/20 bg-[var(--bg-surface)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-bright)]" />
                        </div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.1)] hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                              {new Date(log.date).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {Array.isArray(log.changes) && log.changes.map((change: any, cIdx: number) => {
                              const isValue = change.field === 'total_value' || change.field === 'paid_value';
                              const formatVal = (v: any) => isValue ? `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : String(v).replace('_', ' ');
                              const increased = isValue && Number(change.to) > Number(change.from);
                              
                              return (
                                <div key={cIdx} className="text-xs flex flex-col gap-1">
                                  <span className="text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-semibold">{change.field.replace('_', ' ')}</span>
                                  <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded">
                                    <span className="line-through text-[var(--text-tertiary)]">{formatVal(change.from)}</span>
                                    <span className="text-[var(--text-tertiary)]">→</span>
                                    <span className={`font-medium flex items-center gap-1 ${increased ? 'text-[var(--color-accent-teal)]' : 'text-white'}`}>
                                      {formatVal(change.to)}
                                      {increased && <TrendingUp size={12} />}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
