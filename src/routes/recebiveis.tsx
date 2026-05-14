import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/recebiveis")({
  head: () => ({
    meta: [
      { title: "Recebíveis · Mecânica Popular" },
      {
        name: "description",
        content:
          "Valores a receber em aberto, vencimentos e atrasados consolidados das 10 lojas.",
      },
    ],
  }),
  component: RecebiveisPage,
});

type RStatus = "a-vencer" | "vence-hoje" | "atrasado" | "recebido";

interface Recebivel {
  os: string;
  loja: string;
  valor: number;
  vencimento: string;
  dias: number;
  status: RStatus;
}

const STORES = [
  "Dom Pedro",
  "Jabaquara",
  "Jorge Bereta",
  "Kennedy",
  "Piraporinha",
  "Planalto",
  "Ruge",
  "Santo André",
  "Rei do Módulo",
  "Rei do Óleo",
];

function fmtDate(offsetDays: number) {
  const d = new Date(2026, 4, 14 + offsetDays);
  return d.toLocaleDateString("pt-BR");
}

const RECS: Recebivel[] = Array.from({ length: 15 }, (_, i) => {
  const dias = [-7, -3, -1, 0, 0, 0, 1, 2, 4, 5, 7, 9, 12, 18, 25][i];
  const valor = 320 + Math.round((Math.sin(i + 1) * 0.5 + 0.5) * 2480);
  let status: RStatus;
  if (i < 2 && Math.random() < 0) status = "recebido";
  if (dias < 0) status = "atrasado";
  else if (dias === 0) status = "vence-hoje";
  else status = "a-vencer";
  // 2 já recebidos
  if (i === 13 || i === 14) status = "recebido";
  return {
    os: `OS #${4720 + i}`,
    loja: STORES[i % STORES.length],
    valor,
    vencimento: fmtDate(dias),
    dias,
    status,
  };
});

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "vence-hoje", label: "Vence Hoje" },
  { id: "semana", label: "Esta Semana" },
  { id: "atrasado", label: "Atrasados" },
  { id: "recebido", label: "Já Recebidos" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function RecebiveisPage() {
  const [filter, setFilter] = useState<FilterId>("todos");

  const totalAberto = RECS.filter((r) => r.status !== "recebido").reduce(
    (s, r) => s + r.valor,
    0,
  );
  const aVencer = RECS.filter((r) => r.status === "a-vencer").reduce(
    (s, r) => s + r.valor,
    0,
  );
  const venceHoje = RECS.filter((r) => r.status === "vence-hoje").reduce(
    (s, r) => s + r.valor,
    0,
  );
  const atrasados = RECS.filter((r) => r.status === "atrasado").reduce(
    (s, r) => s + r.valor,
    0,
  );

  const filtered = RECS.filter((r) => {
    if (filter === "todos") return true;
    if (filter === "semana") return r.dias >= 0 && r.dias <= 7;
    if (filter === "vence-hoje") return r.status === "vence-hoje";
    if (filter === "atrasado") return r.status === "atrasado";
    if (filter === "recebido") return r.status === "recebido";
    return true;
  });

  return (
    <AppShell crumbs={["Financeiro", "Recebíveis"]}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
              Recebíveis
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Valores a receber em aberto
            </p>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-[12px] font-semibold text-primary tabular">
            Total · {brl(totalAberto)}
          </span>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RecCard
            label="A vencer"
            value={brl(aVencer)}
            tone="primary"
            icon={Clock}
          />
          <RecCard
            label="Vence hoje"
            value={brl(venceHoje)}
            tone="warning"
            icon={Calendar}
          />
          <RecCard
            label="Atrasados"
            value={brl(atrasados)}
            tone="destructive"
            icon={AlertCircle}
          />
        </div>

        <div className="flex flex-wrap gap-1 border-b">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "relative px-4 py-2 text-[13px] font-medium transition-colors min-h-[44px]",
                filter === f.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              {filter === f.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-1)] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">OS #</th>
                <th className="px-4 py-3 text-left font-semibold">Loja</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
                <th className="px-4 py-3 text-left font-semibold">Vencimento</th>
                <th className="px-4 py-3 text-right font-semibold">Dias p/ Vencer</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.os}
                  className={cn(
                    "border-t transition-colors hover:bg-[var(--surface-3)]",
                    i % 2 === 1 && "bg-[var(--surface-1)]/30",
                  )}
                >
                  <td className="px-4 py-3 font-medium tabular text-foreground">{r.os}</td>
                  <td className="px-4 py-3 text-foreground">{r.loja}</td>
                  <td className="px-4 py-3 text-right tabular font-medium text-foreground">
                    {brl(r.valor)}
                  </td>
                  <td className="px-4 py-3 tabular text-muted-foreground">{r.vencimento}</td>
                  <td className={cn("px-4 py-3 text-right tabular font-semibold", daysClass(r.dias))}>
                    {r.dias < 0 ? `${r.dias}d` : `${r.dias}d`}
                  </td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <EmptyInline />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.map((r) => (
            <article
              key={r.os}
              className="rounded-xl border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold tabular">{r.os}</div>
                  <div className="text-[12px] text-muted-foreground">{r.loja}</div>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="flex items-end justify-between border-t pt-2">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Valor</div>
                  <div className="text-[16px] font-semibold tabular text-foreground">
                    {brl(r.valor)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Vence</div>
                  <div className="text-[13px] tabular text-foreground">{r.vencimento}</div>
                  <div className={cn("text-[11px] tabular font-semibold", daysClass(r.dias))}>
                    {r.dias}d
                  </div>
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <EmptyInline />}
        </div>
      </div>
    </AppShell>
  );
}

function daysClass(d: number) {
  if (d <= 0) return "text-destructive";
  if (d <= 6) return "text-[color:var(--warning)]";
  return "text-[color:var(--success)]";
}

function statusBadge(s: RStatus) {
  const map = {
    "a-vencer": ["bg-primary/15 text-primary", "A vencer"],
    "vence-hoje": ["bg-[color:var(--warning)]/15 text-[color:var(--warning)]", "Vence hoje"],
    atrasado: ["bg-destructive/15 text-destructive", "Atrasado"],
    recebido: ["bg-[color:var(--success)]/15 text-[color:var(--success)]", "Recebido"],
  } as const;
  const [cls, label] = map[s];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>
      {label}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
function RecCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning" | "destructive";
  icon: LucideIcon;
}) {
  const map = {
    primary: "text-primary bg-primary/12",
    warning: "text-[color:var(--warning)] bg-[color:var(--warning)]/12",
    destructive: "text-destructive bg-destructive/12",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <div className={cn("grid h-7 w-7 place-items-center rounded-md", map[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 text-[20px] font-semibold tabular text-foreground">{value}</div>
    </div>
  );
}

function EmptyInline() {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-3)] text-muted-foreground">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <p className="text-[13px] text-muted-foreground">Nenhum recebível neste filtro.</p>
    </div>
  );
}
