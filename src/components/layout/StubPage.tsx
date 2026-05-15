import { AppShell } from "./AppShell";

export function StubPage({ title, crumb }: { title: string; crumb: string }) {
  return (
    <AppShell crumbs={["Financeiro", crumb]}>
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-[12px] font-medium text-muted-foreground">Em construção</p>
        <div className="mt-8 rounded-2xl glass-panel p-16 text-center">
          <div className="text-[40px] mb-3">🚧</div>
          <div className="text-[13px] text-muted-foreground">
            Esta seção será detalhada nas próximas entregas.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
