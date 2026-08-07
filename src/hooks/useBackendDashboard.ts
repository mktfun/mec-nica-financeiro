import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardMetrics {
  dataAtual: string;
  dataAnterior: string;
  saldoTotal: number;
  caixaAtual: number;
  contasAPagar: number;
  diferenca: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFaturamento: number;
  fluxoCaixa: number;
  aReceber: number;
  veiculosPatio: number;
  veiculosPatioValor: number;
  porLoja: any[];
  historicoMacro: any[];
}

export function useBackendDashboard(date: string) {
  return useQuery({
    queryKey: ['backend-dashboard', date],
    queryFn: async (): Promise<DashboardMetrics> => {
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
      
      console.log(`[Dashboard] Solicitando métricas via RPC get_dashboard_metrics para a data: ${effectiveDate}`);
      
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_date: effectiveDate
      });

      if (error) {
        console.error("Erro ao carregar dashboard do backend:", error);
        throw error;
      }

      return data as DashboardMetrics;
    },
    enabled: !!date
  });
}
