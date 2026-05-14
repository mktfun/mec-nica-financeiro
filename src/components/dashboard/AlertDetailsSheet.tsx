import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { FinAlert } from "@/lib/mock/types";

export function AlertDetailsSheet({
  alert,
  onOpenChange,
}: {
  alert: FinAlert | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={!!alert} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        {alert && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    alert.severity === "critical" ? "bg-destructive" : "bg-[color:var(--warning)]"
                  }`}
                />
                {alert.os}
              </SheetTitle>
              <SheetDescription>
                {alert.storeName} · {alert.timestamp}
              </SheetDescription>
            </SheetHeader>
            <div className="px-6 mt-4 space-y-4">
              <div className="rounded-md border bg-[var(--surface-1)] p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Resumo
                </div>
                <p className="mt-1 text-[13px] text-foreground">{alert.description}</p>
              </div>
              <div className="rounded-md border bg-[var(--surface-1)] p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Detalhes
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                  {alert.detail}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Abrir OS
                </button>
                <button className="flex-1 rounded-md border bg-[var(--surface-2)] px-3 py-2 text-[13px] font-medium text-foreground hover:bg-[var(--surface-3)] transition-colors">
                  Marcar resolvido
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
