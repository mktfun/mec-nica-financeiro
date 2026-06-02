import { motion, AnimatePresence } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { useStores } from "@/hooks/useStores";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Building2, ChevronRight, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "../ui/Card";

const iconMap = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  alert: AlertTriangle,
  bank: Building2,
};

export function RecentActivity() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { data: transactions = [], isLoading: loadingTx } = useTransactions(8);
  const { data: stores = [] } = useStores();

  if (loadingTx) {
    return <div className="mb-12 h-64 animate-pulse bg-[var(--bg-surface-hover)] rounded-[var(--radius-lg)]"></div>;
  }

  return (
    <Card className="mb-12 p-0 overflow-hidden bg-transparent border-0">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="font-display font-semibold text-xl flex items-center gap-2">
          <Clock size={20} className="text-[var(--color-primary)]" />
          Atividade Recente
        </h2>
        <Link to="/historico" className="text-[var(--color-primary)] font-medium text-sm hover:underline flex items-center bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--color-primary)]/20">
          Ver extrato completo <ChevronRight size={16} />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {transactions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)]">
            <Clock size={40} className="mb-3 opacity-20" />
            <p className="text-sm">Nenhuma atividade recente.</p>
          </Card>
        ) : transactions.map((tx, i) => {
          const iconKey = tx.type === 'in' ? 'in' : tx.icon_type === 'alert' ? 'alert' : 'out';
          const Icon = iconMap[iconKey];
          const isExpanded = expandedId === tx.id;
          const storeName = stores.find(s => s.id === tx.store_id)?.name || tx.store_id;

          return (
            <div key={tx.id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isExpanded 
                    ? 'bg-[var(--bg-surface-elevated)] border-[var(--color-primary)]/30 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' 
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--bg-surface-hover)]'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    iconKey === "alert" ? "bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]" :
                    iconKey === "in" ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" :
                    "bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)]">{tx.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-tertiary)]">
                      <span className="bg-[var(--bg-canvas)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                        {storeName || 'Geral'}
                      </span>
                      <span>•</span>
                      <span>{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 mt-4 sm:mt-0 ml-16 sm:ml-0">
                  <div className={`font-mono text-lg font-bold ${
                    tx.type === "in" ? "text-[var(--color-success)]" : 
                    iconKey === "alert" ? "text-[var(--color-accent-danger)]" : 
                    "text-[var(--text-primary)]"
                  }`}>
                    {tx.type === "in" ? "+" : "-"}<AnimatedNumber value={Number(tx.amount || 0)} format="currency" />
                  </div>
                  <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)]'}`}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </motion.div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden px-2"
                  >
                    <div className="bg-[var(--bg-surface-elevated)] rounded-xl p-5 text-sm space-y-3 border border-[var(--color-primary)]/20 shadow-inner">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {tx.store_id && (
                          <div>
                            <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Unidade</span>
                            <span className="font-medium">{storeName}</span>
                          </div>
                        )}
                        {tx.os_number && (
                          <div>
                            <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Nº OS</span>
                            <span className="font-medium text-[var(--color-primary)]">#{tx.os_number}</span>
                          </div>
                        )}
                        {tx.payment_method && (
                          <div>
                            <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Método</span>
                            <span className="font-medium uppercase">{tx.payment_method}</span>
                          </div>
                        )}
                        <div>
                          <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Classificação</span>
                          <Badge variant={tx.type === 'in' ? 'success' : iconKey === 'alert' ? 'danger' : 'neutral'} className="text-[10px] py-0">
                            {tx.type === 'in' ? 'Entrada Registrada' : 'Saída Registrada'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
