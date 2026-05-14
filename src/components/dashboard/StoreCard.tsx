import type { Store } from "@/lib/mock/types";
import { brl } from "@/lib/format";

const statusStyles = {
  ok: {
    badge: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
    label: "✓ OK",
  },
  divergencia: {
    badge: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    label: "⚠ Divergência",
  },
  pendente: {
    badge: "bg-[var(--surface-3)] text-muted-foreground",
    label: "● Pendente",
  },
} as const;

export function StoreCard({ store, onClick }: { store: Store; onClick: () => void }) {
  const s = statusStyles[store.status];
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border bg-card p-4 transition-all duration-150 hover:border-white/12 hover:bg-[var(--surface-3)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[14px] font-semibold text-foreground">{store.name}</div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
          {s.label}
        </span>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground uppercase tracking-wide">
        Entradas do dia
      </div>
      <div className="mt-0.5 text-[18px] font-semibold text-foreground tabular">
        {brl(store.dailyEntry)}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{store.note}</div>
    </button>
  );
}
