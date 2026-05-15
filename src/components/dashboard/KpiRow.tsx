import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { brl } from "@/lib/format";

const intFmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

// Mock sparkline data
const dataIncome = [{value: 50}, {value: 65}, {value: 55}, {value: 80}, {value: 70}, {value: 90}];
const dataExpense = [{value: 40}, {value: 30}, {value: 45}, {value: 20}, {value: 35}, {value: 50}];
const dataBalance = [{value: 10}, {value: 35}, {value: 10}, {value: 60}, {value: 35}, {value: 40}];
const dataPatio = [{value: 15}, {value: 18}, {value: 20}, {value: 17}, {value: 22}, {value: 23}];

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
        data={dataIncome}
        index={0}
      />
      <KpiCard
        label="Contas a Pagar"
        value={79840}
        format={brl}
        sub="Vencimentos de hoje"
        icon={TrendingDown}
        tone="destructive"
        data={dataExpense}
        index={1}
      />
      <KpiCard
        label="Saldo Consolidado"
        value={4480}
        format={brl}
        sub="Entradas − Saídas"
        icon={Wallet}
        tone="neutral"
        data={dataBalance}
        index={2}
      />
      <KpiCard
        label="Carros no Pátio"
        value={23}
        format={(n) => `${intFmt(n)} OS`}
        sub="abertas há +24h"
        icon={Clock}
        tone="warning"
        data={dataPatio}
        index={3}
      />
    </div>
  );
}
