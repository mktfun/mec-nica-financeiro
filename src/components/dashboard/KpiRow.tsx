import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { brl } from "@/lib/format";

const intFmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function KpiRow() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        label="Entradas do Dia"
        value={84320}
        format={brl}
        sub="10 lojas consolidadas"
        icon={TrendingUp}
        tone="success"
      />
      <KpiCard
        label="Contas a Pagar"
        value={79840}
        format={brl}
        sub="Vencimentos de hoje"
        icon={TrendingDown}
        tone="destructive"
      />
      <KpiCard
        label="Saldo Consolidado"
        value={4480}
        format={brl}
        sub="Entradas − Saídas"
        icon={Wallet}
        tone="neutral"
      />
      <KpiCard
        label="Carros no Pátio"
        value={23}
        format={(n) => `${intFmt(n)} OS`}
        sub="abertas há +24h"
        icon={Clock}
        tone="warning"
      />
    </div>
  );
}
