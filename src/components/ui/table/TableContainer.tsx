import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "compact" | "standard" | "comfortable";
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm relative",
        className
      )}
      {...props}
    >
      <table className="w-full text-left border-collapse border-spacing-0">
        {children}
      </table>
    </div>
  );
});

TableContainer.displayName = "TableContainer";
