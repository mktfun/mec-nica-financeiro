import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { mockConciliacaoResumo, mockConciliacaoDetalhes } from '@/mock/data';
import { Calendar, Download, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/conciliacao-detalhes')({
  component: ConciliacaoDetalhesPage,
});

type Tab = 'lojas' | 'erros' | 'historico';

function ConciliacaoDetalhesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('lojas');
  const r = mockConciliacaoResumo;
  const erros = mockConciliacaoDetalhes.filter(d => d.status === 'Divergência');

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
              <Calendar size={14} /> 13 de maio, 2026
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download size={14} /> Exportar Excel
            </Button>
          </div>
        </div>

        {/* Resumo do Dia */}
        <Card variant="glass" className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display font-semibold text-lg">Resumo de 13/05/2026</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Calculado pelo motor de regras às 07:32</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Resultado</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="font-display font-bold text-2xl text-[var(--color-accent-teal)]">
                  R$ {r.resultado.toFixed(2).replace('.', ',')}
                </span>
                <Badge variant="success">APROVADO</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {/* Coluna Esquerda */}
            <div className="space-y-2 border-r border-[var(--border-subtle)] pr-8">
              <Row label="Entradas Cartão Crédito" value={r.cartaoCredito} />
              <Row label="Entradas Cartão Débito" value={r.cartaoDebito} />
              <Row label="Dinheiro Físico (informado)" value={r.dinheiroFisico} />
              <Row label="Total Entradas" value={r.totalEntradas} bold />
              <Row label="Total Contas a Pagar" value={r.contasPagar} />
            </div>
            {/* Coluna Direita */}
            <div className="space-y-2">
              <Row label="Caixa Anterior" value={r.caixaAnterior} />
              <Row label="Caixa Atual" value={r.caixaAtual} />
              <Row label="Recebíveis em Aberto" value={r.recebiveisAberto} />
              <Row label="Soma Pátio (OS abertas)" value={r.somaPatio} />
              <Row label="Juros Parcelamentos" value={r.jurosParcelamento} />
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
          {activeTab === 'lojas' && <LojaTable data={mockConciliacaoDetalhes} />}
          {activeTab === 'erros' && <LojaTable data={erros} />}
          {activeTab === 'historico' && (
            <Card variant="glass" className="p-8 text-center">
              <p className="text-[var(--text-secondary)]">Histórico dos últimos 30 dias disponível em breve.</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">O motor registra cada execução diária para auditoria.</p>
            </Card>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-semibold border-t border-[var(--border-subtle)] pt-3' : ''}`}>
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-display"><AnimatedNumber value={value} format="currency" /></span>
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

function LojaTable({ data }: { data: typeof mockConciliacaoDetalhes }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
            <th className="text-left py-3 px-4 font-medium">Loja</th>
            <th className="text-right py-3 px-4 font-medium">Entradas ↕</th>
            <th className="text-right py-3 px-4 font-medium">Dinheiro ↕</th>
            <th className="text-right py-3 px-4 font-medium">Contas ↕</th>
            <th className="text-right py-3 px-4 font-medium">Resultado ↕</th>
            <th className="text-right py-3 px-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={row.storeId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <td className="py-3.5 px-4 font-medium">{row.storeName}</td>
              <td className="py-3.5 px-4 text-right font-display"><AnimatedNumber value={row.entradas} format="currency" /></td>
              <td className="py-3.5 px-4 text-right font-display"><AnimatedNumber value={row.dinheiro} format="currency" /></td>
              <td className="py-3.5 px-4 text-right font-display text-[var(--color-primary)]"><AnimatedNumber value={row.contas} format="currency" /></td>
              <td className={`py-3.5 px-4 text-right font-display font-semibold ${row.resultado < 0 ? 'text-[var(--color-accent-danger)]' : ''}`}>
                {row.resultado !== 0 ? (
                  <>-R$ {Math.abs(row.resultado).toFixed(2).replace('.', ',')}</>
                ) : (
                  'R$ 0,00'
                )}
              </td>
              <td className="py-3.5 px-4 text-right">
                <Badge variant={row.status === 'OK' ? 'success' : 'danger'}>{row.status}</Badge>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
