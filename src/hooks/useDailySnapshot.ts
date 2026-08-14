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
  a_receber_manual: number;
  faturamento_outros_valor: number;
  faturamento_outros_desc: string | null;
  contas_a_pagar: number;
  provisao: number;
  saldo_negativo_itau: number;
  juros_rede: number;
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

export function useAvailableConciliacaoDates() {
  return useQuery({
    queryKey: ['available_conciliacao_dates'],
    queryFn: async () => {
      const dates = new Set<string>();

      // 1. Busca datas de daily_snapshots
      const { data: snapshotsData } = await supabase
        .from('daily_snapshots')
        .select('date');
      snapshotsData?.forEach(row => {
        if (row.date) dates.add(row.date);
      });

      // 2. Busca datas de import_batches
      const { data: batchesData } = await supabase
        .from('import_batches')
        .select('target_date');
      batchesData?.forEach(row => {
        if (row.target_date) dates.add(row.target_date);
      });

      // 3. Busca datas de reconciliations
      const { data: reconData } = await supabase
        .from('reconciliations')
        .select('date');
      reconData?.forEach(row => {
        if (row.date) dates.add(row.date);
      });

      // 4. Busca datas de ofx_transactions
      const { data: ofxData } = await supabase
        .from('ofx_transactions')
        .select('target_date')
        .not('target_date', 'is', null);
      ofxData?.forEach(row => {
        if (row.target_date) dates.add(row.target_date);
      });

      // Retorna array ordenado de forma ascendente
      return Array.from(dates).sort();
    }
  });
}
