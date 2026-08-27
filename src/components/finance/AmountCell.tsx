import React from "react";
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
  const displayValue = (showPlusSign && normalizedVal > 0) ? `+${formatted}` : formatted;

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
