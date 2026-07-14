import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type DailySnapshotRow = {
  id: string;
  date: string;
  caixa_atual: number;
  faturamento: number;
  dinheiro_mp: number;
  total_recebiveis: number;
  total_patio: number;
  saldo_bancario: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useDailySnapshot(date: string) {
  return useQuery({
    queryKey: ['daily_snapshots', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_snapshots')
        .select('*')
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      return data as DailySnapshotRow | null;
    },
    enabled: !!date,
  });
}

export function usePreviousDaySnapshot(date: string) {
  return useQuery({
    queryKey: ['daily_snapshots', 'previous', date],
    queryFn: async () => {
      // Get the most recent snapshot before the given date
      const { data, error } = await supabase
        .from('daily_snapshots')
        .select('*')
        .lt('date', date)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DailySnapshotRow | null;
    },
    enabled: !!date,
  });
}

export function useSaveDailySnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<DailySnapshotRow, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { error } = await supabase
        .from('daily_snapshots')
        .upsert(
          { ...payload, updated_at: new Date().toISOString() },
          { onConflict: 'date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
  });
}
