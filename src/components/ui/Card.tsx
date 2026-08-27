import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: "elevated" | "glass" | "transparent" | "solid";
  animated?: boolean;
}

export function Card({
  className,
  variant = "elevated",
  animated = false,
  children,
  ...props
}: CardProps) {
  const variants = {
    elevated: "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]",
    solid: "bg-[var(--bg-surface)] border border-[var(--border-subtle)]",
    glass: "bg-[var(--bg-surface-elevated)]/90 backdrop-blur-sm border border-[var(--border-subtle)]",
    transparent: "bg-transparent border border-[var(--border-subtle)]",
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] p-6 overflow-hidden relative transition-all duration-150",
        variants[variant],
        animated && "animate-in fade-in-50 duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
