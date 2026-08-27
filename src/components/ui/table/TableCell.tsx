import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  density?: "compact" | "standard" | "comfortable";
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({
  className,
  align = "left",
  isNumeric = false,
  density = "standard",
  children,
  ...props
}, ref) => {
  const densityStyles = {
    compact: "px-3 py-2 text-xs",
    standard: "px-4 py-3 text-sm",
    comfortable: "px-5 py-4 text-sm",
  };

  return (
    <td
      ref={ref}
      className={cn(
        "text-[var(--text-primary)] transition-colors align-middle",
        densityStyles[density],
        (isNumeric || align === "right") && "font-mono tabular-nums text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
});

TableCell.displayName = "TableCell";
