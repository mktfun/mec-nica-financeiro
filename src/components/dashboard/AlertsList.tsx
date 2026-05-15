import { useState } from "react";
import type { FinAlert } from "@/lib/mock/types";
import { AlertDetailsSheet } from "./AlertDetailsSheet";
import { cn } from "@/lib/utils";

export function AlertsList({ alerts }: { alerts: FinAlert[] }) {
  const [selected, setSelected] = useState<FinAlert | null>(null);

  return (
    <section className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[oklch(1_0_0_/_5%)]">
        <div>
          <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
            Alertas Ativos
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive/20 text-destructive text-[10px] font-bold px-1.5">
              {alerts.length}
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Ocorrências detectadas hoje
          </p>
        </div>
      </div>
      <ul>
        {alerts.map((a) => (
          <li
            key={a.id}
            className="border-b border-[oklch(1_0_0_/_3%)] last:border-b-0"
          >
            <button
              onClick={() => setSelected(a)}
              className={cn(
                "w-full text-left px-5 py-4 flex items-start gap-3 transition-all duration-150",
                "hover:bg-[var(--surface-2)] hover:pl-6",
                a.severity === "critical"
                  ? "border-l-[3px] border-l-destructive"
                  : "border-l-[3px] border-l-[color:var(--warning)]",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-bold text-foreground">{a.storeName}</span>
                  <span className="text-[11px] font-medium text-muted-foreground bg-[var(--surface-3)] px-1.5 py-0.5 rounded">{a.os}</span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground leading-snug">
                  {a.description}
                </p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular shrink-0">
                {a.timestamp}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-[oklch(1_0_0_/_5%)] px-5 py-3 text-center">
        <button className="text-[12px] font-semibold text-primary hover:text-foreground transition-colors">
          Ver todos os alertas →
        </button>
      </div>
      <AlertDetailsSheet alert={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
