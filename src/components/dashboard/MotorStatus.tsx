import { useDashboardSummary } from "@/hooks/useTransactions";
import { Card } from "../ui/Card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";

export function MotorStatus() {
  const { data: summaryData, isLoading } = useDashboardSummary();

  const isProcessing = summaryData?.motorStatus === "processing";
  const hasDivergences = (summaryData?.totalDivergences || 0) > 0;

  if (isLoading) {
    return <Card variant="glass" className="mb-8 p-5 md:p-6 h-24 animate-pulse bg-[var(--bg-surface-hover)]" />;
  }

  return (
    <Card variant="glass" className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isProcessing ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" :
          hasDivergences ? "bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]" :
          "bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]"
        }`}>
          {isProcessing ? (
            <Loader2 className="animate-spin" size={24} />
          ) : hasDivergences ? (
            <AlertCircle size={24} />
          ) : (
            <CheckCircle2 size={24} />
          )}
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg">
            Motor de ConciliaçÁo
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {isProcessing ? "Processando remessas bancárias..." : "ConciliaçÁo atualizada às 14:30"}
          </p>
        </div>
      </div>

      <div className="flex sm:flex-col gap-4 sm:gap-1 items-end border-t border-[var(--border-subtle)] sm:border-0 pt-4 sm:pt-0">
        <div className="text-sm text-[var(--text-secondary)]">Divergências encontradas</div>
        <div className={`font-display font-bold text-xl ${hasDivergences ? "text-[var(--color-accent-warning)]" : "text-[var(--color-accent-teal)]"}`}>
          {hasDivergences ? (
            <span>-<AnimatedNumber value={summaryData?.totalDivergences || 0} format="currency" /></span>
          ) : (
            "Nenhuma"
          )}
        </div>
      </div>
    </Card>
  );
}
