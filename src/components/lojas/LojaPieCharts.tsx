import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { BreakdownCategoryItem } from '@/lib/parsers/supplierUtils';
import { PieChart as PieIcon, ArrowDownRight, ArrowUpRight, Layers, Banknote } from 'lucide-react';

interface LojaPieChartsProps {
  activeTab: 'extrato' | 'saidas' | 'entradas' | 'caixa';
  totalIn: number;
  totalOut: number;
  netResult: number;
  suppliersOut: BreakdownCategoryItem[];
  sourcesIn: BreakdownCategoryItem[];
  isLoading?: boolean;
}

export function LojaPieCharts({
  activeTab,
  totalIn,
  totalOut,
  netResult,
  suppliersOut,
  sourcesIn,
  isLoading = false,
}: LojaPieChartsProps) {
  // Modo e título derivados automaticamente da aba ativa da tabela
  const { mode, title, icon } = useMemo(() => {
    if (activeTab === 'saidas') {
      return {
        mode: 'despesas',
        title: 'Despesas por Fornecedor',
        icon: <ArrowDownRight size={18} className="text-[var(--color-accent-danger)]" />,
      };
    }
    if (activeTab === 'entradas') {
      return {
        mode: 'receitas',
        title: 'Receitas por Origem',
        icon: <ArrowUpRight size={18} className="text-[var(--color-success)]" />,
      };
    }
    if (activeTab === 'caixa') {
      return {
        mode: 'geral',
        title: 'Dinheiro em Espécie (Caixa)',
        icon: <Banknote size={18} className="text-[var(--color-warning)]" />,
      };
    }
    return {
      mode: 'geral',
      title: 'Visão Geral: Receitas x Despesas',
      icon: <PieIcon size={18} className="text-[var(--color-primary)]" />,
    };
  }, [activeTab]);

  // Dados calculados para o gráfico
  const chartData = useMemo(() => {
    if (mode === 'geral') {
      const items = [
        {
          name: 'Receitas (Entradas)',
          value: totalIn,
          count: 0,
          percentage: totalIn + totalOut > 0 ? Number(((totalIn / (totalIn + totalOut)) * 100).toFixed(1)) : 0,
          color: '#10b981', // Verde
        },
        {
          name: 'Despesas (Saídas)',
          value: totalOut,
          count: 0,
          percentage: totalIn + totalOut > 0 ? Number(((totalOut / (totalIn + totalOut)) * 100).toFixed(1)) : 0,
          color: '#f43f5e', // Coral / Vermelho
        },
      ].filter(d => d.value > 0);
      return items;
    }

    if (mode === 'despesas') {
      return suppliersOut;
    }

    if (mode === 'receitas') {
      return sourcesIn;
    }

    return [];
  }, [mode, totalIn, totalOut, suppliersOut, sourcesIn]);

  const totalModeValue = useMemo(() => {
    if (mode === 'geral') return totalIn + totalOut;
    if (mode === 'despesas') return totalOut;
    if (mode === 'receitas') return totalIn;
    return 0;
  }, [mode, totalIn, totalOut]);

  return (
    <Card className="p-5 flex flex-col justify-between h-full border-[var(--border-subtle)] shadow-sm">
      <div>
        {/* Header Limpo e Contextual */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">{title}</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[var(--bg-canvas)]">
            {activeTab === 'saidas' ? 'Saídas' : activeTab === 'entradas' ? 'Entradas' : 'Consolidado'}
          </Badge>
        </div>

        {/* Gráfico Donut com Centro Informativo */}
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)]">
            <PieIcon size={36} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">Nenhum lançamento registrado neste período.</p>
            <p className="text-xs mt-1">Altere o filtro de datas ou selecione outra aba.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={92}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationDuration={500}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || '#3b82f6'}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>

              {/* Centro Informativo do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">
                  {mode === 'geral'
                    ? 'Resultado'
                    : mode === 'despesas'
                    ? 'Total Despesas'
                    : 'Total Receitas'}
                </span>
                <span
                  className={`font-display text-lg font-bold ${
                    mode === 'geral'
                      ? netResult >= 0
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-accent-danger)]'
                      : mode === 'despesas'
                      ? 'text-[var(--color-accent-danger)]'
                      : 'text-[var(--color-success)]'
                  }`}
                >
                  <AnimatedNumber
                    value={mode === 'geral' ? netResult : totalModeValue}
                    format="currency"
                  />
                </span>
              </div>
            </div>

            {/* Legenda com Cores Macro e Percentuais */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {chartData.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color || '#3b82f6' }}
                    />
                    <span className="font-medium text-[var(--text-primary)] truncate" title={item.name}>
                      {item.name}
                    </span>
                    {item.count > 0 && (
                      <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                        ({item.count}x)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-[var(--text-primary)]">
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--bg-surface)]"
                    >
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
