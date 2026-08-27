import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "circle" | "danger" | "teal" | "warning";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:brightness-110 shadow-sm rounded-[var(--radius-full)]",
    secondary: "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-full)]",
    outline: "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] rounded-[var(--radius-full)]",
    ghost: "text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] rounded-[var(--radius-full)]",
    circle: "bg-[var(--btn-secondary-bg)] text-[var(--text-primary)] hover:brightness-110 rounded-full",
    danger: "bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/25 border border-[var(--color-accent-danger)]/30 rounded-[var(--radius-full)]",
    teal: "bg-[var(--color-accent-teal)]/15 text-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/25 border border-[var(--color-accent-teal)]/30 rounded-[var(--radius-full)]",
    warning: "bg-[var(--color-accent-warning)]/15 text-[var(--color-accent-warning)] hover:bg-[var(--color-accent-warning)]/25 border border-[var(--color-accent-warning)]/30 rounded-[var(--radius-full)]",
  };
  
  const sizes: Record<ButtonSize, string> = {
    xs: "h-7 px-2.5 text-xs",
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-7 text-base",
    icon: "h-10 w-10 p-0 shrink-0",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";
