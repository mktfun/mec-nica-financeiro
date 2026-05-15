import { useState } from "react";
import type { FinAlert } from "@/lib/mock/types";
import { AlertDetailsSheet } from "./AlertDetailsSheet";
import { motion, AnimatePresence } from "framer-motion";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};

export function AlertsList({ alerts }: { alerts: FinAlert[] }) {
  const [selected, setSelected] = useState<FinAlert | null>(null);

  return (
    <section className="rounded-xl border border-white/10 glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive via-[color:var(--warning)] to-destructive opacity-80" />
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h2 className="text-[16px] font-bold text-foreground flex items-center gap-2">
            Alertas Ativos
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-[11px] font-bold">
              {alerts.length}
            </span>
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Ocorrências detectadas hoje que exigem atenção
          </p>
        </div>
      </div>
      <motion.ul variants={listVariants} initial="hidden" animate="show">
        <AnimatePresence>
          {alerts.map((a, i) => (
            <motion.li
              key={a.id}
              variants={itemVariants}
              exit={{ opacity: 0, x: -10 }}
              className={`relative border-b border-white/5 last:border-b-0 group`}
            >
              <button
                onClick={() => setSelected(a)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 transition-all duration-200 hover:bg-white/5 hover:pl-6"
              >
                <div className="relative mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      a.severity === "critical" ? "bg-destructive" : "bg-[color:var(--warning)]"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      a.severity === "critical"
                        ? "bg-destructive shadow-[0_0_10px_var(--destructive)]"
                        : "bg-[color:var(--warning)] shadow-[0_0_10px_var(--warning)]"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{a.storeName}</span>
                    <span className="text-[12px] font-medium text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded border border-white/5">{a.os}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-snug group-hover:text-foreground/80 transition-colors">
                    {a.description}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground tabular shrink-0 bg-black/20 px-2 py-1 rounded-full">
                  {a.timestamp}
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      <div className="bg-black/10 px-5 py-3 flex justify-center">
        <button className="text-[13px] font-bold text-primary hover:text-white transition-colors">
          Ver todos os {alerts.length} alertas →
        </button>
      </div>
      <AlertDetailsSheet alert={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
