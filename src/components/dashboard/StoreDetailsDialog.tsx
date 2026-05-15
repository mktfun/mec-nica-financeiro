import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Store } from "@/lib/mock/types";
import { brl } from "@/lib/format";

export function StoreDetailsDialog({
  store,
  onOpenChange,
}: {
  store: Store | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={!!store} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-panel border-[oklch(1_0_0_/_5%)]">
        {store && (
          <>
            <DialogHeader>
              <DialogTitle>{store.name}</DialogTitle>
              <DialogDescription>Resumo da unidade — 13/05/2026</DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <div className="rounded-xl glass-elevated p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Entradas do dia
                </div>
                <div className="mt-1 text-[22px] font-semibold tabular">
                  {brl(store.dailyEntry)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl glass-elevated p-3">
                  <div className="text-[11px] uppercase text-muted-foreground">OS abertas</div>
                  <div className="text-[16px] font-semibold tabular">3</div>
                </div>
                <div className="rounded-xl glass-elevated p-3">
                  <div className="text-[11px] uppercase text-muted-foreground">Recebíveis</div>
                  <div className="text-[16px] font-semibold tabular">{brl(2480)}</div>
                </div>
              </div>
              <div className="rounded-xl glass-elevated p-3 text-[12px] text-muted-foreground">
                {store.note}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
