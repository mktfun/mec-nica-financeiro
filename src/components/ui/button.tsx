import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "circle";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 rounded-[var(--radius-full)]",
    secondary: "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:opacity-90 rounded-[var(--radius-full)]",
    outline: "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] rounded-[var(--radius-full)]",
    ghost: "text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] rounded-[var(--radius-full)]",
    circle: "bg-[var(--btn-secondary-bg)] text-[var(--text-primary)] hover:opacity-90 rounded-full",
  };
  
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-lg",
    icon: "h-12 w-12",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
