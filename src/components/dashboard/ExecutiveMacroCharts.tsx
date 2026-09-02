import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExecutiveMacroChartsProps {
  historicoMacro?: Array<{
    date: string;
    faturamento: number;
    contas: number;
    caixaAtual: number;
  }>;
  isLoading: boolean;
}

export function ExecutiveMacroCharts({ historicoMacro = [], isLoading }: ExecutiveMacroChartsProps) {
  const chartData = useMemo(() => {
    if (!historicoMacro || !Array.isArray(historicoMacro) || historicoMacro.length === 0) {
      return [];
    }
    return historicoMacro.map((item) => ({
      date: item.date,
      displayDate: item.date.split('-').reverse().slice(0, 2).join('/'),
      faturamento: Number(item.faturamento || 0),
      contas: Number(item.contas || 0),
      caixaAtual: Number(item.caixaAtual || 0)
    }));
  }, [historicoMacro]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 animate-pulse min-h-[340px] flex flex-col justify-between">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        <div className="h-[220px] bg-zinc-800/40 rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return null; // Não renderiza nada se não houver histórico multi-dias suficiente
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5 shadow-xl backdrop-blur-sm overflow-hidden"
    >
      {/* ── HEADER DO GRÁFICO ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Activity size={18} className="text-indigo-400" />
            <span>Tendência Financeira Consolidada</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Evolução histórica de Faturamento, Contas a Pagar e Caixa Atual
          </p>
        </div>

        {/* LEGENDA CUSTOMIZADA */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-300 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span>Faturamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span>Contas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
            <span>Caixa</span>
          </div>
        </div>
      </div>

      {/* ── GRÁFICO RECHARTS ── */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="displayDate"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                borderColor: '#27272a',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              }}
              formatter={(value: any) => [
                Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                ''
              ]}
              labelFormatter={(label) => `Data: ${label}`}
            />

            {/* Faturamento como Área Sutil */}
            <Area
              type="monotone"
              dataKey="faturamento"
              name="Faturamento"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradientFaturamento)"
            />

            {/* Contas a Pagar como Linha */}
            <Line
              type="monotone"
              dataKey="contas"
              name="Contas a Pagar"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
            />

            {/* Caixa Atual como Linha Indigo */}
            <Line
              type="monotone"
              dataKey="caixaAtual"
              name="Caixa Atual"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
