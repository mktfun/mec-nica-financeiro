import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { TrendingUp, Activity } from 'lucide-react';

export interface DailyEvolutionPoint {
  date: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface LojaEvolutionChartProps {
  transactions: any[];
  startDate?: string;
  endDate?: string;
  isLoading?: boolean;
}

export function LojaEvolutionChart({
  transactions,
  startDate,
  endDate,
  isLoading = false,
}: LojaEvolutionChartProps) {
  // Agrupa transações por dia
  const chartData = useMemo(() => {
    const map: Record<string, { entradas: number; saidas: number }> = {};

    for (const tx of transactions) {
      const d = (tx.target_date || tx.occurred_at || '').substring(0, 10);
      if (!d) continue;

      if (!map[d]) {
        map[d] = { entradas: 0, saidas: 0 };
      }

      const amount = Math.abs(Number(tx.amount || 0));
      if (tx.type === 'in') {
        map[d].entradas += amount;
      } else if (tx.type === 'out') {
        map[d].saidas += amount;
      }
    }

    const sortedDates = Object.keys(map).sort();

    // Se tiver apenas 1 dia, cria 2 pontos para a linha renderizar conectada
    if (sortedDates.length === 1) {
      const d = sortedDates[0];
      const [y, m, day] = d.split('-');
      const point = {
        date: d,
        label: `${day}/${m}`,
        entradas: map[d].entradas,
        saidas: map[d].saidas,
        saldo: map[d].entradas - map[d].saidas,
      };
      return [
        {
          date: 'inicio',
          label: 'Marco Zero',
          entradas: 0,
          saidas: 0,
          saldo: 0,
        },
        point,
      ];
    }

    return sortedDates.map(d => {
      const [y, m, day] = d.split('-');
      const ent = map[d].entradas;
      const sai = map[d].saidas;
      return {
        date: d,
        label: `${day}/${m}`,
        entradas: ent,
        saidas: sai,
        saldo: ent - sai,
      };
    });
  }, [transactions]);

  return (
    <Card className="p-5 border-[var(--border-subtle)] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[var(--color-primary)]" />
          <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">
            Evolução do Período
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            Saídas
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            Saldo
          </span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-tertiary)]">
          <TrendingUp size={32} className="mb-2 opacity-20" />
          <p className="text-xs font-medium">Sem dados de movimentação no período.</p>
        </div>
      ) : (
        <div className="h-[200px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: '#09090b',
                  borderColor: '#27272a',
                  borderRadius: '8px',
                  color: '#fafafa',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fafafa' }}
              />
              {/* Linha 1: Entradas (Verde) */}
              <Line
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', stroke: '#09090b', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
              {/* Linha 2: Saídas (Coral) */}
              <Line
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f43f5e', stroke: '#09090b', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
              {/* Linha 3: Saldo Líquido (Azul) */}
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo Líquido"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#3b82f6', stroke: '#09090b', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
