import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { TrendingUp, CreditCard } from 'lucide-react';

interface StoreDonutChartsProps {
  data: any[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${Math.round(value)}`;
};

const cleanStoreLabel = (name?: string) => {
  if (!name) return 'Loja';
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

// Paleta verde/ciano elegante para Faturamento
const FATURAMENTO_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#0EA5E9', // Sky
  '#8B5CF6', // Violet
  '#2DD4BF', // Mint
  '#38BDF8', // Light Blue
  '#A78BFA', // Lavender
];

// Paleta âmbar/laranja/coral elegante para Contas
const CONTAS_COLORS = [
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EF4444', // Red/Coral
  '#FB923C', // Tangerine
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#D946EF', // Fuchsia
  '#E11D48', // Carmine
  '#BE185D', // Deep pink
  '#FB7185', // Salmon
];

const CustomDonutTooltip = ({ active, payload, total, type }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = Number(item.value || 0);
    const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="bg-[#0f111a]/95 backdrop-blur-md border border-[var(--border-subtle)] px-3.5 py-2.5 rounded-xl shadow-2xl min-w-[180px] pointer-events-none z-[99999]">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--border-subtle)]">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.fill }} />
          <span className="text-xs font-bold text-white truncate max-w-[150px]">
            {item.payload.fullName || item.name}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs gap-3">
          <span className="text-[var(--text-secondary)]">
            {type === 'faturamento' ? 'Faturamento:' : 'Despesa:'}
          </span>
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

export function StoreDonutCharts({ data, isLoading }: StoreDonutChartsProps) {
  const { faturamentoData, contasData, totalFaturamento, totalContas } = useMemo(() => {
    const stores = data || [];
    
    const fatItems = stores
      .filter(s => Number(s.faturamento || 0) > 0)
      .map(s => ({
        name: cleanStoreLabel(s.storeName || s.store_name),
        fullName: s.storeName || s.store_name,
        value: Number(s.faturamento || 0),
      }))
      .sort((a, b) => b.value - a.value);

    const contasItems = stores
      .filter(s => Number(s.contas || 0) > 0)
      .map(s => ({
        name: cleanStoreLabel(s.storeName || s.store_name),
        fullName: s.storeName || s.store_name,
        value: Number(s.contas || 0),
      }))
      .sort((a, b) => b.value - a.value);

    const totalFat = fatItems.reduce((acc, cur) => acc + cur.value, 0);
    const totalCont = contasItems.reduce((acc, cur) => acc + cur.value, 0);

    return {
      faturamentoData: fatItems,
      contasData: contasItems,
      totalFaturamento: totalFat,
      totalContas: totalCont,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="h-[260px] animate-pulse p-4 flex flex-col justify-center">
          <div className="h-4 w-32 bg-[var(--bg-surface-hover)] rounded mb-4" />
          <div className="h-[180px] bg-[var(--bg-surface-hover)] rounded" />
        </Card>
        <Card className="h-[260px] animate-pulse p-4 flex flex-col justify-center">
          <div className="h-4 w-32 bg-[var(--bg-surface-hover)] rounded mb-4" />
          <div className="h-[180px] bg-[var(--bg-surface-hover)] rounded" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── CARD 1: DONUT FATURAMENTO POR LOJA ── */}
      <Card className="p-5 flex flex-col overflow-visible">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--color-accent-teal)]" />
            <h4 className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Faturamento por Filial
            </h4>
          </div>
          <span className="font-mono text-xs font-bold text-[var(--color-accent-teal)]">
            {formatCompact(totalFaturamento)}
          </span>
        </div>

        {faturamentoData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-[var(--text-tertiary)]">Sem faturamento registrado</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Gráfico Donut com Total Central */}
            <div className="relative w-[150px] h-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={faturamentoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {faturamentoData.map((_, index) => (
                      <Cell
                        key={`fat-cell-${index}`}
                        fill={FATURAMENTO_COLORS[index % FATURAMENTO_COLORS.length]}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomDonutTooltip total={totalFaturamento} type="faturamento" />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 99999, outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Texto Central */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Total</span>
                <span className="text-xs font-bold font-mono text-white">
                  {formatCompact(totalFaturamento)}
                </span>
              </div>
            </div>

            {/* Mini Legenda Top 4 */}
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {faturamentoData.slice(0, 4).map((item, idx) => {
                const pct = totalFaturamento > 0 ? ((item.value / totalFaturamento) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-1">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: FATURAMENTO_COLORS[idx % FATURAMENTO_COLORS.length] }}
                      />
                      <span className="truncate text-[var(--text-secondary)] text-[11px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-white shrink-0">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {faturamentoData.length > 4 && (
                <p className="text-[10px] text-[var(--text-tertiary)] pt-1 text-right">
                  + {faturamentoData.length - 4} outras filiais
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── CARD 2: DONUT CONTAS (DESPESAS) POR LOJA ── */}
      <Card className="p-5 flex flex-col overflow-visible">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-[var(--color-accent-warning)]" />
            <h4 className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Contas (OFX) por Filial
            </h4>
          </div>
          <span className="font-mono text-xs font-bold text-[var(--color-accent-warning)]">
            {formatCompact(totalContas)}
          </span>
        </div>

        {contasData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-[var(--text-tertiary)]">Sem contas registradas</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Gráfico Donut com Total Central */}
            <div className="relative w-[150px] h-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contasData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {contasData.map((_, index) => (
                      <Cell
                        key={`contas-cell-${index}`}
                        fill={CONTAS_COLORS[index % CONTAS_COLORS.length]}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomDonutTooltip total={totalContas} type="contas" />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 99999, outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Texto Central */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Saídas</span>
                <span className="text-xs font-bold font-mono text-white">
                  {formatCompact(totalContas)}
                </span>
              </div>
            </div>

            {/* Mini Legenda Top 4 */}
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {contasData.slice(0, 4).map((item, idx) => {
                const pct = totalContas > 0 ? ((item.value / totalContas) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-1">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CONTAS_COLORS[idx % CONTAS_COLORS.length] }}
                      />
                      <span className="truncate text-[var(--text-secondary)] text-[11px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-white shrink-0">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {contasData.length > 4 && (
                <p className="text-[10px] text-[var(--text-tertiary)] pt-1 text-right">
                  + {contasData.length - 4} outras filiais
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
