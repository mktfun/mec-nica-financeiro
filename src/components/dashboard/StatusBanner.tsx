import { CheckCircle2 } from "lucide-react";

export function StatusBanner({ onDetails }: { onDetails: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-panel border-[color:var(--success)]/20 bg-gradient-to-r from-[color:var(--success)]/8 to-transparent px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--success)]/15 text-[color:var(--success)] shadow-[0_0_12px_oklch(0.72_0.18_145_/_20%)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="text-[13px] text-foreground">
          Conciliação do dia aprovada automaticamente —{" "}
          <span className="font-bold tabular text-[color:var(--success)]">Resultado: R$ 0,42</span>
        </div>
      </div>
      <button
        onClick={onDetails}
        className="text-[12px] font-semibold text-[color:var(--success)] hover:text-foreground transition-colors bg-[color:var(--success)]/10 hover:bg-[color:var(--success)]/20 px-3 py-1.5 rounded-lg"
      >
        Ver detalhes →
      </button>
    </div>
  );
}
