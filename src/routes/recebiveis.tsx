import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { mockReceivables } from '@/mock/data';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/recebiveis')({
  component: RecebiveisPage,
});

type FilterTab = 'todos' | 'pendente' | 'recebido' | 'vencido';

function RecebiveisPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('todos');

  const pendentes = mockReceivables.filter(r => r.status === 'pendente');
  const recebidos = mockReceivables.filter(r => r.status === 'recebido');
  const vencidos = mockReceivables.filter(r => r.status === 'vencido');

  const totalReceber = pendentes.reduce((a, r) => a + r.value, 0);
  const totalVencidos = vencidos.reduce((a, r) => a + r.value, 0);
  const totalRecebidoHoje = recebidos.filter(r => r.date === '15/05').reduce((a, r) => a + r.value, 0);
  const totalAVencerHoje = pendentes.filter(r => r.dueDate === '15/05').reduce((a, r) => a + r.value, 0);

  const filtered = activeTab === 'todos' ? mockReceivables : mockReceivables.filter(r => r.status === activeTab);

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
        <div>
          <h1 className="font-display font-bold text-3xl">Recebíveis</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Valores a receber por forma de pagamento e vencimento.</p>
        </div>

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
        <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
          <TabBtn active={activeTab === 'todos'} onClick={() => setActiveTab('todos')}>Todos</TabBtn>
          <TabBtn active={activeTab === 'pendente'} onClick={() => setActiveTab('pendente')}>Pendentes ({pendentes.length})</TabBtn>
          <TabBtn active={activeTab === 'recebido'} onClick={() => setActiveTab('recebido')}>Recebidos ({recebidos.length})</TabBtn>
          <TabBtn active={activeTab === 'vencido'} onClick={() => setActiveTab('vencido')}>Vencidos ({vencidos.length})</TabBtn>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <th className="text-left py-3 px-4 font-medium">Data</th>
                <th className="text-left py-3 px-4 font-medium">Loja</th>
                <th className="text-left py-3 px-4 font-medium">Tipo</th>
                <th className="text-right py-3 px-4 font-medium">Valor</th>
                <th className="text-left py-3 px-4 font-medium">Vencimento</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">{r.date}</td>
                  <td className="py-3.5 px-4 font-medium">{r.storeName}</td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">{r.type}</td>
                  <td className="py-3.5 px-4 text-right font-display font-semibold">
                    <AnimatedNumber value={r.value} format="currency" />
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">{r.dueDate}</td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        r.status === 'recebido' ? 'success' :
                        r.status === 'vencido' ? 'danger' : 'warning'
                      }
                    >
                      {r.status === 'recebido' ? 'Recebido' :
                       r.status === 'vencido' ? 'Vencido' : 'Pendente'}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
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
