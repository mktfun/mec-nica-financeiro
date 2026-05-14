import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { brl } from "@/lib/format";

export function KpiRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        label="Entradas do Dia"
        value={brl(84320)}
        sub="10 lojas consolidadas"
        icon={TrendingUp}
        tone="success"
      />
      <KpiCard
        label="Contas a Pagar"
        value={brl(79840)}
        sub="Vencimentos de hoje"
        icon={TrendingDown}
        tone="destructive"
      />
      <KpiCard
        label="Saldo Consolidado"
        value={brl(4480)}
        sub="Entradas − Saídas"
        icon={Wallet}
        tone="neutral"
      />
      <KpiCard
        label="Carros no Pátio"
        value="23"
        sub="OS abertas há +24h"
        icon={Clock}
        tone="warning"
      />
    </div>
  );
}
