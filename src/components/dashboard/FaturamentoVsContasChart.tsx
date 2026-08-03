import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';
import { BarChart2 } from 'lucide-react';
import type { StoreMetrics } from '@/hooks/useDashboardV2';

interface FaturamentoVsContasChartProps {
  data: StoreMetrics[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const shortenName = (name: string) =>
  name.replace(/Rei do /gi, 'R. ').replace(/Mecânica /gi, 'Mec. ').slice(0, 16);

export function FaturamentoVsContasChart({ data, isLoading }: FaturamentoVsContasChartProps) {
  const chartData = useMemo(
    () =>
      data
        .filter(s => s.faturamento > 0 || s.contas > 0)
        .map(s => ({
          name: shortenName(s.storeName),
          Faturamento: s.faturamento,
          Contas: s.contas,
        })),
    [data]
  );

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse">
        <div className="h-6 w-36 bg-[var(--bg-surface-hover)] rounded mb-6" />
        <div className="flex-1 bg-[var(--bg-surface-hover)] rounded" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-5">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <BarChart2 size={16} className="text-[var(--color-primary)]" />
          Faturamento × Contas
        </h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Por loja no período selecionado</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--text-tertiary)]">Sem dados para o período</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-[260px] pr-1">
          <div style={{ height: Math.max(260, chartData.length * 45) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
              <XAxis type="number" hide tickFormatter={formatCurrency} />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                width={88}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'var(--text-secondary)' }}
              />
              <Bar
                dataKey="Faturamento"
                fill="var(--color-accent-teal)"
                radius={[0, 4, 4, 0]}
                barSize={10}
                fillOpacity={0.85}
              />
              <Bar
                dataKey="Contas"
                fill="var(--color-accent-warning)"
                radius={[0, 4, 4, 0]}
                barSize={10}
                fillOpacity={0.85}
              />
            </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
