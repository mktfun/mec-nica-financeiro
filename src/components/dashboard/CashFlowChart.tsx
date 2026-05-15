import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { mockCashFlow } from "../../mock/data";

export function CashFlowChart() {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mockCashFlow.slice(-7)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#666' }}
            dy={10}
          />
          <YAxis 
            hide
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
          />
          <Bar dataKey="in" fill="#00a87e" radius={[4, 4, 4, 4]} name="Entradas" />
          <Bar dataKey="out" fill="#333333" radius={[4, 4, 4, 4]} name="Saídas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
