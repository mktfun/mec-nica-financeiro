import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp, Wallet, Receipt, FileText, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStores, useAlerts } from "@/lib/mock/hooks";
import { CountUp } from "@/components/ui/count-up";

export const Route = createFileRoute("/lojas/$storeId")({
  head: ({ params }) => ({
    meta: [
      { title: `${prettyName(params.storeId)} · Mecânica Popular` },
      {
        name: "description",
        content: `Resumo financeiro da unidade ${prettyName(params.storeId)}: entradas, contas, OS abertas e alertas.`,
      },
    ],
  }),
  component: StoreDetailPage,
});

function prettyName(slug: string) {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function StoreDetailPage() {
  const { storeId } = Route.useParams();
  const stores = useStores();
  const alerts = useAlerts();
  const store = stores.find((s) => s.id === storeId);

  if (stores.length > 0 && !store) {
    throw notFound();
  }

  const storeName = store?.name ?? prettyName(storeId);
  const entradas = store?.dailyEntry ?? 0;
  const dinheiro = Math.round(entradas * 0.18);
  const contas = Math.round(entradas * 0.92);
  const resultado = entradas - contas;

  const last7: { date: string; result: number; status: "ok" | "div" }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 4, 13 - i);
    const isDiv = i === 4 && store?.status === "divergencia";
    last7.push({
      date: d.toLocaleDateString("pt-BR"),
      result: isDiv ? -120 : Math.round(Math.sin(i + 2) * 80 + 40),
      status: isDiv ? "div" : "ok",
    });
  }

  const openOs = Array.from({ length: 5 }, (_, i) => ({
    os: `OS #${4760 + i + storeId.length}`,
    placa: `${"ABCDEF"[i]}${"GHIJKL"[i]}${"MNOPQR"[i]}-${i}${i + 1}${"STUVWX"[i]}${i + 2}`,
    valor: 480 + i * 320,
    dias: i + 1,
  }));

  const storeAlerts = alerts.filter((a) => a.storeId === storeId);

  const statusBadge = () => {
    const s = store?.status ?? "ok";
    const map = {
      ok: ["bg-[color:var(--success)]/15 text-[color:var(--success)]", "✓ OK"],
      divergencia: ["bg-[color:var(--warning)]/15 text-[color:var(--warning)]", "⚠ Divergência"],
      pendente: ["bg-[var(--surface-3)] text-muted-foreground", "● Pendente"],
    } as const;
    const [cls, label] = map[s];
    return (
      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", cls)}>
        {label}
      </span>
    );
  };

  return (
    <AppShell crumbs={["Financeiro", "Lojas", storeName]}>
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
              {storeName}
            </h1>
            {statusBadge()}
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Resumo da unidade · 13/05/2026
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiBox label="Entradas" value={entradas} tone="success" icon={TrendingUp} />
          <KpiBox label="Dinheiro Físico" value={dinheiro} tone="primary" icon={Wallet} />
          <KpiBox label="Contas" value={contas} tone="destructive" icon={Receipt} />
          <KpiBox label="Resultado" value={resultado} tone="neutral" icon={FileText} />
        </div>

        <section className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h2 className="text-[16px] font-semibold text-foreground">Últimos 7 dias</h2>
            <p className="text-[12px] text-muted-foreground">
              Resultado diário desta unidade
            </p>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--surface-1)] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Data</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Resultado</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {last7.map((d, i) => (
                  <tr
                    key={d.date}
                    className={cn(
                      "border-t",
                      i % 2 === 1 && "bg-[var(--surface-1)]/30",
                    )}
                  >
                    <td className="px-5 py-2.5 tabular text-foreground">{d.date}</td>
                    <td
                      className={cn(
                        "px-5 py-2.5 text-right tabular font-medium",
                        d.result < 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {brl(d.result)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          d.status === "ok"
                            ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                            : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
                        )}
                      >
                        {d.status === "ok" ? "Aprovado" : "Divergência"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">OS em aberto</h2>
                <p className="text-[12px] text-muted-foreground">
                  Carros aguardando pagamento ou retirada
                </p>
              </div>
            </div>
            <ul className="divide-y divide-[color:var(--border)]">
              {openOs.map((o) => (
                <li
                  key={o.os}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--surface-3)]"
                >
                  <div>
                    <div className="text-[13px] font-medium tabular text-foreground">{o.os}</div>
                    <div className="text-[11px] tabular text-muted-foreground">{o.placa}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold tabular text-foreground">
                      {brl(o.valor)}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular">
                      há {o.dias}d
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t px-5 py-3">
              <Link
                to="/patio"
                className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ver todas as OS →
              </Link>
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="px-5 py-4 border-b">
              <h2 className="text-[16px] font-semibold text-foreground">Alertas ativos</h2>
              <p className="text-[12px] text-muted-foreground">
                Ocorrências detectadas para esta loja
              </p>
            </div>
            {storeAlerts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Nenhum alerta ativo para esta unidade.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--border)]">
                {storeAlerts.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          a.severity === "critical"
                            ? "bg-destructive"
                            : "bg-[color:var(--warning)]",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[12px] font-semibold tabular text-foreground">
                            {a.os}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular ml-auto">
                            {a.timestamp}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-snug">
                          {a.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

import type { LucideIcon } from "lucide-react";
function KpiBox({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "neutral" | "primary";
  icon: LucideIcon;
}) {
  const map = {
    success: "text-[color:var(--success)] bg-[color:var(--success)]/12",
    destructive: "text-destructive bg-destructive/12",
    primary: "text-primary bg-primary/12",
    neutral: "text-muted-foreground bg-[var(--surface-3)]",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <div className={cn("grid h-7 w-7 place-items-center rounded-md", map[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <CountUp
        value={value}
        format={brl}
        className="mt-2 block text-[20px] font-semibold tabular text-foreground"
      />
    </div>
  );
}
