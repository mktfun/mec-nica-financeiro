import { Link } from "@tanstack/react-router";
import type { Store } from "@/lib/mock/types";
import { brl } from "@/lib/format";
import { motion } from "framer-motion";

const statusStyles = {
  ok: {
    card: "border-[color:var(--success)]/30 bg-gradient-to-br from-[color:var(--success)]/10 to-transparent shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.2)]",
    badge: "bg-[color:var(--success)]/20 text-[color:var(--success)] border border-[color:var(--success)]/30",
    label: "✓ OK",
  },
  divergencia: {
    card: "border-[color:var(--warning)]/30 bg-gradient-to-br from-[color:var(--warning)]/10 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]",
    badge: "bg-[color:var(--warning)]/20 text-[color:var(--warning)] border border-[color:var(--warning)]/30 animate-pulse",
    label: "⚠ Divergência",
  },
  pendente: {
    card: "border-white/10 bg-card hover:bg-white/5",
    badge: "bg-white/10 text-muted-foreground border border-white/10",
    label: "● Pendente",
  },
} as const;

export function StoreCard({ store, index = 0 }: { store: Store; index?: number }) {
  const s = statusStyles[store.status];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group block rounded-xl border glass-panel p-4 transition-all duration-300 ${s.card}`}
    >
      <Link
        to="/lojas/$storeId"
        params={{ storeId: store.id }}
        className="block h-full outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">{store.name}</div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${s.badge}`}>
            {s.label}
          </span>
        </div>
        <div className="mt-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Entradas do dia
        </div>
        <div className="mt-0.5 text-[20px] font-bold text-foreground tabular text-glow group-hover:scale-105 origin-left transition-transform duration-300">
          {brl(store.dailyEntry)}
        </div>
        <div className="mt-2 text-[11.5px] text-muted-foreground/80 leading-snug">{store.note}</div>
      </Link>
    </motion.div>
  );
}
