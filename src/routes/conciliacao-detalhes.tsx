import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Calendar, Download, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useConciliacaoResumo, useConciliacaoDetalhes, useHistorico } from '@/hooks/useConciliacao';
import { useStores } from '@/hooks/useStores';
import { ReconciliationRow, StoreRow } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Route = createFileRoute('/conciliacao-detalhes')({
  component: ConciliacaoDetalhesPage,
});

type Tab = 'lojas' | 'erros' | 'historico';

function ConciliacaoDetalhesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('lojas');
  
  const { data: resumo, isLoading: isLoadingResumo } = useConciliacaoResumo();
  const { data: detalhes = [], isLoading: isLoadingDetalhes } = useConciliacaoDetalhes();
  const { data: stores = [], isLoading: isLoadingStores } = useStores();

  const isLoading = isLoadingResumo || isLoadingDetalhes || isLoadingStores;

  const erros = detalhes.filter(d => d.status === 'divergence');
  
  // Use getDefaultDate to respect the D-1 standard
  const targetDateStr = getDefaultDate();
  const today = new Date(`${targetDateStr}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <Link to="/conciliacao" className="hover:text-[var(--text-primary)] transition-colors">Financeiro</Link>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-medium">Conciliação Diária</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl">Conciliação Diária</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Resultado consolidado e detecção automática de divergências.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar size={14} /> {today}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download size={14} /> Exportar Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="sm" text="" />
          </div>
        ) : (
          <>
            {/* Resumo do Dia */}
            <Card variant="glass" className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display font-semibold text-lg">Resumo Diário</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">Calculado pelo motor de regras do Supabase</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Divergência Total</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`font-display font-bold text-2xl ${resumo?.totalDivergence ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-teal)]'}`}>
                      {resumo?.totalDivergence ? '-' : ''}R$ {(resumo?.totalDivergence || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <Badge variant={resumo?.totalDivergence ? 'danger' : 'success'}>
                      {resumo?.totalDivergence ? 'DIVERGÊNCIA' : 'APROVADO'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
                {/* Coluna Esquerda */}
                <div className="space-y-2 border-r border-[var(--border-subtle)] pr-8">
                  <Row label="Entradas (Líquido)" value={resumo?.totalIn || 0} />
                  <Row label="Divergências" value={resumo?.totalDivergence || 0} bold />
                  <Row label="Lojas Conciliadas" value={resumo?.approved || 0} count />
                  <Row label="Lojas Pendentes" value={resumo?.pending || 0} count />
                </div>
                {/* Coluna Direita */}
                <div className="space-y-2">
                  <Row label="OSs Lidas" value={resumo?.rows?.reduce((s, r) => s + (r.os_count || 0), 0) || 0} count />
                  <Row label="Total Apurado OS" value={resumo?.rows?.reduce((s, r) => s + (r.os_total || 0), 0) || 0} />
                  <Row label="Total Dinheiro Caixa" value={resumo?.rows?.reduce((s, r) => s + (r.daily_cash || 0), 0) || 0} />
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
              <TabButton active={activeTab === 'lojas'} onClick={() => setActiveTab('lojas')}>Por Loja</TabButton>
              <TabButton active={activeTab === 'erros'} onClick={() => setActiveTab('erros')} badge={erros.length}>Erros Detectados</TabButton>
              <TabButton active={activeTab === 'historico'} onClick={() => setActiveTab('historico')}>Histórico</TabButton>
            </div>

            {/* Tab Content */}
            <div className="flex gap-4 border-b border-[var(--border-subtle)] pb-4 mb-4 overflow-x-auto">
              <TabButton active={tab === 'all'} onClick={() => setTab('all')}>Todas</TabButton>
              <TabButton active={tab === 'pending'} onClick={() => setTab('pending')} badge={resumo?.pending || 0}>Pendentes</TabButton>
              <TabButton active={tab === 'divergence'} onClick={() => setTab('divergence')} badge={resumo?.divergence || 0}>Divergências</TabButton>
              <TabButton active={tab === 'approved'} onClick={() => setTab('approved')}>Conciliadas</TabButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card className="p-0 overflow-hidden bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]">
                  <LojaTable data={filteredData} stores={stores} />
                </Card>
              </div>
              
              <div className="space-y-4">
                <Card className="bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] p-5">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--text-secondary)] mb-4">Métricas do Período</h3>
                  <div className="space-y-3">
                    <Row label="Total Apurado OS" value={resumo?.totalIn || 0} isCurrency />
                    <Row label="Total Dinheiro Caixa" value={resumo?.rows?.reduce((s, r) => s + (r.daily_cash || 0), 0) || 0} isCurrency />
                    <div className="h-px bg-[var(--border-subtle)] my-2"></div>
                    <Row label="Divergências" value={resumo?.totalDivergence || 0} isCurrency color="danger" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20 p-5">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-primary)] mb-4 flex items-center gap-2">
                    <AlertCircle size={16} /> Status Geral
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Lojas com erros:</span>
                      <span className="font-display font-bold text-lg text-[var(--color-accent-danger)]">{resumo?.divergence || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Lojas pendentes:</span>
                      <span className="font-display font-bold text-lg text-[var(--text-primary)]">{resumo?.pending || 0}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value, isCurrency, color = 'default', count }: { label: string, value: number, isCurrency?: boolean, color?: 'default'|'danger'|'success', count?: boolean }) {
  const colors = {
    default: 'text-[var(--text-primary)]',
    danger: 'text-[var(--color-accent-danger)]',
    success: 'text-[var(--color-accent-teal)]',
  };
  
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className={`font-display font-semibold ${colors[color]}`}>
        {isCurrency ? <AnimatedNumber value={value} format="currency" /> : count ? value : value}
      </span>
    </div>
  );
}

function TabButton({ active, onClick, children, badge }: { active: boolean, onClick: () => void, children: React.ReactNode, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="bg-[var(--color-accent-danger)] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function LojaTable({ data, stores }: { data: ReconciliationRow[], stores: StoreRow[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Nenhum dado encontrado para o filtro selecionado.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
            <th className="text-left py-3 px-4 font-medium">Loja</th>
            <th className="text-right py-3 px-4 font-medium">OS Total ↕</th>
            <th className="text-right py-3 px-4 font-medium" title="Soma das transações em Dinheiro importadas do Excel">Dinheiro (Excel) ↕</th>
            <th className="text-right py-3 px-4 font-medium" title="Soma do dinheiro informado em Caixa Físico">Caixa Físico ↕</th>
            <th className="text-right py-3 px-4 font-medium">Resultado ↕</th>
            <th className="text-right py-3 px-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const storeName = stores.find(s => s.id === row.store_id)?.name || row.store_id;
            return (
              <motion.tr
                key={row.store_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                <td className="py-3.5 px-4 font-medium">{storeName}</td>
                <td className="py-3.5 px-4 text-right font-display"><AnimatedNumber value={row.os_total || 0} format="currency" /></td>
                <td className="py-3.5 px-4 text-right font-display text-[var(--color-primary)]"><AnimatedNumber value={row.financial_total || 0} format="currency" /></td>
                <td className="py-3.5 px-4 text-right font-display"><AnimatedNumber value={row.daily_cash || 0} format="currency" /></td>
                <td className={`py-3.5 px-4 text-right font-display font-semibold ${(row.divergence || 0) !== 0 ? 'text-[var(--color-accent-danger)]' : ''}`}>
                  {(row.divergence || 0) !== 0 ? (
                    <>-R$ {Math.abs(row.divergence || 0).toFixed(2).replace('.', ',')}</>
                  ) : (
                    'R$ 0,00'
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Badge variant={row.status === 'approved' ? 'success' : row.status === 'divergence' ? 'danger' : 'warning'}>
                    {row.status === 'approved' ? 'Conciliado' : row.status === 'divergence' ? 'Divergência' : 'Pendente'}
                  </Badge>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
