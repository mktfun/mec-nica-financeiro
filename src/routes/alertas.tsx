import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Central de Alertas · Mecânica Popular" },
      {
        name: "description",
        content:
          "Alertas críticos, avisos e ocorrências resolvidas detectadas pelo motor de regras financeiras.",
      },
    ],
  }),
  component: AlertasPage,
});

type Sev = "critical" | "warning" | "resolved";

interface AItem {
  id: string;
  sev: Sev;
  store: string;
  os: string;
  title: string;
  detail: string;
  timestamp: string;
  resolvedBy?: string;
}

const INITIAL: AItem[] = [
  {
    id: "1",
    sev: "critical",
    store: "Jorge Bereta",
    os: "OS #4821",
    title: "Pagamento em 3 formas não fecha o total",
    detail:
      "Cliente pagou parte em débito, PIX e crédito 3x. Soma das formas: R$ 3.530,00. Total da OS: R$ 3.850,00. Diferença de R$ 320,00.",
    timestamp: "Hoje · 07:34",
  },
  {
    id: "2",
    sev: "critical",
    store: "Kennedy",
    os: "OS #4810",
    title: "OS finalizada sem pagamento registrado",
    detail:
      "OS marcada como concluída pelo mecânico responsável às 18:42, mas nenhuma forma de pagamento foi associada. Valor: R$ 890,00.",
    timestamp: "Hoje · 07:35",
  },
  {
    id: "3",
    sev: "warning",
    store: "Jabaquara",
    os: "OS #4798",
    title: "Juros de parcelamento incorreto",
    detail:
      "Parcelamento em 6x lançado com taxa de 2,5% (esperado 3,7% conforme contrato vigente). Diferença de R$ 22,00.",
    timestamp: "Hoje · 07:34",
  },
  {
    id: "4",
    sev: "warning",
    store: "Ruge",
    os: "—",
    title: "Entrada avulsa sem OS vinculada",
    detail: "Entrada de R$ 150,00 registrada às 09:12 sem nenhuma OS associada no sistema.",
    timestamp: "Hoje · 09:13",
  },
  {
    id: "5",
    sev: "warning",
    store: "Santo André",
    os: "OS #4756",
    title: "Possível duplicidade de lançamento",
    detail:
      "Dois lançamentos idênticos de R$ 220,00 registrados com 11 segundos de diferença para a mesma OS.",
    timestamp: "Hoje · 10:48",
  },
  {
    id: "6",
    sev: "warning",
    store: "Planalto",
    os: "—",
    title: "Dinheiro em caixa não informado",
    detail: "Responsável da loja ainda não inseriu o valor físico contado para o fechamento de hoje.",
    timestamp: "Hoje · 11:02",
  },
  {
    id: "7",
    sev: "resolved",
    store: "Dom Pedro",
    os: "OS #4788",
    title: "Duplicidade removida",
    detail: "Lançamento duplicado de R$ 180,00 foi removido após validação manual.",
    timestamp: "Ontem · 16:21",
    resolvedBy: "Ana",
  },
  {
    id: "8",
    sev: "resolved",
    store: "Rei do Módulo",
    os: "OS #4771",
    title: "Justificativa registrada",
    detail: "Diferença de R$ 80,00 justificada como cortesia ao cliente fidelidade.",
    timestamp: "Ontem · 14:05",
    resolvedBy: "Daniel",
  },
];

const TABS = [
  { id: "todos", label: "Todos" },
  { id: "critical", label: "Críticos" },
  { id: "warning", label: "Avisos" },
  { id: "resolved", label: "Resolvidos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AlertasPage() {
  const [items, setItems] = useState(INITIAL);
  const [tab, setTab] = useState<TabId>("todos");

  const counts = {
    todos: items.length,
    critical: items.filter((i) => i.sev === "critical").length,
    warning: items.filter((i) => i.sev === "warning").length,
    resolved: items.filter((i) => i.sev === "resolved").length,
  };
  const unread = counts.critical + counts.warning;

  const filtered = items.filter((i) => tab === "todos" || i.sev === tab);

  const resolve = (id: string) => {
    setItems(
      items.map((i) =>
        i.id === id ? { ...i, sev: "resolved" as Sev, resolvedBy: "Ana" } : i,
      ),
    );
    toast.success("Alerta resolvido");
  };
  const reopen = (id: string) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, sev: "warning" as Sev, resolvedBy: undefined } : i)),
    );
    toast("Alerta reaberto");
  };

  return (
    <AppShell crumbs={["Financeiro", "Alertas"]}>
      <div className="space-y-6 max-w-[1100px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-foreground">
                Central de Alertas
              </h1>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                Ocorrências detectadas pelo motor de regras nas últimas 24h
              </p>
            </div>
            <span className="rounded-full bg-destructive/20 px-2.5 py-1 text-[11px] font-semibold text-destructive">
              {unread} não resolvidos
            </span>
          </div>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-[oklch(1_0_0_/_5%)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-4 py-2 text-[13px] font-medium transition-colors min-h-[44px]",
                tab === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}{" "}
              <span className="ml-1 text-muted-foreground/70 tabular">
                ({counts[t.id as keyof typeof counts]})
              </span>
              {tab === t.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} onResolve={resolve} onReopen={reopen} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl glass-panel py-12 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Nenhum alerta neste filtro.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AlertCard({
  alert,
  onResolve,
  onReopen,
}: {
  alert: AItem;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const sevConfig = {
    critical: {
      icon: AlertCircle,
      cls: "text-destructive bg-destructive/15",
      label: "Crítico",
    },
    warning: {
      icon: AlertTriangle,
      cls: "text-[color:var(--warning)] bg-[color:var(--warning)]/15",
      label: "Aviso",
    },
    resolved: {
      icon: CheckCircle2,
      cls: "text-[color:var(--success)] bg-[color:var(--success)]/15",
      label: "Resolvido",
    },
  }[alert.sev];
  const Icon = sevConfig.icon;

  return (
    <article
      className={cn(
        "rounded-2xl glass-elevated p-4 transition-all",
        alert.sev === "resolved" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", sevConfig.cls)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                sevConfig.cls,
              )}
            >
              {sevConfig.label}
            </span>
            <span className="text-[13px] font-semibold text-foreground">{alert.store}</span>
            {alert.os !== "—" && (
              <span className="text-[12px] text-muted-foreground">{alert.os}</span>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground tabular">
              {alert.timestamp}
            </span>
          </div>
          <h3 className="text-[14px] font-medium text-foreground">{alert.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-snug">{alert.detail}</p>
          {alert.resolvedBy && (
            <p className="text-[11px] text-muted-foreground italic">
              Resolvido por {alert.resolvedBy}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {alert.sev === "resolved" ? (
              <button
                onClick={() => onReopen(alert.id)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--surface-3)] min-h-[36px]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir
              </button>
            ) : (
              <>
                <button
                  onClick={() => onResolve(alert.id)}
                  className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[36px]"
                >
                  Resolver
                </button>
                <button className="rounded-md border bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-[var(--surface-3)] transition-colors min-h-[36px]">
                  Ver OS
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
