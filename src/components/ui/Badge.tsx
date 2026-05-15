import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "danger" | "warning" | "neutral" | "brand";
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  const variants = {
    success: "bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]",
    danger: "bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]",
    warning: "bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]",
    neutral: "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]",
    brand: "bg-[var(--color-primary)]/10 text-[var(--color-primary-bright)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
