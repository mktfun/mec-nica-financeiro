import React, { forwardRef } from "react";
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
