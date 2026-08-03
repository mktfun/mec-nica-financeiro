import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';
import type { DashboardV2Data } from '@/hooks/useDashboardV2';

interface EvolucaoSaldoChartProps {
  data: DashboardV2Data['historicoSaldos'];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

export function EvolucaoSaldoChart({ data, isLoading }: EvolucaoSaldoChartProps) {
  // O Recharts espera os dados do mais antigo pro mais novo (para a linha ir da esquerda para a direita)
  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data].reverse();
  }, [data]);

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse">
        <div className="h-6 w-48 bg-[var(--bg-surface-hover)] rounded mb-6" />
        <div className="flex-1 bg-[var(--bg-surface-hover)] rounded" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-5">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-primary)]" />
          Evolução do Saldo Global
        </h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Últimas {chartData.length} conciliações registradas</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--text-tertiary)]">Sem dados de histórico</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-teal)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-accent-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                dy={10}
              />
              <YAxis 
                hide 
                domain={['auto', 'auto']}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                labelFormatter={(label) => `Conciliação: ${formatDate(label as string)}`}
                formatter={(value: number) => [formatCurrency(value), 'Saldo Total']}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="var(--color-accent-teal)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
