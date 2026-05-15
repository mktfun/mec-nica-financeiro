import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function StatusBanner({ onDetails }: { onDetails: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--success)]/30 bg-gradient-to-r from-[color:var(--success)]/10 to-transparent px-5 py-4 glass-panel shadow-[0_0_20px_rgba(34,197,94,0.15)]"
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--success)]/20 text-[color:var(--success)] shadow-[0_0_10px_rgba(34,197,94,0.3)]">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="text-[14px] text-foreground">
          Conciliação do dia aprovada automaticamente —{" "}
          <span className="font-bold tabular text-glow text-[color:var(--success)]">Resultado: R$ 0,42</span>
        </div>
      </div>
      <button
        onClick={onDetails}
        className="text-[13px] font-semibold text-[color:var(--success)] hover:text-white transition-colors relative z-10 bg-[color:var(--success)]/10 hover:bg-[color:var(--success)]/30 px-3 py-1.5 rounded-md"
      >
        Ver detalhes →
      </button>
    </motion.div>
  );
}
