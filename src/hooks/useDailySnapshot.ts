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

      // Executa queries em paralelo para carregamento instantâneo
      const [snapshotsRes, reconRes, ofxRes, posRes, patioRes, batchesRes] = await Promise.allSettled([
        supabase.from('daily_snapshots').select('date'),
        supabase.from('reconciliations').select('date'),
        supabase.from('ofx_transactions').select('target_date').not('target_date', 'is', null).limit(1000),
        supabase.from('pos_transactions').select('target_date').not('target_date', 'is', null).limit(1000),
        supabase.from('patio_os').select('opened_at').not('opened_at', 'is', null).limit(1000),
        supabase.from('import_batches').select('target_date'),
      ]);

      if (snapshotsRes.status === 'fulfilled' && snapshotsRes.value.data) {
        snapshotsRes.value.data.forEach(row => {
          if (row.date) dates.add(String(row.date));
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

      if (ofxRes.status === 'fulfilled' && ofxRes.value.data) {
        ofxRes.value.data.forEach(row => {
          if (row.target_date) dates.add(String(row.target_date));
        });
      }

      if (posRes.status === 'fulfilled' && posRes.value.data) {
        posRes.value.data.forEach(row => {
          if (row.target_date) dates.add(String(row.target_date));
        });
      }

      if (patioRes.status === 'fulfilled' && patioRes.value.data) {
        patioRes.value.data.forEach(row => {
          if (row.opened_at) {
            const dStr = String(row.opened_at).substring(0, 10);
            if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) dates.add(dStr);
          }
        });
      }

      // Retorna array ordenado de forma ascendente
      return Array.from(dates).filter(Boolean).sort();
    },
    staleTime: 5 * 60 * 1000,
  });
}
