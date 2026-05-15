import { Link } from "@tanstack/react-router";
import type { Store } from "@/lib/mock/types";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusConfig = {
  ok: {
    bar: "bg-[color:var(--success)]",
    badge: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/20",
    label: "✓ OK",
  },
  divergencia: {
    bar: "bg-[color:var(--warning)]",
    badge: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/20",
    label: "⚠ Divergência",
  },
  pendente: {
    bar: "bg-muted-foreground/30",
    badge: "bg-[var(--surface-3)] text-muted-foreground border-[oklch(1_0_0_/_6%)]",
    label: "● Pendente",
  },
} as const;

export function StoreCard({ store }: { store: Store }) {
  const cfg = statusConfig[store.status];
  return (
    <Link
      to="/lojas/$storeId"
      params={{ storeId: store.id }}
      className="group block rounded-2xl glass-elevated overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_oklch(0_0_0_/_30%)]"
    >
      {/* Status bar */}
      <div className={cn("h-[3px]", cfg.bar)} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{store.name}</div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", cfg.badge)}>
            {cfg.label}
          </span>
        </div>
        <div className="mt-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Entradas do dia
        </div>
        <div className="mt-0.5 text-[22px] font-extrabold text-foreground tabular tracking-tighter">
          {brl(store.dailyEntry)}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground leading-snug">{store.note}</div>
      </div>
    </Link>
  );
}
