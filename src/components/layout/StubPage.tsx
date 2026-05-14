import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

function makeStub(path: string, title: string, crumb: string) {
  return createFileRoute(path as "/lojas")({
    component: () => (
      <AppShell crumbs={["Financeiro", crumb]}>
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Em construção</p>
          <div className="mt-8 rounded-xl border bg-card p-12 text-center text-[13px] text-muted-foreground">
            Esta seção será detalhada nas próximas entregas.
          </div>
        </div>
      </AppShell>
    ),
  });
}

export { makeStub };
