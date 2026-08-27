import React from "react";
import { Badge } from "@/components/ui/Badge";
import { formatBrlCurrency } from "./AmountCell";
import { cn } from "@/lib/utils";

export interface DiscrepancyBadgeProps {
  difference: number;
  label?: string;
  className?: string;
}

export function DiscrepancyBadge({
  difference,
  label,
  className,
}: DiscrepancyBadgeProps) {
  const isZero = Math.abs(difference) < 0.005;

  if (isZero) {
    return (
      <Badge variant="success" dot className={cn("gap-1 text-[11px]", className)}>
        <span>{label ?? "Conciliado (R$ 0,00)"}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="danger" dot className={cn("gap-1 text-[11px] font-mono", className)}>
      <span>{label ? `${label}: ` : "Divergência: "}</span>
      <span className="tabular-nums font-bold">{formatBrlCurrency(difference)}</span>
    </Badge>
  );
}
