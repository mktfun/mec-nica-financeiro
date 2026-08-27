import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, HelpCircle, LucideIcon } from "lucide-react";
import { AmountCell } from "./AmountCell";

export type KpiTone = "neutral" | "brand" | "primary" | "teal" | "success" | "warning" | "danger" | "info";

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
  color?: string; // Retrocompatibilidade ampla com código legado ('primary', 'teal', etc.)
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

  // Normalização resiliente de tone com suporte a todas as variantes legadas
  const rawTone = (color ?? tone ?? "neutral") as string;
  const toneMap: Record<string, "neutral" | "brand" | "teal" | "warning" | "danger"> = {
    primary: "brand",
    brand: "brand",
    teal: "teal",
    success: "teal",
    warning: "warning",
    danger: "danger",
    neutral: "neutral",
    info: "brand",
  };
  const normalizedTone = toneMap[rawTone] || "neutral";

  const toneBorders: Record<"neutral" | "brand" | "teal" | "warning" | "danger", string> = {
    neutral: "border-[var(--border-subtle)] hover:border-zinc-700",
    brand: "border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/60 bg-[var(--color-primary)]/[0.03]",
    teal: "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10",
    warning: "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10",
    danger: "border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10",
  };

  const toneIcons: Record<"neutral" | "brand" | "teal" | "warning" | "danger", { bg: string; text: string }> = {
    neutral: { bg: "bg-zinc-800/80", text: "text-zinc-300" },
    brand: { bg: "bg-[var(--color-primary)]/15", text: "text-[var(--color-primary-bright)]" },
    teal: { bg: "bg-emerald-950/60", text: "text-emerald-400" },
    warning: { bg: "bg-amber-950/60", text: "text-amber-400" },
    danger: { bg: "bg-rose-950/60", text: "text-rose-400" },
  };

  const currentBorder = toneBorders[normalizedTone] || toneBorders.neutral;
  const currentIcon = toneIcons[normalizedTone] || toneIcons.neutral;

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
        currentBorder,
        onClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      {/* Header: Ícone + Tooltip */}
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", currentIcon.bg)}>
            <Icon size={18} className={currentIcon.text} />
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
          <AmountCell value={value} tone={normalizedTone === "danger" ? "danger" : normalizedTone === "teal" ? "success" : "neutral"} />
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
