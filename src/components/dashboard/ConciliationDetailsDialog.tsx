import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { brl } from "@/lib/format";

export function ConciliationDetailsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const rows = [
    { label: "Entradas (PDV + PIX + Cartões)", value: 84320.42 },
    { label: "Recebíveis confirmados", value: 12480 },
    { label: "Saídas / Contas a pagar", value: -79840 },
    { label: "Sangrias e suprimentos", value: -16960 },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-panel border-[oklch(1_0_0_/_5%)]">
        <DialogHeader>
          <DialogTitle>Conciliação · 13/05/2026</DialogTitle>
          <DialogDescription>
            Resumo automático aprovado pelo motor de regras.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 divide-y divide-[oklch(1_0_0_/_5%)] rounded-xl glass-elevated border-[oklch(1_0_0_/_5%)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className={`tabular font-medium ${
                  r.value < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {brl(r.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--success)]/8">
            <span className="text-[13px] font-semibold text-foreground">Resultado do dia</span>
            <span className="tabular font-semibold text-[color:var(--success)]">{brl(total)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
