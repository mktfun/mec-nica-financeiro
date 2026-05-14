import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patio")({
  head: () => ({
    meta: [
      { title: "Carros no Pátio · Mecânica Popular" },
      {
        name: "description",
        content:
          "Ordens de serviço em aberto no pátio das 10 lojas, com status de pagamento e dias parados.",
      },
    ],
  }),
  component: PatioPage,
});

type OsStatus = "aberto" | "parcial" | "finalizado";

interface OsRow {
  os: string;
  loja: string;
  placa: string;
  total: number;
  pago: number;
  forma: string;
  status: OsStatus;
  dias: number;
  cliente: string;
  servico: string;
  pagamentos: { data: string; valor: number; forma: string }[];
  obs: string;
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

function placa(i: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = letters[(i * 7) % 26];
  const b = letters[(i * 13) % 26];
  const c = letters[(i * 19) % 26];
  const d = ((i * 31) % 9) + 1;
  const e = ((i * 41) % 9);
  const f = letters[(i * 17) % 26];
  const g = ((i * 23) % 9) + 1;
  return `${a}${b}${c}${d}${e}${f}${g}`;
}

const ROWS: OsRow[] = Array.from({ length: 23 }, (_, i) => {
  const total = 280 + Math.round((Math.sin(i + 1) * 0.5 + 0.5) * 4520);
  const statusIdx = i % 3;
  const status: OsStatus = statusIdx === 0 ? "aberto" : statusIdx === 1 ? "parcial" : "finalizado";
  const pago = status === "aberto" ? 0 : status === "parcial" ? Math.round(total * 0.45) : total;
  const forma =
    status === "aberto"
      ? "—"
      : ["Crédito 3x", "Débito", "PIX", "Crédito à vista", "Crédito 6x"][i % 5];
  const loja = STORES[i % STORES.length];
  return {
    os: `OS #${4760 + i}`,
    loja,
    placa: placa(i),
    total,
    pago,
    forma,
    status,
    dias: ((i * 5) % 12) + 1,
    cliente: ["Marcelo Andrade", "Carla Souza", "Roberto Lima", "Patrícia Nogueira", "André Tavares"][i % 5],
    servico: [
      "Troca de embreagem completa",
      "Revisão de 60 mil km",
      "Diagnóstico e troca de módulo",
      "Alinhamento, balanceamento e cambagem",
      "Reparo do sistema de freios + pastilhas",
      "Troca de óleo e filtros",
    ][i % 6],
    pagamentos:
      status === "parcial"
        ? [{ data: "12/05 14:32", valor: Math.round(total * 0.45), forma: "PIX (sinal)" }]
        : status === "finalizado"
          ? [{ data: "13/05 11:08", valor: total, forma: "Crédito 3x" }]
          : [],
    obs:
      status === "aberto"
        ? "Cliente avisado por WhatsApp em 11/05. Aguardando retirada."
        : "Carro entregue. Aguardando assinatura do recibo final.",
  };
});

const totalAberto = ROWS.filter((r) => r.status !== "finalizado").reduce(
  (s, r) => s + (r.total - r.pago),
  0,
);
const maiorOs = ROWS.reduce((max, r) => (r.total > max.total ? r : max), ROWS[0]);
const semPgto = ROWS.filter((r) => r.status === "aberto").length;
const parciais = ROWS.filter((r) => r.status === "parcial").length;

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "aberto", label: "Em Aberto" },
  { id: "parcial", label: "Pagas Parcial" },
  { id: "finalizado", label: "Finalizadas Hoje" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function PatioPage() {
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [tab, setTab] = useState<FilterId>("todas");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ROWS.filter((r) => {
      if (tab !== "todas" && r.status !== tab) return false;
      if (storeFilter !== "all" && r.loja !== storeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.os.toLowerCase().includes(q) &&
          !r.placa.toLowerCase().includes(q) &&
          !r.cliente.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    }).sort((a, b) => b.total - a.total);
  }, [search, storeFilter, tab]);

  return (
    <AppShell crumbs={["Financeiro", "Carros no Pátio"]}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
                Carros no Pátio
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ordens de serviço abertas e pagamentos pendentes.
              </p>
            </div>
            <span className="rounded-full bg-[color:var(--warning)]/15 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--warning)]">
              23 OS em aberto
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-[var(--surface-1)] px-3 py-1.5 text-[12px] w-64">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar OS, placa, cliente…"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-9 w-[180px] bg-[var(--surface-1)] text-[13px]">
                <SelectValue placeholder="Filtrar loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {STORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Summary bar */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryStat label="Total em aberto" value={brl(totalAberto)} tone="warning" />
          <SummaryStat
            label="Maior OS"
            value={brl(maiorOs.total)}
            sub={maiorOs.loja}
            tone="neutral"
          />
          <SummaryStat label="Sem pagamento" value={`${semPgto} OS`} tone="destructive" />
          <SummaryStat label="Pagas parcialmente" value={`${parciais} OS`} tone="warning" />
        </section>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 border-b">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTab(f.id)}
              className={cn(
                "relative px-4 py-2 text-[13px] font-medium transition-colors",
                tab === f.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              {tab === f.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-1)]">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold">OS #</th>
                <th className="px-4 py-3 text-left font-semibold">Loja</th>
                <th className="px-4 py-3 text-left font-semibold">Placa</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <span className="inline-flex items-center gap-1">
                    Valor Total <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Valor Pago</th>
                <th className="px-4 py-3 text-left font-semibold">Forma Pgto</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Dias</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const open = expanded === r.os;
                return (
                  <RowGroup
                    key={r.os}
                    row={r}
                    striped={i % 2 === 1}
                    open={open}
                    onToggle={() => setExpanded(open ? null : r.os)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                    Nenhuma OS encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "warning" | "neutral" | "destructive";
}) {
  const dot = {
    warning: "bg-[color:var(--warning)]",
    neutral: "bg-primary",
    destructive: "bg-destructive",
  }[tone];
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1.5 text-[18px] font-semibold tabular text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function statusBadge(status: OsStatus) {
  if (status === "aberto")
    return (
      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        Em aberto
      </span>
    );
  if (status === "parcial")
    return (
      <span className="rounded-full bg-[color:var(--warning)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warning)]">
        Pago parcial
      </span>
    );
  return (
    <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--success)]">
      Finalizado
    </span>
  );
}

function RowGroup({
  row,
  striped,
  open,
  onToggle,
}: {
  row: OsRow;
  striped: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "border-t cursor-pointer transition-colors hover:bg-[var(--surface-3)]",
          striped && "bg-[var(--surface-1)]/30",
          open && "bg-[var(--surface-3)]",
        )}
      >
        <td className="px-4 py-3 font-medium text-foreground tabular">{row.os}</td>
        <td className="px-4 py-3 text-foreground">{row.loja}</td>
        <td className="px-4 py-3 tabular text-muted-foreground">{row.placa}</td>
        <td className="px-4 py-3 text-right tabular font-semibold text-foreground">
          {brl(row.total)}
        </td>
        <td
          className={cn(
            "px-4 py-3 text-right tabular",
            row.pago === 0
              ? "text-muted-foreground/60"
              : row.pago < row.total
                ? "text-[color:var(--warning)]"
                : "text-[color:var(--success)]",
          )}
        >
          {brl(row.pago)}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{row.forma}</td>
        <td className="px-4 py-3">{statusBadge(row.status)}</td>
        <td className="px-4 py-3 text-right tabular text-muted-foreground">{row.dias}d</td>
        <td className="px-4 py-3 text-muted-foreground">
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          />
        </td>
      </tr>
      <tr className={cn(!open && "hidden", "bg-[var(--surface-1)]")}>
        <td colSpan={9} className="px-0">
          <div
            className="grid transition-all duration-200"
            style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-5">
                <DetailBlock label="Cliente" value={row.cliente} />
                <DetailBlock label="Serviço" value={row.servico} />
                <DetailBlock
                  label="Pendente"
                  value={brl(row.total - row.pago)}
                  tone={row.total - row.pago > 0 ? "warning" : "success"}
                />
                <div className="md:col-span-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Histórico de pagamentos
                  </div>
                  {row.pagamentos.length === 0 ? (
                    <div className="rounded-md border bg-[var(--surface-2)] px-3 py-2 text-[12px] text-muted-foreground">
                      Nenhum pagamento registrado.
                    </div>
                  ) : (
                    <ul className="rounded-md border bg-[var(--surface-2)] divide-y divide-[color:var(--border)]">
                      {row.pagamentos.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between px-3 py-2 text-[12px]"
                        >
                          <span className="text-muted-foreground tabular">{p.data}</span>
                          <span className="text-foreground">{p.forma}</span>
                          <span className="tabular font-medium text-foreground">
                            {brl(p.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Observações
                  </div>
                  <div className="rounded-md border bg-[var(--surface-2)] px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
                    {row.obs}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function DetailBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "success";
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-[14px] font-medium",
          tone === "warning" && "text-[color:var(--warning)]",
          tone === "success" && "text-[color:var(--success)]",
          !tone && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
