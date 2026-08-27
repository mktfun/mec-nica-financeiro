import { cn } from "@/lib/utils";
import React from "react";

export type BadgeVariant = "success" | "danger" | "warning" | "neutral" | "brand" | "teal" | "info" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    // Verde Estrito: Apenas saldo 100% conciliado / diff === 0
    success: "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30",
    teal: "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30",
    // Vermelho Estrito: Divergência / Erro / Saldo a descoberto
    danger: "bg-rose-950/50 text-rose-400 border border-rose-500/30",
    // Âmbar: Transação pendente / em trânsito / compensação
    warning: "bg-amber-950/50 text-amber-400 border border-amber-500/30",
    // Neutro: Cadastros, metadados informativos
    neutral: "bg-zinc-800/80 text-zinc-300 border border-zinc-700/60",
    // Brand / Primário
    brand: "bg-[var(--color-primary)]/15 text-[var(--color-primary-bright)] border border-[var(--color-primary)]/30",
    // Info / Informativo
    info: "bg-sky-950/50 text-sky-400 border border-sky-500/30",
    // Outline discreto
    outline: "bg-transparent text-zinc-400 border border-zinc-800",
  };

  const sizes: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const dotColors: Record<BadgeVariant, string> = {
    success: "bg-emerald-400",
    teal: "bg-emerald-400",
    danger: "bg-rose-400",
    warning: "bg-amber-400",
    neutral: "bg-zinc-400",
    brand: "bg-[var(--color-primary-bright)]",
    info: "bg-sky-400",
    outline: "bg-zinc-500",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-semibold uppercase tracking-wider select-none shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", dotColors[variant])} />}
      {children}
    </div>
  );
}
