import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { StoreStatusGrid } from "@/components/dashboard/StoreStatusGrid";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { CashInputCard } from "@/components/dashboard/CashInputCard";
import { ConciliationDetailsDialog } from "@/components/dashboard/ConciliationDetailsDialog";
import { useStores, useAlerts } from "@/lib/mock/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Geral · Mecânica Popular" },
      {
        name: "description",
        content:
          "Painel financeiro consolidado da rede Mecânica Popular — conciliação diária, alertas e fluxo de caixa por loja.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const stores = useStores();
  const alerts = useAlerts();
  const [conciliationOpen, setConciliationOpen] = useState(false);

  return (
    <AppShell crumbs={["Financeiro", "Painel Geral"]}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Painel Geral
          </h1>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">
            Atualizado hoje às 07:32 · Dados de 15/05/2026
          </p>
        </header>

        <StatusBanner onDetails={() => setConciliationOpen(true)} />

        <KpiRow />

        <StoreStatusGrid stores={stores} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AlertsList alerts={alerts} />
          </div>
          <div>
            <CashInputCard />
          </div>
        </div>
      </div>

      <ConciliationDetailsDialog
        open={conciliationOpen}
        onOpenChange={setConciliationOpen}
      />
    </AppShell>
  );
}
