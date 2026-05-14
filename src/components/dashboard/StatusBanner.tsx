import { CheckCircle2 } from "lucide-react";

export function StatusBanner({ onDetails }: { onDetails: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--success)]/25 bg-[color:var(--success)]/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="text-[14px] text-foreground">
          Conciliação do dia aprovada automaticamente —{" "}
          <span className="font-semibold tabular">Resultado: R$ 0,42</span>
        </div>
      </div>
      <button
        onClick={onDetails}
        className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Ver detalhes →
      </button>
    </div>
  );
}
