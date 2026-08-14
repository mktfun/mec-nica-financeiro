import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ConciliationDailyLog {
  store_id: string;
  store_name: string;
  faturamento_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence' | 'pending';
}

export function useBackendConciliacao(date: string) {
  return useQuery({
    queryKey: ['backend-conciliacao', date],
    queryFn: async (): Promise<ConciliationDailyLog[]> => {
      let effectiveDate = date;
      if (!effectiveDate) {
        const { data: latestLog } = await supabase
          .from('import_logs')
          .select('target_date')
          .order('target_date', { ascending: false })
          .limit(1)
          .single();
        
        effectiveDate = latestLog?.target_date || new Date().toISOString().split('T')[0];
      }

      console.log(`[Conciliação] Solicitando cálculo via RPC calculate_daily_conciliation para a data: ${effectiveDate}`);

      const { data, error } = await supabase.rpc('calculate_daily_conciliation', {
        p_date: effectiveDate
      });

      if (error) {
        console.error("Erro ao calcular conciliação no backend:", error);
        throw error;
      }

      return data as ConciliationDailyLog[];
    },
    enabled: !!date
  });
}

export function useGlobalOfxOut(date: string) {
  return useQuery({
    queryKey: ['global-ofx-out', date],
    queryFn: async (): Promise<number> => {
      if (!date) return 0;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('target_date', date)
        .eq('type', 'out')
        .eq('source', 'ofx');
        
      if (error) {
        console.error("Erro ao buscar contas OFX:", error);
        return 0;
      }
      
      const total = data.reduce((acc, row) => acc + Math.abs(Number(row.amount) || 0), 0);
      return total;
    },
    enabled: !!date
  });
}

export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
}

export interface DailyReconciliationSummary {
  data_atual: string;
  total_saldo_banco: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  contas_manual: number;
  juros_rede: number;
  ofx_out: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_ofx: number;
  faturamento_anterior: number;
  faturamento_periodo: number;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  status_geral: 'approved' | 'divergence';
  stores: StoreReconciliationSummary[];
}

export function useDailyReconciliationSummary(date: string) {
  return useQuery({
    queryKey: ['daily-reconciliation-summary', date],
    queryFn: async (): Promise<DailyReconciliationSummary | null> => {
      if (!date) return null;

      const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', {
        p_date: date
      });

      if (error) {
        console.error("Erro ao carregar resumo consolidado do backend:", error);
        throw error;
      }

      return data as unknown as DailyReconciliationSummary;
    },
    enabled: !!date,
    staleTime: 1000 * 30, // 30s cache
  });
}

