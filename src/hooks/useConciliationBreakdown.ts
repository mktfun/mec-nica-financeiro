import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface OfxTransactionDetail {
  id: string;
  occurred_at: string;
  description: string;
  fitid: string | null;
  amount: number;
  matched: boolean;
}

export interface OsDetail {
  os_number: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  total_value: number;
  paid_value: number;
  remaining: number;
  payment_method: string | null;
  is_previous_month: boolean;
}

export interface RedeTransactionDetail {
  id: string;
  occurred_at: string;
  machine_name: string;
  payment_method: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  fee_pct: number;
}

export interface ConciliationBreakdown {
  bank_total: number;
  bank_total_source: 'snapshot_reconciliations' | 'realtime_ofx_transactions';
  bank_total_warning: 'ok' | 'trigger_desatualizado';
  ofx_in_total: number;
  ofx_in: OfxTransactionDetail[];
  ofx_out_total: number;
  ofx_out: OfxTransactionDetail[];
  na_loja_os: number;
  na_loja_os_source: 'snapshot_reconciliations' | 'realtime_patio_os';
  na_loja_current_month: number;
  na_loja_prev_months: number;
  na_loja_detail: OsDetail[];
  juros_rede: number;
  rede_transactions: RedeTransactionDetail[];
}

export function useConciliationBreakdown(storeId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['conciliation-breakdown', storeId, date],
    queryFn: async (): Promise<ConciliationBreakdown> => {
      const { data, error } = await supabase.rpc('get_conciliation_breakdown', {
        p_store_id: storeId!,
        p_date: date!,
      });

      if (error) {
        console.error('[BreakdownModal] Erro na RPC:', error);
        throw error;
      }

      return data as ConciliationBreakdown;
    },
    enabled: !!storeId && !!date,
    staleTime: 30_000, // 30s — dados de auditoria, não mudam durante a sessão
  });
}
