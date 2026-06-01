import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TransactionRow } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';

export function useTransactions(limit = 20) {
  return useQuery({
    queryKey: ['transactions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as TransactionRow[];
    },
  });
}

export function useTransactionsByStore(storeId: string) {
  return useQuery({
    queryKey: ['transactions', 'store', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('occurred_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as TransactionRow[];
    },
    enabled: !!storeId,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const today = getDefaultDate();
      const { data: rec, error: recErr } = await supabase
        .from('reconciliations')
        .select('os_total, financial_total, divergence, status')
        .eq('date', today);
      if (recErr) throw recErr;

      const rows = rec ?? [];
      // os_total = faturamento bruto das OSs (todos pagamentos)
      const totalIn = rows.reduce((s, r) => s + (r.os_total ?? 0), 0);
      const totalDivergences = rows.reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);
      const hasDivergence = rows.some(r => r.status === 'divergence');

      return {
        totalIn,
        totalDivergences,
        motorStatus: hasDivergence ? 'divergence' : 'completed' as const,
      };
    },
  });
}

export function useCashFlow(days = 7) {
  return useQuery({
    queryKey: ['cashFlow', days],
    queryFn: async () => {
      // Obter datas dos ultimos X dias
      const dates = Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().split('T')[0];
      });

      const { data: recs, error: recErr } = await supabase
        .from('reconciliations')
        .select('date, financial_total')
        .in('date', dates);
      if (recErr) throw recErr;

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('occurred_at, amount, type')
        .eq('type', 'out');
      if (txErr) throw txErr;

      // Group reconciliations (Entradas) by date
      const entriesByDate = (recs || []).reduce((acc: any, curr) => {
        const d = curr.date;
        acc[d] = (acc[d] || 0) + (curr.financial_total || 0);
        return acc;
      }, {});

      // Group transactions (Saídas) by date
      const exitsByDate = (txs || []).reduce((acc: any, curr) => {
        const d = curr.occurred_at?.split('T')[0];
        if (d) {
          acc[d] = (acc[d] || 0) + (curr.amount || 0);
        }
        return acc;
      }, {});

      // Construir array final no formato que o CashFlowChart espera
      return dates.map(d => {
        const [, month, day] = d.split('-');
        return {
          date: `${day}/${month}`,
          in: entriesByDate[d] || 0,
          out: exitsByDate[d] || 0,
        };
      });
    },
  });
}
