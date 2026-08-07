import { readLS, writeLS } from "@/lib/storage";
import type { Store, FinAlert, DayHistory } from "./types";

export const KEYS = {
  seed: "mp:seed:v1",
  stores: "mp:stores",
  alerts: "mp:alerts",
  history: "mp:history",
  cash: "mp:cash",
} as const;

const STORES: Store[] = [
  { id: "dom-pedro", name: "Dom Pedro", status: "ok", dailyEntry: 9240, note: "Dinheiro informado" },
  { id: "jabaquara", name: "Jabaquara", status: "ok", dailyEntry: 7180, note: "Dinheiro informado" },
  { id: "jorge-bereta", name: "Jorge Bereta", status: "divergencia", dailyEntry: 6450, note: "Diferença em 1 OS" },
  { id: "kennedy", name: "Kennedy", status: "ok", dailyEntry: 8920, note: "Dinheiro informado" },
  { id: "piraporinha", name: "Piraporinha", status: "ok", dailyEntry: 7630, note: "Dinheiro informado" },
  { id: "planalto", name: "Planalto", status: "pendente", dailyEntry: 0, note: "Aguardando Daniel" },
  { id: "ruge", name: "Ruge", status: "ok", dailyEntry: 11200, note: "Dinheiro informado" },
  { id: "santo-andre", name: "Santo André", status: "ok", dailyEntry: 8470, note: "Dinheiro informado" },
  { id: "rei-modulo", name: "Rei do Módulo", status: "ok", dailyEntry: 9880, note: "Dinheiro informado" },
  { id: "rei-oleo", name: "Rei do Óleo", status: "ok", dailyEntry: 15350, note: "Dinheiro informado" },
];

const ALERTS: FinAlert[] = [
  {
    id: "a1",
    severity: "critical",
    storeId: "jorge-bereta",
    storeName: "Jorge Bereta",
    os: "OS #4821",
    description: "Pagamento em 3 formas nÁo fecha o total. Diferença: R$ 320,00",
    detail:
      "Cliente pagou parte em débito (R$ 1.200,00), parte em PIX (R$ 800,00) e parte em crédito 3x (R$ 1.530,00). Total registrado: R$ 3.530,00. Total da OS: R$ 3.850,00.",
    timestamp: "07:34",
  },
  {
    id: "a2",
    severity: "warning",
    storeId: "jabaquara",
    storeName: "Jabaquara",
    os: "OS #4798",
    description: "Taxa de parcelamento incorreta. Lançado R$ 45 | Esperado R$ 67",
    detail:
      "Parcelamento em 6x sem juros foi lançado com taxa de 2,5%, quando o contrato vigente da máquina prevê 3,7%. Diferença de R$ 22,00 a menor no recebível.",
    timestamp: "07:34",
  },
  {
    id: "a3",
    severity: "warning",
    storeId: "kennedy",
    storeName: "Kennedy",
    os: "OS #4810",
    description: "OS finalizada sem pagamento registrado",
    detail:
      "OS marcada como concluída pelo mecânico responsável às 18:42, mas nenhuma forma de pagamento foi associada no sistema. Valor da OS: R$ 1.480,00.",
    timestamp: "07:35",
  },
];

function buildHistory(): DayHistory[] {
  const out: DayHistory[] = [];
  const divergenceDays = new Set([4, 11, 19, 26]);
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 4, 13 - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      result: divergenceDays.has(i) ? -((i + 1) * 87.3) : (Math.sin(i) * 12 + 4),
      status: divergenceDays.has(i) ? "divergence" : "approved",
    });
  }
  return out;
}

export function ensureSeed() {
  if (typeof window === "undefined") return;
  if (readLS(KEYS.seed, false)) return;
  writeLS(KEYS.stores, STORES);
  writeLS(KEYS.alerts, ALERTS);
  writeLS(KEYS.history, buildHistory());
  writeLS(KEYS.cash, {});
  writeLS(KEYS.seed, true);
}
