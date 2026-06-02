import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoDetalhes } from '@/hooks/useConciliacao';
import { TrendingUp } from 'lucide-react';

export function StoreRankingChart() {
  const { data: stores = [] } = useStores();
  const { data: detalhes = [], isLoading } = useConciliacaoDetalhes();

  const data = useMemo(() => {
    return stores.map(store => {
      const rec = detalhes.find(d => d.store_id === store.id);
      return {
        name: store.name.replace('Rei do ', 'R. '), // Shorten names for the chart
        fullName: store.name,
        faturamento: rec?.os_total || 0,
      };
    }).sort((a, b) => {
      return b.faturamento - a.faturamento;
    }).slice(0, 5); // Top 5
  }, [stores, detalhes]);

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
            <TrendingUp size={18} className="text-[var(--color-primary)]" />
            Ranking das Lojas
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Top 5 faturamento no mês</p>
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
                return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento'];
              }}
              labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="faturamento" radius={[0, 4, 4, 0]} barSize={32}>
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
