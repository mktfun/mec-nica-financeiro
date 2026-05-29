import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ReconciliationRow } from '@/lib/supabase';

export function useConciliacaoDetalhes(date?: string) {
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['reconciliations', 'details', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', targetDate)
        .order('store_id');
      if (error) throw error;
      return data as ReconciliationRow[];
    },
  });
}

export function useConciliacaoResumo(date?: string) {
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['reconciliations', 'resumo', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', targetDate);
      if (error) throw error;

      const rows = data as ReconciliationRow[];
      const totalIn = rows.reduce((s, r) => s + (r.financial_total ?? 0), 0);
      const totalDivergence = rows.reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);
      const resultado = rows.reduce((s, r) => s + (r.divergence ?? 0), 0);
      const approved = rows.filter(r => r.status === 'approved').length;
      const divergence = rows.filter(r => r.status === 'divergence').length;
      const pending = rows.filter(r => r.status === 'pending').length;

      return { totalIn, totalDivergence, resultado, approved, divergence, pending, rows };
    },
  });
}

export function useSaveDailyCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, value, date }: { storeId: string; value: number; date?: string }) => {
      const targetDate = date ?? new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('reconciliations')
        .upsert({ store_id: storeId, date: targetDate, daily_cash: value }, { onConflict: 'store_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });
}

export function useHistorico(limit = 30) {
  return useQuery({
    queryKey: ['reconciliations', 'history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('date, status, financial_total, divergence, os_count, store_id')
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}
