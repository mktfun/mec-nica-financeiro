import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type ModalKpiCardColor = 'amber' | 'emerald' | 'rose' | 'blue' | 'purple' | 'red' | 'zinc' | 'default';
export type ModalKpiCardVariant = 'dot' | 'border-l';

export interface ModalKpiCardProps {
  label: string;
  value: string | number | ReactNode;
  subtitle?: string;
  subtitleExtra?: ReactNode;
  color?: ModalKpiCardColor;
  variant?: ModalKpiCardVariant;
  icon?: LucideIcon | React.ElementType;
  danger?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  className?: string;
  title?: string;
}

const dotColorMap: Record<ModalKpiCardColor, string> = {
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  red: 'bg-red-400',
  zinc: 'bg-[var(--text-tertiary)]',
  default: 'bg-[var(--text-tertiary)]'
};

const iconColorMap: Record<ModalKpiCardColor, string> = {
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
  zinc: 'text-[var(--text-tertiary)]',
  default: 'text-[var(--text-tertiary)]'
};

const valueColorMap: Record<ModalKpiCardColor, string> = {
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
  blue: 'text-blue-300',
  purple: 'text-purple-300',
  red: 'text-red-400',
  zinc: 'text-[var(--text-primary)]',
  default: 'text-[var(--text-primary)]'
};

const borderLeftMap: Record<ModalKpiCardColor, string> = {
  amber: 'border-l-amber-500',
  emerald: 'border-l-emerald-500',
  rose: 'border-l-rose-500',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  red: 'border-l-red-500',
  zinc: 'border-l-zinc-500',
  default: 'border-l-[var(--border-subtle)]'
};

export function ModalKpiCard({
  label,
  value,
  subtitle,
  subtitleExtra,
  color = 'default',
  variant = 'dot',
  icon: Icon,
  danger = false,
  interactive = false,
  onClick,
  actionLabel,
  className,
  title
}: ModalKpiCardProps) {
  const isClickable = interactive || Boolean(onClick);

  // Se danger for true, sobrescreve o estilo para alerta fiduciário (ex: cheque especial)
  if (danger) {
    return (
      <div
        onClick={onClick}
        title={title}
        className={cn(
          'bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 space-y-1 transition-all',
          isClickable && 'cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 active:scale-[0.99]',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold uppercase tracking-wider">
            {Icon ? <Icon className="w-3.5 h-3.5 text-red-400 shrink-0" /> : <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />}
            <span>{label}</span>
          </div>
          {actionLabel && (
            <span className="text-[9px] text-red-300 underline opacity-80 hover:opacity-100">
              {actionLabel}
            </span>
          )}
        </div>

        <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-red-400">
          {value}
        </div>

        {subtitle && (
          <div className="text-[10px] text-red-400/80">
            {subtitle}
          </div>
        )}

        {subtitleExtra && (
          <div className="pt-2 mt-2 border-t border-red-500/20 text-[11px] text-red-300/80 font-mono">
            {subtitleExtra}
          </div>
        )}
      </div>
    );
  }

  // Variante border-l (Padrão Pátio)
  if (variant === 'border-l') {
    return (
      <div
        onClick={onClick}
        title={title}
        className={cn(
          'bg-[var(--bg-canvas)] border border-[var(--border-subtle)] border-l-4 rounded-xl p-3.5 space-y-1 transition-all',
          borderLeftMap[color] || borderLeftMap.default,
          isClickable && 'cursor-pointer hover:bg-[var(--bg-surface-hover)] active:scale-[0.99]',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
            {Icon && <Icon className={cn('w-3.5 h-3.5 shrink-0', iconColorMap[color])} />}
            <span>{label}</span>
          </div>
          {actionLabel && (
            <span className="text-[9px] text-amber-300 underline opacity-80 hover:opacity-100">
              {actionLabel}
            </span>
          )}
        </div>

        <div className={cn('text-lg sm:text-xl font-bold font-sans tabular-nums', valueColorMap[color])}>
          {value}
        </div>

        {subtitle && (
          <div className="text-[10px] text-[var(--text-tertiary)]">
            {subtitle}
          </div>
        )}

        {subtitleExtra && (
          <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono">
            {subtitleExtra}
          </div>
        )}
      </div>
    );
  }

  // Variante padrão: 'dot' (Padrão Cofre & Raio-X)
  return (
    <div
      onClick={onClick}
      title={title}
      className={cn(
        'bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1 transition-all',
        isClickable && 'cursor-pointer hover:border-amber-400/50 hover:bg-amber-500/5 active:scale-[0.99] group/kpi shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
          {Icon ? (
            <Icon className={cn('w-3.5 h-3.5 shrink-0', iconColorMap[color])} />
          ) : (
            <span className={cn('w-2 h-2 rounded-full shrink-0', dotColorMap[color])} />
          )}
          <span>{label}</span>
        </div>
        {actionLabel && (
          <span className="text-[9px] text-amber-300 underline opacity-80 group-hover/kpi:opacity-100">
            {actionLabel}
          </span>
        )}
      </div>

      <div className={cn('text-lg sm:text-xl font-bold font-sans tabular-nums', valueColorMap[color])}>
        {value}
      </div>

      {subtitle && (
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {subtitle}
        </div>
      )}

      {subtitleExtra && (
        <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono">
          {subtitleExtra}
        </div>
      )}
    </div>
  );
}
