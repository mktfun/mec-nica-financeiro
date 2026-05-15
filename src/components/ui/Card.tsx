import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "elevated" | "glass" | "transparent";
}

export function Card({
  className,
  variant = "elevated",
  children,
  ...props
}: CardProps) {
  const variants = {
    elevated: "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]",
    glass: "glass-panel",
    transparent: "bg-transparent border border-[var(--border-subtle)]",
  };

  return (
    <motion.div
      className={cn("rounded-[var(--radius-lg)] p-6 overflow-hidden relative", variants[variant], className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
