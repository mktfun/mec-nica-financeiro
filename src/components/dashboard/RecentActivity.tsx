import { motion, AnimatePresence } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { useStores } from "@/hooks/useStores";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Building2, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const iconMap = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  alert: AlertTriangle,
  bank: Building2,
};

export function RecentActivity() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { data: transactions = [], isLoading: loadingTx } = useTransactions(5);
  const { data: stores = [] } = useStores();

  if (loadingTx) {
    return <div className="mb-12 h-64 animate-pulse bg-[var(--bg-surface-hover)] rounded-[var(--radius-lg)]"></div>;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-xl">Atividade Recente</h2>
        <Link to="/historico" className="text-[var(--color-primary)] font-medium text-sm hover:underline flex items-center">
          Ver todas <ChevronRight size={16} />
        </Link>
      </div>

      <div className="flex flex-col">
        {transactions.length === 0 ? (
          <p className="text-[var(--text-tertiary)] text-sm py-4">Nenhuma atividade recente.</p>
        ) : transactions.map((tx, i) => {
          const iconKey = tx.type === 'in' ? 'in' : tx.icon_type === 'alert' ? 'alert' : 'out';
          const Icon = iconMap[iconKey];
          const isExpanded = expandedId === tx.id;
          const storeName = stores.find(s => s.id === tx.store_id)?.name || tx.store_id;

          return (
            <div key={tx.id}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between py-4 border-b border-[var(--border-subtle)] last:border-0 group cursor-pointer hover:bg-[var(--bg-surface-hover)] px-3 -mx-3 rounded-[var(--radius-md)] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    iconKey === "alert" ? "bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]" :
                    iconKey === "in" ? "bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] group-hover:bg-[var(--color-accent-teal)]/20" :
                    "bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)]">{tx.description}</h4>
                    <p className="text-sm text-[var(--text-tertiary)]">{tx.category} • {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`font-semibold ${tx.type === "in" ? "text-[var(--color-accent-teal)]" : iconKey === "alert" ? "text-[var(--color-accent-danger)]" : "text-[var(--text-primary)]"}`}>
                    {tx.type === "in" ? "+" : "-"}<AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={14} className="text-[var(--text-tertiary)]" />}
                </div>
              </motion.div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[var(--bg-surface-elevated)] rounded-[var(--radius-md)] p-4 mb-2 ml-16 text-sm space-y-2 border border-[var(--border-subtle)]">
                      {tx.store_id && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Loja</span>
                          <span className="font-medium">{storeName}</span>
                        </div>
                      )}
                      {tx.os_number && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">OS</span>
                          <span className="font-medium">{tx.os_number}</span>
                        </div>
                      )}
                      {tx.payment_method && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Forma de Pagamento</span>
                          <span className="font-medium uppercase">{tx.payment_method}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Tipo</span>
                        <Badge variant={tx.type === 'in' ? 'success' : iconKey === 'alert' ? 'danger' : 'neutral'}>
                          {tx.type === 'in' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
