import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conciliacao")({
  head: () => ({
    meta: [
      { title: "Conciliação Diária · Mecânica Popular" },
      {
        name: "description",
        content:
          "Resultado da conciliação diária por loja, erros detectados pelo motor de regras e histórico dos últimos 30 dias.",
      },
    ],
  }),
  component: ConciliacaoPage,
});

type SummaryRow = { label: string; value: number; emphasis?: boolean };

const SUMMARIES: Record<string, SummaryRow[]> = {
  "2026-05-13": [
    { label: "Entradas Cartão Crédito", value: 38420 },
    { label: "Entradas Cartão Débito", value: 22180 },
    { label: "Dinheiro Físico (informado)", value: 14920 },
    { label: "Total Entradas", value: 75520, emphasis: true },
    { label: "Total Contas a Pagar", value: 71040 },
    { label: "Caixa Anterior", value: 8200 },
    { label: "Caixa Atual", value: 12680 },
    { label: "Recebíveis em Aberto", value: 18430 },
    { label: "Soma Pátio (OS abertas)", value: 31200 },
    { label: "Juros Parcelamentos", value: 1240 },
  ],
  "2026-05-12": [
    { label: "Entradas Cartão Crédito", value: 35110 },
    { label: "Entradas Cartão Débito", value: 19780 },
    { label: "Dinheiro Físico (informado)", value: 13280 },
    { label: "Total Entradas", value: 68170, emphasis: true },
    { label: "Total Contas a Pagar", value: 64210 },
    { label: "Caixa Anterior", value: 7900 },
    { label: "Caixa Atual", value: 11860 },
    { label: "Recebíveis em Aberto", value: 17120 },
    { label: "Soma Pátio (OS abertas)", value: 28640 },
    { label: "Juros Parcelamentos", value: 1080 },
  ],
};

const RESULTS: Record<string, { value: number; status: "approved" | "divergence" }> = {
  "2026-05-13": { value: 0.42, status: "approved" },
  "2026-05-12": { value: -180.5, status: "divergence" },
};

interface StoreRow {
  loja: string;
  entradas: number;
  dinheiro: number;
  contas: number;
  resultado: number;
  status: "ok" | "div";
}

const STORE_ROWS: StoreRow[] = [
  { loja: "Dom Pedro", entradas: 9240, dinheiro: 1820, contas: 8800, resultado: 0, status: "ok" },
  { loja: "Jabaquara", entradas: 7180, dinheiro: 1240, contas: 6900, resultado: -22, status: "div" },
  { loja: "Jorge Bereta", entradas: 6450, dinheiro: 980, contas: 6100, resultado: -320, status: "div" },
  { loja: "Kennedy", entradas: 8920, dinheiro: 1640, contas: 8500, resultado: 0, status: "ok" },
  { loja: "Piraporinha", entradas: 7630, dinheiro: 1320, contas: 7200, resultado: 0, status: "ok" },
  { loja: "Planalto", entradas: 0, dinheiro: 0, contas: 4200, resultado: 0, status: "ok" },
  { loja: "Ruge", entradas: 11200, dinheiro: 2180, contas: 10800, resultado: 0, status: "ok" },
  { loja: "Santo André", entradas: 8470, dinheiro: 1480, contas: 8100, resultado: 0, status: "ok" },
  { loja: "Rei do Módulo", entradas: 9880, dinheiro: 1720, contas: 9400, resultado: 0, status: "ok" },
  { loja: "Rei do Óleo", entradas: 15350, dinheiro: 2540, contas: 14600, resultado: 0, status: "ok" },
];

type ErrorType =
  | "Pagamento Fragmentado"
  | "Sem OS Vinculada"
  | "OS Sem Pagamento"
  | "Juros Incorreto"
  | "Duplicidade";

interface DetectedError {
  id: string;
  type: ErrorType;
  store: string;
  os: string;
  description: string;
  amount: number;
}

const INITIAL_ERRORS: DetectedError[] = [
  {
    id: "e1",
    type: "Pagamento Fragmentado",
    store: "Jorge Bereta",
    os: "OS #4821",
    description: "Pagamento em 3 formas não fecha o total da OS.",
    amount: 320,
  },
  {
    id: "e2",
    type: "Juros Incorreto",
    store: "Jabaquara",
    os: "OS #4798",
    description: "Taxa de parcelamento divergente do contrato. Lançado R$ 45 / Esperado R$ 67.",
    amount: 22,
  },
  {
    id: "e3",
    type: "OS Sem Pagamento",
    store: "Kennedy",
    os: "OS #4810",
    description: "OS finalizada sem nenhuma forma de pagamento associada.",
    amount: 890,
  },
  {
    id: "e4",
    type: "Sem OS Vinculada",
    store: "Ruge",
    os: "—",
    description: "Entrada avulsa registrada sem OS vinculada no sistema.",
    amount: 150,
  },
  {
    id: "e5",
    type: "Duplicidade",
    store: "Santo André",
    os: "OS #4756",
    description: "Dois lançamentos idênticos de R$ 220,00 no mesmo minuto.",
    amount: 220,
  },
];

const errorTypeStyles: Record<ErrorType, string> = {
  "Pagamento Fragmentado": "bg-destructive/15 text-destructive",
  "Sem OS Vinculada": "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  "OS Sem Pagamento": "bg-destructive/15 text-destructive",
  "Juros Incorreto": "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  Duplicidade: "bg-primary/15 text-primary",
};

interface HistoryRow {
  date: string;
  result: number;
  status: "Aprovado" | "Com Divergência";
  errors: number;
  closedAt: string;
}

function buildHistory(): HistoryRow[] {
  const out: HistoryRow[] = [];
  const divDays = new Set([4, 11, 19, 26]);
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 4, 13 - i);
    const isDiv = divDays.has(i);
    out.push({
      date: format(d, "dd/MM/yyyy"),
      result: isDiv ? -((i + 1) * 87.3) : Math.sin(i) * 12 + 4,
      status: isDiv ? "Com Divergência" : "Aprovado",
      errors: isDiv ? Math.ceil(Math.abs(Math.sin(i + 1)) * 5) + 1 : 0,
      closedAt: `0${5 + (i % 3)}:${String(20 + (i * 7) % 40).padStart(2, "0")}`,
    });
  }
  return out;
}

function ConciliacaoPage() {
  const [date, setDate] = useState<Date>(new Date(2026, 4, 13));
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [justified, setJustified] = useState<Record<string, string>>({});
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const dateKey = format(date, "yyyy-MM-dd");
  const summary = SUMMARIES[dateKey] ?? SUMMARIES["2026-05-13"];
  const result = RESULTS[dateKey] ?? RESULTS["2026-05-13"];
  const history = buildHistory();

  const sortedErrors = [...errors].sort((a, b) => {
    const aj = justified[a.id] ? 1 : 0;
    const bj = justified[b.id] ? 1 : 0;
    return aj - bj;
  });

  const confirmJustify = () => {
    if (!justifyingId) return;
    setJustified({ ...justified, [justifyingId]: reason || "Sem motivo informado" });
    setJustifyingId(null);
    setReason("");
    toast.success("Erro justificado");
  };

  return (
    <AppShell crumbs={["Financeiro", "Conciliação Diária"]}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
              Conciliação Diária
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Resultado consolidado e detecção automática de divergências.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 rounded-md border bg-[var(--surface-1)] text-[13px] font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  {format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              className="h-9 rounded-md border bg-[var(--surface-1)] text-[13px]"
              onClick={() =>
                toast("Exportando planilha…", { description: "Aguarde alguns segundos." })
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 opacity-70" />
              Exportar Excel
            </Button>
          </div>
        </header>

        {/* Result summary card */}
        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">
                Resumo de {format(date, "dd/MM/yyyy")}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Calculado pelo motor de regras às {result.status === "approved" ? "07:32" : "08:14"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Resultado
                </div>
                <div
                  className={cn(
                    "text-[22px] font-semibold tabular tracking-tight",
                    result.status === "approved"
                      ? "text-[color:var(--success)]"
                      : "text-destructive",
                  )}
                >
                  {brl(result.value)}
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  result.status === "approved"
                    ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {result.status === "approved" ? "APROVADO" : "DIVERGÊNCIA"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--border)]">
            <div className="p-2">
              <SummaryGrid rows={summary.slice(0, 5)} />
            </div>
            <div className="p-2">
              <SummaryGrid rows={summary.slice(5)} />
            </div>
          </div>
        </section>

        <Tabs defaultValue="por-loja">
          <TabsList className="bg-[var(--surface-1)] border">
            <TabsTrigger value="por-loja">Por Loja</TabsTrigger>
            <TabsTrigger value="erros">
              Erros Detectados
              <span className="ml-2 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                {errors.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="por-loja" className="mt-4">
            <StoreTable rows={STORE_ROWS} />
          </TabsContent>

          <TabsContent value="erros" className="mt-4 space-y-3">
            {sortedErrors.map((e) => {
              const isJ = !!justified[e.id];
              return (
                <article
                  key={e.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-opacity",
                    isJ && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            errorTypeStyles[e.type],
                          )}
                        >
                          {e.type}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">
                          {e.store}
                        </span>
                        <span className="text-[12px] text-muted-foreground">{e.os}</span>
                        {isJ && (
                          <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Justificado
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-snug">
                        {e.description}
                      </p>
                      {isJ && (
                        <p className="text-[12px] text-muted-foreground italic">
                          Motivo: {justified[e.id]}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Valor
                        </div>
                        <div className="text-[15px] font-semibold tabular text-foreground">
                          {brl(e.amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isJ && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                      <button className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors">
                        Abrir OS no Sistema →
                      </button>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        onClick={() => setJustifyingId(e.id)}
                        className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Justificar / Ignorar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <HistoryTable rows={history} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!justifyingId} onOpenChange={(o) => !o && setJustifyingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Justificar erro</DialogTitle>
            <DialogDescription>
              Esse erro deixa de bloquear a conciliação. Registre o motivo para auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">
              Motivo da justificativa
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex.: cliente pagou diferença em dinheiro, lançamento manual já efetuado…"
              className="w-full rounded-md border bg-[var(--surface-1)] px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-9 text-[13px]"
              onClick={() => setJustifyingId(null)}
            >
              Cancelar
            </Button>
            <Button
              className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]"
              onClick={confirmJustify}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SummaryGrid({ rows }: { rows: SummaryRow[] }) {
  return (
    <ul>
      {rows.map((r) => (
        <li
          key={r.label}
          className="flex items-center justify-between px-4 py-2.5 text-[13px]"
        >
          <span className={cn("text-muted-foreground", r.emphasis && "text-foreground font-medium")}>
            {r.label}
          </span>
          <span
            className={cn(
              "tabular text-foreground",
              r.emphasis && "font-semibold",
            )}
          >
            {brl(r.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SortHeader({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
      {children}
      <ArrowUpDown className="h-3 w-3 opacity-60" />
    </button>
  );
}

function StoreTable({ rows }: { rows: StoreRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--surface-1)]">
          <tr>
            <th className="px-4 py-3 text-left">
              <SortHeader>Loja</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Entradas</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Dinheiro</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Contas</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Resultado</SortHeader>
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader>Status</SortHeader>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.loja}
              className={cn(
                "border-t transition-colors hover:bg-[var(--surface-3)]",
                i % 2 === 1 && "bg-[var(--surface-1)]/30",
              )}
            >
              <td className="px-4 py-3 font-medium text-foreground">{r.loja}</td>
              <td className="px-4 py-3 text-right tabular text-foreground">{brl(r.entradas)}</td>
              <td className="px-4 py-3 text-right tabular text-foreground">{brl(r.dinheiro)}</td>
              <td className="px-4 py-3 text-right tabular text-foreground">{brl(r.contas)}</td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular font-medium",
                  r.resultado < 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {brl(r.resultado)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    r.status === "ok"
                      ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                      : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
                  )}
                >
                  {r.status === "ok" ? "OK" : "Divergência"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--surface-1)]">
          <tr>
            <th className="px-4 py-3 text-left">
              <SortHeader>Data</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Resultado (R$)</SortHeader>
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader>Status</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Erros</SortHeader>
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader>Fechamento</SortHeader>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.date}
              className={cn(
                "border-t transition-colors hover:bg-[var(--surface-3)]",
                i % 2 === 1 && "bg-[var(--surface-1)]/30",
              )}
            >
              <td className="px-4 py-3 tabular text-foreground">{r.date}</td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular font-medium",
                  r.result < 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {brl(r.result)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    r.status === "Aprovado"
                      ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                      : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
                  )}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular text-muted-foreground">{r.errors}</td>
              <td className="px-4 py-3 text-right tabular text-muted-foreground">{r.closedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
