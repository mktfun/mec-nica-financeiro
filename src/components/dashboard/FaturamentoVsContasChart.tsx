import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';
import { BarChart2 } from 'lucide-react';

interface FaturamentoVsContasChartProps {
  data: any[];
  isLoading?: boolean;
}

import { CartesianGrid } from 'recharts';

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const shortenName = (name: string) =>
  name.replace(/Rei do /gi, '').replace(/Mecânica /gi, '').slice(0, 20);

const CustomYAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="var(--text-secondary)"
        fontSize={11}
        fontWeight={500}
      >
        {payload.value}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-surface-elevated)]/90 backdrop-blur-md border border-[var(--border-subtle)] p-3 rounded-xl shadow-xl min-w-[160px]">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 pb-2 border-b border-[var(--border-subtle)]">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span style={{ color: entry.color }} className="font-medium opacity-90">
                {entry.name}:
              </span>
              <span className="font-bold text-[var(--text-primary)]">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

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
        <div className="flex-1 overflow-y-auto min-h-[260px] pr-2 custom-scrollbar">
          <div style={{ height: Math.max(260, chartData.length * 38) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="15%"
              >
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomYAxisTick />}
                  width={130}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }}
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  isAnimationActive={false}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 12, color: 'var(--text-secondary)' }}
                />
                <Bar
                  dataKey="Faturamento"
                  fill="var(--color-accent-teal)"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="Contas"
                  fill="var(--color-accent-warning)"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
