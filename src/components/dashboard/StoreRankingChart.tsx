import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStores } from '@/hooks/useStores';
import { useAllStoresBalances } from '@/hooks/useTransactions';
import { TrendingUp, Wallet } from 'lucide-react';

export function StoreRankingChart() {
  const { data: stores = [] } = useStores();
  const { data: allBalances = {}, isLoading } = useAllStoresBalances();

  const data = useMemo(() => {
    return stores.map(store => {
      return {
        name: store.name.replace('Rei do ', 'R. '), // Shorten names for the chart
        fullName: store.name,
        saldo: allBalances[store.id] || 0,
      };
    }).sort((a, b) => {
      return b.saldo - a.saldo;
    }).slice(0, 5); // Top 5
  }, [stores, allBalances]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="animate-pulse w-32 h-8 bg-[var(--bg-surface-hover)] rounded-md"></div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Wallet size={18} className="text-[var(--color-primary)]" />
            Saldos Globais
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Top 5 maiores caixas</p>
        </div>
      </div>

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 12 }} 
              width={100}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => {
                return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo em Caixa'];
              }}
              labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="saldo" radius={[0, 4, 4, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
