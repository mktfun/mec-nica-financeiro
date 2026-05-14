import { useState } from "react";
import type { FinAlert } from "@/lib/mock/types";
import { AlertDetailsSheet } from "./AlertDetailsSheet";

export function AlertsList({ alerts }: { alerts: FinAlert[] }) {
  const [selected, setSelected] = useState<FinAlert | null>(null);

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Alertas ativos</h2>
          <p className="text-[12px] text-muted-foreground">
            {alerts.length} ocorrências detectadas hoje
          </p>
        </div>
      </div>
      <ul>
        {alerts.map((a, i) => (
          <li
            key={a.id}
            className={`${i > 0 ? "border-t" : ""}`}
          >
            <button
              onClick={() => setSelected(a)}
              className="w-full text-left px-5 py-4 flex items-start gap-3 transition-colors duration-150 hover:bg-[var(--surface-3)]"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  a.severity === "critical"
                    ? "bg-destructive shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_25%,transparent)]"
                    : "bg-[color:var(--warning)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--warning)_25%,transparent)]"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-semibold text-foreground">{a.storeName}</span>
                  <span className="text-[12px] text-muted-foreground">{a.os}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
                  {a.description}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground tabular shrink-0">
                {a.timestamp}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t px-5 py-3">
        <button className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
          Ver todos os alertas →
        </button>
      </div>
      <AlertDetailsSheet alert={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
