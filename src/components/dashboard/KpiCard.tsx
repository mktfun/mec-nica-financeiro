import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useState } from 'react';

type KpiColor = 'primary' | 'teal' | 'danger' | 'warning';

interface KpiCardProps {
  label: string;
  value: number;
  format?: 'currency' | 'count';
  trend?: number;        // % variação vs mês anterior
  trendLabel?: string;
  icon: LucideIcon;
  color?: KpiColor;
  tooltip?: string;
  isLoading?: boolean;
  index?: number;        // para delay de animação
}

const COLOR_MAP: Record<KpiColor, { icon: string; bg: string; badge: string }> = {
  primary:  { icon: 'text-[var(--color-primary)]',        bg: 'bg-[var(--color-primary)]/15',        badge: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' },
  teal:     { icon: 'text-[var(--color-accent-teal)]',    bg: 'bg-[var(--color-accent-teal)]/15',    badge: 'bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)]' },
  danger:   { icon: 'text-[var(--color-accent-danger)]',  bg: 'bg-[var(--color-accent-danger)]/15',  badge: 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]' },
  warning:  { icon: 'text-[var(--color-accent-warning)]', bg: 'bg-[var(--color-accent-warning)]/15', badge: 'bg-[var(--color-accent-warning)]/20 text-[var(--color-accent-warning)]' },
};

export function KpiCard({
  label,
  value,
  format = 'currency',
  trend,
  trendLabel = 'vs mês anterior',
  icon: Icon,
  color = 'primary',
  tooltip,
  isLoading = false,
  index = 0,
}: KpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const c = COLOR_MAP[color];

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 animate-pulse">
        <div className="h-4 w-24 bg-[var(--bg-surface-hover)] rounded mb-4" />
        <div className="h-8 w-36 bg-[var(--bg-surface-hover)] rounded mb-3" />
        <div className="h-3 w-20 bg-[var(--bg-surface-hover)] rounded" />
      </div>
    );
  }

  const trendPositive = (trend ?? 0) >= 0;
  const TrendIcon = trend === 0 || trend === undefined ? Minus : trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trend === undefined || trend === 0
    ? 'text-[var(--text-tertiary)]'
    : trendPositive ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 flex flex-col gap-3 relative group hover:border-[var(--color-primary)]/30 transition-colors"
    >
      {/* Ícone + Tooltip */}
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>

        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <HelpCircle size={14} />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-5 z-20 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-[11px] text-[var(--text-secondary)] shadow-xl leading-relaxed">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
        {label}
      </span>

      {/* Valor */}
      <div className="font-mono font-bold text-2xl md:text-3xl text-[var(--text-primary)] leading-none">
        {format === 'currency' ? (
          <AnimatedNumber value={value} format="currency" />
        ) : (
          <span>{value}</span>
        )}
      </div>

      {/* Tendência */}
      {trend !== undefined && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={13} />
          <span>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}% {trendLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
}
