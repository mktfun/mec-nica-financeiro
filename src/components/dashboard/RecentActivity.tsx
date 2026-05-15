import { motion } from "framer-motion";
import { mockTransactions } from "@/mock/data";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Building2, ChevronRight } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";

const iconMap = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  alert: AlertTriangle,
  bank: Building2,
};

export function RecentActivity() {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-xl">Atividade Recente</h2>
        <button className="text-[var(--color-primary)] font-medium text-sm hover:underline flex items-center">
          Ver todas <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex flex-col">
        {mockTransactions.map((tx, i) => {
          const Icon = iconMap[tx.type === "in" ? "in" : tx.iconType === "alert" ? "alert" : "out"];
          
          return (
            <motion.div 
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between py-4 border-b border-[var(--border-subtle)] last:border-0 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  tx.iconType === "alert" ? "bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]" :
                  tx.type === "in" ? "bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] group-hover:bg-[var(--color-accent-teal)]/20" :
                  "bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface-elevated)]"
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--text-primary)]">{tx.title}</h4>
                  <p className="text-sm text-[var(--text-tertiary)]">{tx.subtitle} • {tx.time}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${tx.type === "in" ? "text-[var(--color-accent-teal)]" : tx.iconType === "alert" ? "text-[var(--color-accent-danger)]" : "text-[var(--text-primary)]"}`}>
                  {tx.type === "in" ? "+" : "-"}<AnimatedNumber value={tx.amount} format="currency" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
