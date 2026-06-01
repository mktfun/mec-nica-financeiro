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
            <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
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
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === 'lojas' && <LojaTable data={detalhes} stores={stores} />}
              {activeTab === 'erros' && <LojaTable data={erros} stores={stores} />}
              {activeTab === 'historico' && (
                <Card variant="glass" className="p-8 text-center">
                  <p className="text-[var(--text-secondary)]">Histórico de conciliações disponível nas tabelas do Supabase.</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">O motor registra cada execução diária para auditoria.</p>
                </Card>
              )}
            </motion.div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value, bold, count }: { label: string; value: number; bold?: boolean; count?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-semibold border-t border-[var(--border-subtle)] pt-3' : ''}`}>
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-display">
        {count ? value : <AnimatedNumber value={value} format="currency" />}
      </span>
    </div>
  );
}

function TabButton({ children, active, onClick, badge }: { children: React.ReactNode; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
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
    return <div className="p-8 text-center text-[var(--text-tertiary)]">Nenhum dado encontrado para o dia atual.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
            <th className="text-left py-3 px-4 font-medium">Loja</th>
            <th className="text-right py-3 px-4 font-medium">OS Total ↕</th>
            <th className="text-right py-3 px-4 font-medium">Financeiro ↕</th>
            <th className="text-right py-3 px-4 font-medium">Dinheiro ↕</th>
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
