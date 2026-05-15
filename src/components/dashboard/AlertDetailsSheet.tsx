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
      <SheetContent className="w-[420px] sm:max-w-[420px] glass-sidebar border-l-[oklch(1_0_0_/_5%)]">
        {alert && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    alert.severity === "critical"
                      ? "bg-destructive shadow-[0_0_8px_var(--destructive)]"
                      : "bg-[color:var(--warning)] shadow-[0_0_8px_var(--warning)]"
                  }`}
                />
                {alert.os}
              </SheetTitle>
              <SheetDescription>
                {alert.storeName} · {alert.timestamp}
              </SheetDescription>
            </SheetHeader>
            <div className="px-6 mt-4 space-y-4">
              <div className="rounded-xl glass-elevated p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Resumo
                </div>
                <p className="mt-1 text-[13px] text-foreground">{alert.description}</p>
              </div>
              <div className="rounded-xl glass-elevated p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Detalhes
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                  {alert.detail}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-3 py-2.5 text-[13px] font-bold text-primary-foreground hover:shadow-[0_0_16px_oklch(0.62_0.19_259_/_25%)] transition-all">
                  Abrir OS
                </button>
                <button className="flex-1 rounded-lg glass-elevated px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-[var(--surface-3)] transition-colors">
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
