import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TransactionRow } from '@/lib/supabase';

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
      const today = new Date().toISOString().split('T')[0];
      const { data: rec, error: recErr } = await supabase
        .from('reconciliations')
        .select('financial_total, divergence, status')
        .eq('date', today);
      if (recErr) throw recErr;

      const rows = rec ?? [];
      const totalIn = rows.reduce((s, r) => s + (r.financial_total ?? 0), 0);
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
