import { motion } from "framer-motion";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { useDashboardSummary } from "@/hooks/useTransactions";

export function HeroBalance({ monthStr }: { monthStr?: string }) {
  const { data: summaryData, isLoading } = useDashboardSummary(monthStr);

  const totalIn = summaryData?.totalIn || 0;
  const totalOut = summaryData?.totalOut || 0;
  const balance = summaryData?.balance || 0;

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
        Saldo Consolidado Global
      </motion.span>
      
      <p className="text-[10px] text-[var(--text-tertiary)] mb-2 mt-[-4px] tracking-wide">
        (Soma total de todas as contas)
      </p>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-[var(--text-primary)]"
      >
        <AnimatedNumber value={balance} format="currency" />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex items-center gap-2 text-sm font-medium"
      >
        <span className="text-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
          +<AnimatedNumber value={totalIn} format="compact" /> <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">no mês</span>
        </span>
        <span className="text-[var(--text-tertiary)]">•</span>
        <span className="text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
          -<AnimatedNumber value={totalOut} format="compact" /> <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">no mês</span>
        </span>
      </motion.div>
    </div>
  );
}
