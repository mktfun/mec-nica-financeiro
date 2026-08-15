import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';
import type { DashboardV2Data } from '@/hooks/useDashboardV2';

interface EvolucaoMacroChartProps {
  data: DashboardV2Data['historicoMacro'];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
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
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => ({
      date: item.date,
      saldo: Number(item.saldo || 0),
      faturamento: Number(item.faturamento || 0),
      contas: Number(item.contas || 0),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse flex flex-col justify-center min-h-[300px] p-6">
        <div className="h-6 w-48 bg-[var(--bg-surface-hover)] rounded mb-6" />
        <div className="h-[220px] bg-[var(--bg-surface-hover)] rounded" />
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg flex items-center gap-2 text-[var(--text-primary)]">
            <Activity size={20} className="text-[var(--color-primary)]" />
            Visão Macro do Mês
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Evolução de Saldo, Faturamento e Contas ({chartData.length} dias processados)
          </p>
        </div>
        
        {/* Legenda Customizada Minimalista */}
        <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-hover)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shadow-sm shadow-blue-500/50" />
            Saldo
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-teal)] shadow-sm shadow-emerald-500/50" />
            Faturamento
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-warning)] shadow-sm shadow-amber-500/50" />
            Contas
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="w-full h-[260px] flex items-center justify-center">
          <p className="text-sm text-[var(--text-tertiary)]">Sem dados para este mês</p>
        </div>
      ) : (
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-teal)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-accent-teal)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorContas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-warning)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-accent-warning)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                dy={8}
                minTickGap={20}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                tickFormatter={(val) => formatCompactCurrency(val).replace('R$', '').trim()}
                domain={['auto', 'auto']}
                width={55}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 17, 26, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  padding: '12px',
                }}
                labelFormatter={(label) => `Data: ${formatDate(label as string)}`}
                formatter={(value: any, name: string) => [formatCurrency(Number(value)), name]}
              />

              <Area
                name="Faturamento"
                type="monotone"
                dataKey="faturamento"
                stroke="var(--color-accent-teal)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorFaturamento)"
              />
              
              <Area
                name="Contas"
                type="monotone"
                dataKey="contas"
                stroke="var(--color-accent-warning)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorContas)"
              />
              
              <Line
                name="Saldo Total"
                type="monotone"
                dataKey="saldo"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
