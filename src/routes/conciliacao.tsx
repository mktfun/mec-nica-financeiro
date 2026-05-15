import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { summaryData, mockStores, mockAlerts, mockConciliacaoResumo } from '@/mock/data';
import { CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, CreditCard, Car, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const resultado = mockConciliacaoResumo.resultado;
  const isApproved = Math.abs(resultado) < 10;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Timestamp */}
        <p className="text-xs text-[var(--text-tertiary)]">Atualizado hoje às 07:32 · Dados de 13/05/2026</p>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-[var(--radius-lg)] border flex items-center justify-between ${
            isApproved
              ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/20'
              : 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className={isApproved ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'} />
            <span className="font-medium text-sm">
              Conciliação do dia {isApproved ? 'aprovada automaticamente' : 'com divergências'} — Resultado: R$ {resultado.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <Link to="/conciliacao-detalhes" className="text-[var(--color-primary)] text-sm font-medium flex items-center gap-1 hover:underline">
            Ver detalhes <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Entradas do Dia</span>
              <TrendingUp size={18} className="text-[var(--color-accent-teal)]" />
            </div>
            <div className="font-display text-2xl font-bold">
              <AnimatedNumber value={summaryData.totalIn} format="currency" />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">10 lojas consolidadas</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Contas a Pagar</span>
              <CreditCard size={18} className="text-[var(--color-accent-warning)]" />
            </div>
            <div className="font-display text-2xl font-bold">
              <AnimatedNumber value={summaryData.totalOut} format="currency" />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Vencimentos de hoje</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Saldo Consolidado</span>
              <Receipt size={18} className="text-[var(--color-primary)]" />
            </div>
            <div className="font-display text-2xl font-bold">
              <AnimatedNumber value={summaryData.saldoConsolidado} format="currency" />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Entradas − Saídas</p>
          </Card>

          <Link to="/patio">
            <Card className="relative overflow-hidden hover:border-[var(--border-strong)] transition-colors cursor-pointer h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Carros no Pátio</span>
                <Car size={18} className="text-[var(--color-accent-danger)]" />
              </div>
              <div className="font-display text-2xl font-bold">
                {summaryData.carrosNoPatio} <span className="text-base font-normal text-[var(--text-secondary)]">OS</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">abertas há &gt;24h</p>
            </Card>
          </Link>
        </div>

        {/* 10 Lojas Grid */}
        <div>
          <h2 className="font-display font-semibold text-xl mb-2">10 Lojas</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">Status de conciliação por unidade — clique para ver detalhes</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {mockStores.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  variant="glass"
                  className={`p-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors ${
                    store.status === 'divergence' ? 'border-[var(--color-accent-danger)]/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                    {store.status === 'approved' && <Badge variant="success" className="text-[10px]">✓ OK</Badge>}
                    {store.status === 'divergence' && <Badge variant="danger" className="text-[10px]">⚠ Divergência</Badge>}
                    {store.status === 'pending' && <Badge variant="warning" className="text-[10px]">• Pendente</Badge>}
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Entradas do dia</p>
                  <p className="font-display font-bold text-lg">
                    <AnimatedNumber value={store.financialTotal} format="currency" />
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {store.status === 'pending' ? 'Aguardando Daniel' : 'Dinheiro informado'}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Alertas ativos + Dinheiro em Caixa side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alertas Ativos */}
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold mb-1">Alertas ativos</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">{mockAlerts.filter(a => a.severity !== 'info').length} ocorrências detectadas hoje</p>
            <div className="space-y-3">
              {mockAlerts.filter(a => a.severity !== 'info').map(alert => (
                <div key={alert.id} className="flex items-start gap-3 text-sm">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-[var(--color-accent-danger)]' : 'bg-[var(--color-accent-warning)]'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{alert.storeName}</span>{' '}
                    <span className="text-[var(--text-tertiary)]">{alert.osNumber || ''}</span>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">{alert.description}</p>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
            <Link to="/alertas" className="text-[var(--color-primary)] text-sm font-medium mt-4 inline-flex items-center gap-1 hover:underline">
              Ver todos os alertas <ArrowRight size={14} />
            </Link>
          </Card>

          {/* Dinheiro em Caixa */}
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold mb-1">Dinheiro em Caixa · Hoje</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Informe o valor físico contado por loja</p>
            <div className="space-y-3">
              {mockStores.slice(0, 3).map(store => (
                <div key={store.id} className="flex items-center justify-between">
                  <span className="text-sm">{store.name}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-tertiary)]">R$</span>
                    <input
                      type="text"
                      defaultValue="0,00"
                      className="w-20 text-right bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="text-[var(--color-primary)] text-sm font-medium mt-3 hover:underline">
              + Ver todas as lojas
            </button>
            <div className="mt-4">
              <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-full)] font-medium text-sm hover:opacity-90 transition-opacity">
                Salvar valores
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
