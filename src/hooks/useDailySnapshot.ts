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
  metadata?: Record<string, any> | null;
  is_closed?: boolean | null;
  closed_at?: string | null;
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
      // Get the most recent consolidated snapshot before the given date
      const { data, error } = await supabase
        .from('daily_snapshots')
        .select('*')
        .lt('date', date)
        .eq('is_closed', true)
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

      // Executa queries em paralelo considerando apenas datas com ações contábeis efetivas
      const [snapshotsRes, reconRes, batchesRes] = await Promise.allSettled([
        supabase.from('daily_snapshots').select('date, is_closed, caixa_atual'),
        supabase.from('reconciliations').select('date').or('ofx_imported.eq.true,bank_total.gt.0'),
        supabase.from('import_batches').select('target_date'),
      ]);

      if (snapshotsRes.status === 'fulfilled' && snapshotsRes.value.data) {
        snapshotsRes.value.data.forEach(row => {
          if (row.date && (row.is_closed || Number(row.caixa_atual || 0) > 0)) {
            dates.add(String(row.date));
          }
        });
      }

      if (reconRes.status === 'fulfilled' && reconRes.value.data) {
        reconRes.value.data.forEach(row => {
          if (row.date) dates.add(String(row.date));
        });
      }

      if (batchesRes.status === 'fulfilled' && batchesRes.value.data) {
        batchesRes.value.data.forEach(row => {
          if (row.target_date) dates.add(String(row.target_date));
        });
      }

      // Retorna array ordenado de forma ascendente
      return Array.from(dates).filter(Boolean).sort();
    },
    staleTime: 60 * 1000,
  });
}
