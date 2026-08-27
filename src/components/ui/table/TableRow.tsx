import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isDivergent?: boolean;
  isSelected?: boolean;
  isPending?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({
  className,
  isDivergent,
  isSelected,
  isPending,
  children,
  ...props
}, ref) => {
  return (
    <tr
      ref={ref}
      className={cn(
        "transition-colors duration-100 ease-out hover:bg-white/[0.03]",
        isDivergent && "bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-l-rose-500",
        isSelected && "bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/15 border-l-2 border-l-[var(--color-primary)]",
        isPending && "bg-amber-950/15 hover:bg-amber-950/25 border-l-2 border-l-amber-500",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = "TableRow";
