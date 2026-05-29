import { motion } from "framer-motion";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { useDashboardSummary } from "@/hooks/useTransactions";

export function HeroBalance() {
  const { data: summaryData, isLoading } = useDashboardSummary();

  const totalIn = summaryData?.totalIn || 0;
  // In a real app we'd also get totalOut from the DB, for now let's just use totalIn as the net since we're focusing on receivables
  const totalOut = 0; 

  if (isLoading) {
    return <div className="py-8 md:py-12 flex justify-center"><div className="animate-pulse w-48 h-16 bg-[var(--bg-surface-hover)] rounded-md"></div></div>;
  }

  return (
    <div className="py-8 md:py-12 flex flex-col items-center text-center">
      <motion.span 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest text-xs"
      >
        Saldo Líquido do Dia
      </motion.span>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-[var(--text-primary)]"
      >
        <AnimatedNumber value={totalIn - totalOut} format="currency" />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex items-center gap-2 text-sm font-medium"
      >
        <span className="text-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10 px-2 py-0.5 rounded-md">
          +<AnimatedNumber value={totalIn} format="compact" /> in
        </span>
        <span className="text-[var(--text-tertiary)]">•</span>
        <span className="text-[var(--text-secondary)]">
          -<AnimatedNumber value={totalOut} format="compact" /> out
        </span>
      </motion.div>
    </div>
  );
}
