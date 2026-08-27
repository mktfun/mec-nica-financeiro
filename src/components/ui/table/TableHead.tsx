import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(({
  className,
  align = "left",
  isNumeric = false,
  children,
  ...props
}, ref) => {
  return (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--text-tertiary)] select-none whitespace-nowrap",
        (isNumeric || align === "right") && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
});

TableHead.displayName = "TableHead";
