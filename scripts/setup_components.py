import os

files = {
'src/components/ui/table/TableContainer.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "compact" | "standard" | "comfortable";
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm relative",
        className
      )}
      {...props}
    >
      <table className="w-full text-left border-collapse border-spacing-0">
        {children}
      </table>
    </div>
  );
});

TableContainer.displayName = "TableContainer";
''',

'src/components/ui/table/TableHeader.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(({
  className,
  sticky = true,
  children,
  ...props
}, ref) => {
  return (
    <thead
      ref={ref}
      className={cn(
        "border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/90 backdrop-blur-sm",
        sticky && "sticky top-0 z-10",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
});

TableHeader.displayName = "TableHeader";
''',

'src/components/ui/table/TableBody.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <tbody
      ref={ref}
      className={cn("divide-y divide-[var(--border-subtle)]/60 text-sm", className)}
      {...props}
    >
      {children}
    </tbody>
  );
});

TableBody.displayName = "TableBody";
''',

'src/components/ui/table/TableRow.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isDivergent?: boolean;
  isSelected?: boolean;
  isPending?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({
  className,
  isDivergent,
  isSelected,
  isPending,
  children,
  ...props
}, ref) => {
  return (
    <tr
      ref={ref}
      className={cn(
        "transition-colors duration-100 ease-out hover:bg-white/[0.03]",
        isDivergent && "bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-l-rose-500",
        isSelected && "bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/15 border-l-2 border-l-[var(--color-primary)]",
        isPending && "bg-amber-950/15 hover:bg-amber-950/25 border-l-2 border-l-amber-500",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = "TableRow";
''',

'src/components/ui/table/TableHead.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(({
  className,
  align = "left",
  isNumeric = false,
  children,
  ...props
}, ref) => {
  return (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--text-tertiary)] select-none whitespace-nowrap",
        (isNumeric || align === "right") && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
});

TableHead.displayName = "TableHead";
''',

'src/components/ui/table/TableCell.tsx': '''import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  density?: "compact" | "standard" | "comfortable";
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({
  className,
  align = "left",
  isNumeric = false,
  density = "standard",
  children,
  ...props
}, ref) => {
  const densityStyles = {
    compact: "px-3 py-2 text-xs",
    standard: "px-4 py-3 text-sm",
    comfortable: "px-5 py-4 text-sm",
  };

  return (
    <td
      ref={ref}
      className={cn(
        "text-[var(--text-primary)] transition-colors align-middle",
        densityStyles[density],
        (isNumeric || align === "right") && "font-mono tabular-nums text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
});

TableCell.displayName = "TableCell";
''',

'src/components/ui/table/index.ts': '''export * from "./TableContainer";
export * from "./TableHeader";
export * from "./TableBody";
export * from "./TableRow";
export * from "./TableHead";
export * from "./TableCell";
''',

'src/components/finance/AmountCell.tsx': '''import React from "react";
import { cn } from "@/lib/utils";

export type AmountTone = "auto" | "success" | "danger" | "warning" | "neutral" | "brand";

export interface AmountCellProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined;
  tone?: AmountTone;
  showZeroAsDash?: boolean;
  showPlusSign?: boolean;
  prefix?: string;
  className?: string;
}

export function formatBrlCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function AmountCell({
  value,
  tone = "neutral",
  showZeroAsDash = false,
  showPlusSign = false,
  prefix,
  className,
  ...props
}: AmountCellProps) {
  if (value === null || value === undefined) {
    return <span className={cn("font-mono tabular-nums text-right text-[var(--text-tertiary)]", className)}>—</span>;
  }

  const normalizedVal = Math.abs(value) < 0.005 ? 0 : value;

  if (normalizedVal === 0 && showZeroAsDash) {
    return <span className={cn("font-mono tabular-nums text-right text-[var(--text-tertiary)]", className)}>—</span>;
  }

  // Semáforo cromático estrito:
  // Verde: EXCLUSIVAMENTE quando saldo for 100% conciliado / diferença zero (diff === 0)
  // Vermelho: EXCLUSIVAMENTE divergência real / rombo / saldo a descoberto
  // Âmbar: pendente / em compensação
  const toneClasses: Record<AmountTone, string> = {
    auto: normalizedVal === 0 
      ? "text-emerald-400 font-semibold" 
      : normalizedVal > 0 
        ? "text-[var(--text-primary)]" 
        : "text-rose-400 font-semibold",
    success: "text-emerald-400 font-semibold",
    danger: "text-rose-400 font-semibold",
    warning: "text-amber-400 font-medium",
    neutral: "text-[var(--text-primary)]",
    brand: "text-[var(--color-primary-bright)]",
  };

  const formatted = formatBrlCurrency(normalizedVal);
  const displayValue = (showPlusSign && normalizedVal > 0) ? + : formatted;

  return (
    <span
      className={cn(
        "font-mono tabular-nums text-right inline-block whitespace-nowrap tracking-tight select-all",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {prefix && <span className="text-[10px] text-[var(--text-tertiary)] mr-1 font-sans">{prefix}</span>}
      {displayValue}
    </span>
  );
}
''',

'src/components/finance/CurrencyDisplay.tsx': '''import React from "react";
import { cn } from "@/lib/utils";
import { formatBrlCurrency } from "./AmountCell";

export interface CurrencyDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "neutral" | "success" | "danger" | "warning" | "brand";
  isDivergent?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  value,
  size = "md",
  tone = "neutral",
  isDivergent = false,
  className,
  ...props
}: CurrencyDisplayProps) {
  const normalizedVal = value ?? 0;
  const formatted = formatBrlCurrency(normalizedVal);

  const sizes = {
    sm: "text-sm",
    md: "text-base font-semibold",
    lg: "text-2xl font-bold tracking-tight",
    xl: "text-3xl md:text-4xl font-extrabold tracking-tight",
  };

  const tones = {
    neutral: "text-[var(--text-primary)]",
    success: "text-emerald-400",
    danger: "text-rose-400",
    warning: "text-amber-400",
    brand: "text-[var(--color-primary-bright)]",
  };

  const activeTone = isDivergent ? "danger" : tone;

  return (
    <div
      className={cn(
        "font-mono tabular-nums leading-none inline-flex items-baseline gap-1 select-all",
        sizes[size],
        tones[activeTone],
        className
      )}
      {...props}
    >
      <span>{formatted}</span>
    </div>
  );
}
''',

'src/components/finance/DiscrepancyBadge.tsx': '''import React from "react";
import { Badge } from "@/components/ui/Badge";
import { formatBrlCurrency } from "./AmountCell";
import { cn } from "@/lib/utils";

export interface DiscrepancyBadgeProps {
  difference: number;
  label?: string;
  className?: string;
}

export function DiscrepancyBadge({
  difference,
  label,
  className,
}: DiscrepancyBadgeProps) {
  const isZero = Math.abs(difference) < 0.005;

  if (isZero) {
    return (
      <Badge variant="success" dot className={cn("gap-1 text-[11px]", className)}>
        <span>{label ?? "Conciliado (R$ 0,00)"}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="danger" dot className={cn("gap-1 text-[11px] font-mono", className)}>
      <span>{label ? ${label}:  : "Divergência: "}</span>
      <span className="tabular-nums font-bold">{formatBrlCurrency(difference)}</span>
    </Badge>
  );
}
''',

'src/components/finance/KpiCard.tsx': '''import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, HelpCircle, LucideIcon } from "lucide-react";
import { AmountCell } from "./AmountCell";

export type KpiTone = "neutral" | "brand" | "teal" | "warning" | "danger";

export interface KpiBreakdownItem {
  label: string;
  value: number | string;
  tone?: KpiTone;
}

export interface KpiCardProps {
  id?: string;
  title?: string;
  label?: string; // Retrocompatibilidade com código legado
  value: number | string;
  format?: "currency" | "count" | "percent" | "raw";
  tone?: KpiTone;
  color?: KpiTone; // Retrocompatibilidade
  trend?: number | { value: number; label?: string; invertPolarity?: boolean };
  trendLabel?: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  tooltip?: string;
  breakdown?: KpiBreakdownItem[];
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function KpiCard({
  title,
  label,
  value,
  format = "currency",
  tone = "neutral",
  color,
  trend,
  trendLabel = "vs anterior",
  icon: Icon,
  tooltip,
  breakdown,
  isLoading = false,
  className,
  children,
  onClick,
}: KpiCardProps) {
  const displayTitle = label ?? title ?? "";
  const activeTone = color ?? tone;

  const toneBorders: Record<KpiTone, string> = {
    neutral: "border-[var(--border-subtle)] hover:border-zinc-700",
    brand: "border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/60 bg-[var(--color-primary)]/[0.03]",
    teal: "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10",
    warning: "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10",
    danger: "border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10",
  };

  const toneIcons: Record<KpiTone, { bg: string; text: string }> = {
    neutral: { bg: "bg-zinc-800/80", text: "text-zinc-300" },
    brand: { bg: "bg-[var(--color-primary)]/15", text: "text-[var(--color-primary-bright)]" },
    teal: { bg: "bg-emerald-950/60", text: "text-emerald-400" },
    warning: { bg: "bg-amber-950/60", text: "text-amber-400" },
    danger: { bg: "bg-rose-950/60", text: "text-rose-400" },
  };

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 animate-pulse flex flex-col gap-3">
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        <div className="h-8 w-36 bg-zinc-800 rounded" />
        <div className="h-3 w-20 bg-zinc-800 rounded" />
      </div>
    );
  }

  // Tratamento de tendência
  const trendVal = typeof trend === "number" ? trend : trend?.value;
  const trendLbl = typeof trend === "object" ? trend.label ?? trendLabel : trendLabel;
  const trendPositive = (trendVal ?? 0) >= 0;
  const TrendIcon = trendVal === 0 || trendVal === undefined ? Minus : trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trendVal === undefined || trendVal === 0
    ? "text-zinc-500"
    : trendPositive ? "text-emerald-400" : "text-rose-400";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-5 flex flex-col gap-3 transition-all duration-150 relative",
        toneBorders[activeTone],
        onClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      {/* Header: Ícone + Tooltip */}
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", toneIcons[activeTone].bg)}>
            <Icon size={18} className={toneIcons[activeTone].text} />
          </div>
        )}

        {tooltip && (
          <div className="relative group/tip ml-auto">
            <button
              type="button"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              title={tooltip}
            >
              <HelpCircle size={14} />
            </button>
            <div className="absolute right-0 top-6 z-30 hidden group-hover/tip:block w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-[11px] text-zinc-300 shadow-xl leading-relaxed">
              {tooltip}
            </div>
          </div>
        )}
      </div>

      {/* Label / Título */}
      {displayTitle && (
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold font-mono">
          {displayTitle}
        </span>
      )}

      {/* Valor Principal */}
      <div className="font-mono font-bold text-2xl md:text-3xl text-[var(--text-primary)] leading-none tabular-nums">
        {typeof value === "number" && format === "currency" ? (
          <AmountCell value={value} tone={activeTone === "danger" ? "danger" : activeTone === "teal" ? "success" : "neutral"} />
        ) : typeof value === "number" && format === "percent" ? (
          <span>{value.toFixed(1)}%</span>
        ) : (
          <span>{value}</span>
        )}
      </div>

      {/* Footer / Tendência */}
      {trendVal !== undefined && (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium font-mono tabular-nums", trendColor)}>
          <TrendIcon size={13} />
          <span>
            {trendVal > 0 ? "+" : ""}{trendVal.toFixed(1)}% {trendLbl}
          </span>
        </div>
      )}

      {/* Breakdown detalhado */}
      {breakdown && breakdown.length > 0 && (
        <div className="pt-2 mt-1 border-t border-[var(--border-subtle)]/80 flex flex-col gap-1 text-xs">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-zinc-400">
              <span>{item.label}</span>
              <span className="font-mono font-semibold tabular-nums text-zinc-200">
                {typeof item.value === "number" ? <AmountCell value={item.value} /> : item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
''',

'src/components/finance/index.ts': '''export * from "./AmountCell";
export * from "./CurrencyDisplay";
export * from "./DiscrepancyBadge";
export * from "./KpiCard";
'''
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Generated {len(files)} components successfully.")