import React from "react";
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
