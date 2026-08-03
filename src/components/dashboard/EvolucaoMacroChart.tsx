import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';
import type { DashboardV2Data } from '@/hooks/useDashboardV2';

interface EvolucaoMacroChartProps {
  data: DashboardV2Data['historicoMacro'];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

const formatCompactCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function EvolucaoMacroChart({ data, isLoading }: EvolucaoMacroChartProps) {
  // O Recharts espera os dados do mais antigo pro mais novo (para a linha ir da esquerda para a direita)
  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data].reverse();
  }, [data]);

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse flex flex-col justify-center min-h-[220px]">
        <div className="h-6 w-48 bg-[var(--bg-surface-hover)] rounded mb-6 mx-4 mt-4" />
        <div className="flex-1 bg-[var(--bg-surface-hover)] rounded mx-4 mb-4" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Activity size={20} className="text-[var(--color-primary)]" />
            Visão Macro do Mês
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Evolução de Saldo, Faturamento e Contas ({chartData.length} dias processados)
          </p>
        </div>
        
        {/* Legenda Customizada Minimalista */}
        <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-hover)] px-3 py-1.5 rounded-full">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
            Saldo
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-teal)]" />
            Faturamento
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-warning)]" />
            Contas
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <p className="text-sm text-[var(--text-tertiary)]">Sem dados para este mês</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-teal)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-accent-teal)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorContas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-warning)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-accent-warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                dy={12}
                minTickGap={20}
              />
              <YAxis 
                hide={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickFormatter={(val) => formatCompactCurrency(val).replace('R$', '').trim()}
                domain={['auto', 'auto']}
                width={45}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
                labelFormatter={(label) => `Data: ${formatDate(label as string)}`}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />

              <Area
                name="Faturamento"
                type="monotone"
                dataKey="faturamento"
                stroke="var(--color-accent-teal)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorFaturamento)"
              />
              
              <Area
                name="Contas"
                type="monotone"
                dataKey="contas"
                stroke="var(--color-accent-warning)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorContas)"
              />
              
              <Line
                name="Saldo Total"
                type="monotone"
                dataKey="saldo"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
