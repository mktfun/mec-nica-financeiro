import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { StoreTableDashboard } from '@/components/dashboard/StoreTableDashboard';
import { FaturamentoVsContasChart } from '@/components/dashboard/FaturamentoVsContasChart';
import { EvolucaoSaldoChart } from '@/components/dashboard/EvolucaoSaldoChart';
import { useDashboardV2 } from '@/hooks/useDashboardV2';
import {
  Landmark,
  Wallet,
  CreditCard,
  Scale,
  TrendingUp,
  ArrowRightLeft,
  Clock,
  Car,
  CalendarCheck2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/ui/Card';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function DashboardPage() {
  const { data, isLoading } = useDashboardV2();

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-center">
          <h1 className="font-display font-bold text-3xl text-white">Visão Geral</h1>
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg shadow-sm">
            <CalendarCheck2 size={16} className="text-[var(--color-primary)]" />
            <span className="text-sm text-white">
              {isLoading ? 'Carregando data...' : `Última conciliação: ${formatDate(data?.dataAtual)}`}
            </span>
          </div>
        </div>

        {/* ── FAIXA TOPO — 4 KPIs críticos ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Saldo Total"
            value={data?.saldoTotal ?? 0}
            icon={Landmark}
            color="primary"
            isLoading={isLoading}
            index={0}
            tooltip="Soma do bank_total da conciliação mais recente de cada loja."
          />
          <KpiCard
            label="Caixa Atual"
            value={data?.caixaAtual ?? 0}
            icon={Wallet}
            color="teal"
            isLoading={isLoading}
            index={1}
            tooltip="Saldo Total + A Receber (OSs em aberto e parcial). Representa o dinheiro total que entra no caixa."
          />
          <KpiCard
            label="Contas a Pagar"
            value={data?.contasAPagar ?? 0}
            icon={CreditCard}
            color="warning"
            isLoading={isLoading}
            index={2}
            tooltip="Soma dos valores em aberto de todas as contas a pagar importadas do sistema legado."
          />
          <KpiCard
            label="Diferença Final"
            value={data?.diferenca ?? 0}
            icon={Scale}
            color={!data || data.diferenca >= 0 ? 'teal' : 'danger'}
            isLoading={isLoading}
            index={3}
            tooltip="Caixa Atual menos Contas a Pagar. Positivo = sobra. Negativo = falta."
          />
        </div>

        {/* ── FAIXA MEIO — 3 blocos analíticos ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Faturamento Atual vs Anterior — 2/4 */}
          <Card className="md:col-span-2 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-[var(--color-primary)]" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
                Faturamento
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Atual</p>
                <p className="font-mono font-bold text-2xl text-[var(--color-accent-teal)]">
                  {isLoading ? (
                    <span className="animate-pulse h-7 w-28 bg-[var(--bg-surface-hover)] rounded block" />
                  ) : (
                    <AnimatedNumber value={data?.faturamentoAtual ?? 0} format="currency" />
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Anterior</p>
                <p className="font-mono font-bold text-2xl text-[var(--text-secondary)]">
                  {isLoading ? (
                    <span className="animate-pulse h-7 w-28 bg-[var(--bg-surface-hover)] rounded block" />
                  ) : (
                    <AnimatedNumber value={data?.faturamentoAnterior ?? 0} format="currency" />
                  )}
                </p>
              </div>
            </div>
            {!isLoading && data && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-xs font-medium flex items-center gap-1 ${
                  data.variacaoFaturamento >= 0
                    ? 'text-[var(--color-accent-teal)]'
                    : 'text-[var(--color-accent-danger)]'
                }`}
              >
                <TrendingUp size={12} />
                {data.variacaoFaturamento >= 0 ? '+' : ''}
                {data.variacaoFaturamento.toFixed(1)}% vs ANTERIOR
              </motion.div>
            )}
          </Card>

          {/* A Receber — 1/4 */}
          <KpiCard
            label="A Receber"
            value={data?.aReceber ?? 0}
            icon={Clock}
            color="warning"
            isLoading={isLoading}
            index={4}
            tooltip="Diferença entre total_value e paid_value das OSs com status em_aberto ou pago_parcial no pátio."
          />

          {/* Fluxo de Caixa — 1/4 */}
          <KpiCard
            label="Fluxo de Caixa"
            value={data?.fluxoCaixa ?? 0}
            icon={ArrowRightLeft}
            color={!data || data.fluxoCaixa >= 0 ? 'teal' : 'danger'}
            isLoading={isLoading}
            index={5}
            tooltip="Variação do Saldo Total entre a conciliação atual e a conciliação imediatamente anterior."
          />
        </div>

        {/* ── BANNER PÁTIO ── */}
        {!isLoading && data && data.veiculosPatio > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/20"
          >
            <Car size={16} className="text-[var(--color-accent-warning)] shrink-0" />
            <span className="text-sm text-[var(--color-accent-warning)] font-medium">
              <strong>{data.veiculosPatio}</strong> veículo{data.veiculosPatio !== 1 ? 's' : ''} em pátio com valor retido total de{' '}
              <strong>
                {data.veiculosPatioValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </span>
          </motion.div>
        )}

        {/* ── FAIXA BASE — Tabela + Gráficos ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4" style={{ minHeight: 340 }}>
          <div className="xl:col-span-3">
            <StoreTableDashboard data={data?.porLoja ?? []} isLoading={isLoading} />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="flex-1">
              <EvolucaoSaldoChart data={data?.historicoSaldos ?? []} isLoading={isLoading} />
            </div>
            <div className="flex-1">
              <FaturamentoVsContasChart data={data?.porLoja ?? []} isLoading={isLoading} />
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
