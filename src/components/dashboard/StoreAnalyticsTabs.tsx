import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Landmark, TrendingUp, CreditCard, Award, ArrowDownRight, AlertTriangle, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoreAnalyticsTabsProps {
  data: any[];
  isLoading?: boolean;
}

type TabType = 'saldo' | 'faturamento' | 'contas';

const formatCurrency = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) {
    return `${sign}R$ ${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
};

const cleanStoreLabel = (name?: string) => {
  if (!name) return 'Unidade';
  return name
    .replace(/Planalto - BRASICAR/gi, 'Planalto (BRASICAR)')
    .replace(/Rudge Ramos - CAP/gi, 'Rudge (CAP)')
    .replace(/Jorge Beretta - DHJV/gi, 'J. Beretta (DHJV)')
    .replace(/Dom Pedro - DP/gi, 'Dom Pedro (DP)')
    .replace(/Piraporinha - EMPORIO/gi, 'Piraporinha (EMP)')
    .replace(/Santo André - HD/gi, 'Santo André (HD)')
    .replace(/Jabaquara - JAB/gi, 'Jabaquara (JAB)')
    .replace(/Maua - MHE/gi, 'Mauá (MHE)')
    .replace(/Kennedy - MP/gi, 'Kennedy (MP)')
    .replace(/Rei do Módulo - MP/gi, 'R. Módulo (MP)')
    .replace(/Rei do /gi, 'R. ')
    .replace(/Mecânica /gi, '');
};

// Paletas refinadas
const PALETTES: Record<TabType, string[]> = {
  saldo: [
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#0EA5E9', // Sky
    '#8B5CF6', // Violet
    '#2563EB', // Royal Blue
    '#38BDF8', // Light Blue
    '#60A5FA', // Soft Blue
    '#818CF8', // Soft Indigo
    '#A78BFA', // Lavender
  ],
  faturamento: [
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#2DD4BF', // Mint
    '#3B82F6', // Blue
    '#059669', // Dark Emerald
    '#34D399', // Light Emerald
    '#0D9488', // Dark Teal
    '#6EE7B7', // Soft Mint
    '#22C55E', // Green
  ],
  contas: [
    '#F59E0B', // Amber
    '#F97316', // Orange
    '#EF4444', // Red/Coral
    '#FB923C', // Tangerine
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#D946EF', // Fuchsia
    '#E11D48', // Carmine
    '#FB7185', // Salmon
    '#EA580C', // Dark Orange
  ]
};

const CustomDonutTooltip = ({ active, payload, total, labelName }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = Number(item.value || 0);
    const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="bg-[#0f111a]/95 backdrop-blur-md border border-[var(--border-subtle)] px-3.5 py-2.5 rounded-xl shadow-2xl min-w-[190px] pointer-events-none z-[99999]">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--border-subtle)]">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.fill }} />
          <span className="text-xs font-bold text-white truncate max-w-[150px]">
            {item.payload.fullName || item.name}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs gap-3">
          <span className="text-[var(--text-secondary)]">{labelName}:</span>
          <span className="font-mono font-bold text-white">
            {formatCurrency(val)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mt-1">
          <span>Participação:</span>
          <span className="font-semibold text-[var(--color-primary)]">
            {percent}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function StoreAnalyticsTabs({ data, isLoading }: StoreAnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('faturamento');

  const tabConfig = useMemo(() => {
    switch (activeTab) {
      case 'saldo':
        return {
          title: 'Saldo Bancário por Unidade',
          subtitle: 'Distribuição dos saldos das contas bancárias Itaú por unidade no fechamento',
          badgeText: 'Conta Bancária (Itaú)',
          color: 'blue',
          accentColor: '#3B82F6',
          icon: Landmark,
          field: 'saldoAtual',
          unitLabel: 'Saldo',
        };
      case 'contas':
        return {
          title: 'Contas e Despesas por Unidade',
          subtitle: 'Saídas e pagamentos debitados nas contas bancárias de cada unidade (OFX)',
          badgeText: 'OFX (Saídas Bancárias)',
          color: 'amber',
          accentColor: '#F59E0B',
          icon: CreditCard,
          field: 'contas',
          unitLabel: 'Despesa',
        };
      case 'faturamento':
      default:
        return {
          title: 'Faturamento por Unidade',
          subtitle: 'Recebimentos e faturamento operacional de cada unidade apurado via OFX e cartões',
          badgeText: 'OFX (Entradas Bancárias)',
          color: 'emerald',
          accentColor: '#10B981',
          icon: TrendingUp,
          field: 'faturamento',
          unitLabel: 'Faturamento',
        };
    }
  }, [activeTab]);

  const {
    allItems,
    positiveItems,
    negativeItems,
    totalNet,
    totalPositive,
    totalNegative,
    media,
    topStore,
    minStore
  } = useMemo(() => {
    const stores = data || [];
    const field = tabConfig.field;

    const list = stores
      .map(s => ({
        storeId: s.storeId || s.store_id || '',
        name: cleanStoreLabel(s.storeName || s.store_name),
        fullName: s.storeName || s.store_name || 'Unidade',
        value: Number(s[field] || 0),
      }))
      .sort((a, b) => b.value - a.value);

    const pos = list.filter(s => s.value > 0);
    const neg = list.filter(s => s.value < 0);

    const net = list.reduce((acc, cur) => acc + cur.value, 0);
    const posSum = pos.reduce((acc, cur) => acc + cur.value, 0);
    const negSum = Math.abs(neg.reduce((acc, cur) => acc + cur.value, 0));
    const avg = list.length > 0 ? net / list.length : 0;
    const top = list[0] || null;
    const min = list.length > 1 ? list[list.length - 1] : null;

    return {
      allItems: list,
      positiveItems: pos,
      negativeItems: neg,
      totalNet: net,
      totalPositive: posSum,
      totalNegative: negSum,
      media: avg,
      topStore: top,
      minStore: min,
    };
  }, [data, tabConfig.field]);

  const colors = PALETTES[activeTab];

  if (isLoading) {
    return (
      <Card className="h-[420px] animate-pulse p-6 flex flex-col justify-center">
        <div className="h-6 w-48 bg-[var(--bg-surface-hover)] rounded mb-4" />
        <div className="h-[300px] bg-[var(--bg-surface-hover)] rounded" />
      </Card>
    );
  }

  return (
    <Card className="w-full p-6 flex flex-col gap-6 overflow-hidden">
      {/* ── HEADER COM TABS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <tabConfig.icon size={18} style={{ color: tabConfig.accentColor }} />
            <h3 className="font-display font-semibold text-lg text-[var(--text-primary)]">
              {tabConfig.title}
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {tabConfig.badgeText}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {tabConfig.subtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-1 rounded-xl shadow-inner self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('saldo')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'saldo'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Landmark size={14} />
            <span>Saldo Bancário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faturamento')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'faturamento'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <TrendingUp size={14} />
            <span>Faturamento (OFX)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contas')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contas'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <CreditCard size={14} />
            <span>Contas (OFX)</span>
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL (DONUT + PAINEL DE RANKING) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          {/* COLUNA ESQUERDA: DONUT CHART (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
            <div className="relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={
                      <CustomDonutTooltip
                        total={totalPositive}
                        labelName={tabConfig.unitLabel}
                      />
                    }
                  />
                  <Pie
                    data={positiveItems}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {positiveItems.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={colors[index % colors.length]}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centro do Donut com Total Líquido */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  {activeTab === 'saldo' ? 'Saldo Total' : 'Total'}
                </span>
                <span className="font-mono font-bold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">
                  {formatCompact(totalNet)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">
                  {allItems.length} unidades
                </span>
              </div>
            </div>

            {/* Alerta explícito de Saldo Negativo se houver */}
            {negativeItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium mt-3 text-center">
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                  <strong>{negativeItems.length}</strong> {negativeItems.length === 1 ? 'unidade com saldo negativo' : 'unidades com saldo negativo'} ({formatCurrency(-totalNegative)})
                </span>
              </div>
            )}

            {/* Legenda Resumida do Donut */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-sm">
              {positiveItems.slice(0, 4).map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface-hover)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="truncate max-w-[90px]">{item.name}</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {totalPositive > 0 ? `${((item.value / totalPositive) * 100).toFixed(0)}%` : '0%'}
                  </span>
                </div>
              ))}
              {positiveItems.length > 4 && (
                <span className="text-[10px] text-[var(--text-tertiary)] self-center px-1">
                  +{positiveItems.length - 4} outras unidades
                </span>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: PAINEL ANALÍTICO & RANKING DAS 10 UNIDADES (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* 4 Mini Cards de Métricas da Aba */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[var(--bg-surface-hover)]/70 border border-[var(--border-subtle)] p-3 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold block">
                  {activeTab === 'saldo' ? 'Saldo Líquido' : 'Total Geral'}
                </span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)] block mt-0.5">
                  {formatCurrency(totalNet)}
                </span>
              </div>

              <div className="bg-[var(--bg-surface-hover)]/70 border border-[var(--border-subtle)] p-3 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold block">
                  Média por Unidade
                </span>
                <span className="font-mono font-bold text-sm text-[var(--text-secondary)] block mt-0.5">
                  {formatCurrency(media)}
                </span>
              </div>

              <div className="bg-[var(--bg-surface-hover)]/70 border border-[var(--border-subtle)] p-3 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold block flex items-center gap-1">
                  <Award size={11} className="text-amber-400" />
                  Maior Volume
                </span>
                <span className="font-semibold text-xs text-[var(--text-primary)] truncate block mt-0.5">
                  {topStore ? topStore.name : '-'}
                </span>
                <span className="font-mono text-[10px] text-[var(--color-primary)] font-bold block">
                  {topStore ? `${formatCompact(topStore.value)} (${totalPositive > 0 ? ((Math.max(0, topStore.value) / totalPositive) * 100).toFixed(0) : 0}%)` : ''}
                </span>
              </div>

              <div className="bg-[var(--bg-surface-hover)]/70 border border-[var(--border-subtle)] p-3 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold block flex items-center gap-1">
                  <ArrowDownRight size={11} className={minStore && minStore.value < 0 ? 'text-rose-400' : 'text-zinc-400'} />
                  {minStore && minStore.value < 0 ? 'Maior Descoberto' : 'Menor Volume'}
                </span>
                <span className={`font-semibold text-xs truncate block mt-0.5 ${minStore && minStore.value < 0 ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                  {minStore ? minStore.name : '-'}
                </span>
                <span className={`font-mono text-[10px] block ${minStore && minStore.value < 0 ? 'text-rose-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                  {minStore ? formatCurrency(minStore.value) : ''}
                </span>
              </div>
            </div>

            {/* Ranking Progress Bars das Unidades */}
            <div className="bg-[var(--bg-surface-elevated)]/60 border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pb-1.5 border-b border-[var(--border-subtle)]">
                <span className="flex items-center gap-1.5">
                  <BarChart3 size={12} />
                  Ranking por Unidade ({allItems.length} unidades)
                </span>
                <span>Participação (%) / Valor</span>
              </div>

              <div className="space-y-2.5 max-h-[230px] overflow-y-auto pr-1">
                {allItems.map((item, index) => {
                  const isNegative = item.value < 0;
                  const percent = totalPositive > 0 && item.value > 0 ? (item.value / totalPositive) * 100 : 0;
                  const itemColor = isNegative ? '#F43F5E' : colors[index % colors.length];

                  return (
                    <div key={item.name} className="flex flex-col gap-1 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono font-bold text-[10px] text-[var(--text-tertiary)] w-4">
                            {index + 1}º
                          </span>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                          <span className="font-medium text-[var(--text-primary)] group-hover:text-white transition-colors truncate">
                            {item.fullName}
                          </span>
                          {isNegative && (
                            <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Negativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                          <span className={`font-bold ${isNegative ? 'text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                            {isNegative ? '-' : `${percent.toFixed(1)}%`}
                          </span>
                          <span className={`font-bold ${isNegative ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Proporcional */}
                      <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: isNegative ? '100%' : `${percent}%` }}
                          transition={{ duration: 0.5, delay: index * 0.03 }}
                          className={`h-full rounded-full ${isNegative ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: itemColor }}
                        />
                      </div>
                    </div>
                  );
                })}

                {allItems.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--text-tertiary)]">
                    Nenhum valor apurado nesta dimensão para a data selecionada.
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
