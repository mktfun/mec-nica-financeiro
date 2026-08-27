import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <tbody
      ref={ref}
      className={cn("divide-y divide-[var(--border-subtle)]/60 text-sm", className)}
      {...props}
    >
      {children}
    </tbody>
  );
});

TableBody.displayName = "TableBody";
