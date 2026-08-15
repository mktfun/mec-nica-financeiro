import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/Card';
import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react';

interface FaturamentoVsContasChartProps {
  data: any[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const cleanStoreLabel = (name?: string) => {
  if (!name) return 'Loja';
  return name
    .replace(/Planalto - BRASICAR/gi, 'Planalto (BRASICAR)')
    .replace(/Rudge Ramos - CAP/gi, 'Rudge Ramos (CAP)')
    .replace(/Jorge Beretta - DHJV/gi, 'Jorge Beretta (DHJV)')
    .replace(/Dom Pedro - DP/gi, 'Dom Pedro (DP)')
    .replace(/Piraporinha - EMPORIO/gi, 'Piraporinha (EMPORIO)')
    .replace(/Santo André - HD/gi, 'Santo André (HD)')
    .replace(/Jabaquara - JAB/gi, 'Jabaquara (JAB)')
    .replace(/Maua - MHE/gi, 'Mauá (MHE)')
    .replace(/Kennedy - MP/gi, 'Kennedy (MP)')
    .replace(/Rei do Módulo - MP/gi, 'R. Módulo (MP)')
    .replace(/Mecânica /gi, '');
};

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
        fontWeight={600}
      >
        {payload.value}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const faturamento = Number(payload.find((p: any) => p.dataKey === 'Faturamento')?.value || 0);
    const contas = Number(payload.find((p: any) => p.dataKey === 'Contas')?.value || 0);
    const resultado = faturamento - contas;
    const isPositive = resultado >= 0;

    return (
      <div className="bg-[#0f111a]/95 backdrop-blur-md border border-[var(--border-subtle)] p-3.5 rounded-xl shadow-2xl min-w-[220px] pointer-events-none z-[99999]">
        <p className="text-xs font-bold text-white mb-2 pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <span>{label}</span>
        </p>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--color-accent-teal)] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)]" />
              Faturamento:
            </span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(faturamento)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--color-accent-warning)] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-warning)]" />
              Contas (OFX):
            </span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(contas)}
            </span>
          </div>

          <div className="pt-2 mt-1 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[var(--text-tertiary)] font-medium flex items-center gap-1">
              {isPositive ? <TrendingUp size={12} className="text-[var(--color-accent-teal)]" /> : <TrendingDown size={12} className="text-[var(--color-accent-danger)]" />}
              Resultado:
            </span>
            <span className={`font-mono font-bold ${isPositive ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
              {isPositive ? '+' : ''}{formatCurrency(resultado)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function FaturamentoVsContasChart({ data, isLoading }: FaturamentoVsContasChartProps) {
  const chartData = useMemo(
    () =>
      (data || [])
        .map(s => ({
          name: cleanStoreLabel(s.storeName || s.store_name),
          Faturamento: Number(s.faturamento || 0),
          Contas: Number(s.contas || 0),
        })),
    [data]
  );

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse p-5">
        <div className="h-6 w-36 bg-[var(--bg-surface-hover)] rounded mb-6" />
        <div className="h-[380px] bg-[var(--bg-surface-hover)] rounded" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col p-5 overflow-visible">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base flex items-center gap-2 text-[var(--text-primary)]">
            <BarChart2 size={16} className="text-[var(--color-primary)]" />
            Faturamento × Contas
          </h3>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Comparativo de receitas e despesas por filial no dia
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <p className="text-sm text-[var(--text-tertiary)]">Sem dados para o período</p>
        </div>
      ) : (
        <div className="w-full" style={{ height: Math.max(380, chartData.length * 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
              barCategoryGap="20%"
            >
              <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                stroke="var(--text-tertiary)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={<CustomYAxisTick />}
                width={150}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 6 }}
                content={<CustomTooltip />}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 99999, outline: 'none' }}
                isAnimationActive={false}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 16, color: 'var(--text-secondary)' }}
              />
              <Bar
                dataKey="Faturamento"
                name="Faturamento"
                fill="var(--color-accent-teal)"
                radius={[0, 6, 6, 0]}
                barSize={12}
              />
              <Bar
                dataKey="Contas"
                name="Contas (OFX)"
                fill="var(--color-accent-warning)"
                radius={[0, 6, 6, 0]}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
