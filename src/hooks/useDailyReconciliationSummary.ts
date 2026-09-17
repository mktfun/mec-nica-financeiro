import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface StoreSummary {
  store_id: string;
  store_name: string;
  faturamento: number;
  entradas_ofx: number;
  saidas_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
}

export interface DailySummaryData {
  date: string;
  is_closed: boolean;
  status: 'approved' | 'divergence';
  tolerancia_aplicada: number;
  
  // 5 Macro Pilares
  faturamento_periodo: number;
  saldo_bancos: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  saldo_cofre: number;
  
  // Fluxo e DRE Canônico
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  valor_disp_contas: number;
  contas_manual: number;
  subtotal_contas: number;
  diferenca_final: number;
  
  // Breakdown por Filial (10 lojas)
  stores: StoreSummary[];
  [key: string]: any;
}

export function useDailyReconciliationSummary(date: string) {
  const queryClient = useQueryClient();
  const queryKey = ['daily-reconciliation-summary', date];

  const query = useQuery<DailySummaryData, Error>({
    queryKey,
    queryFn: async () => {
      if (!date) throw new Error('Data não informada');
      
      const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', {
        p_date: date,
        p_force_dynamic: false
      });

      if (error) {
        console.error('Erro ao buscar get_daily_reconciliation_summary:', error);
        throw error;
      }

      return data as DailySummaryData;
    },
    enabled: Boolean(date),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  const fecharDiaMutation = useMutation({
    mutationFn: async ({ targetDate, forceReopen = false }: { targetDate: string; forceReopen?: boolean }) => {
      const { data, error } = await supabase.rpc('fechar_dia', {
        p_date: targetDate,
        p_force_reopen: forceReopen
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Fechamento do dia consolidado com sucesso!');
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao-backend', date] });
    },
    onError: (err: any) => {
      console.error('Erro ao fechar dia:', err);
      toast.error(`Falha no fechamento: ${err.message || 'Erro desconhecido'}`);
    }
  });

  const invalidateSummary = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    ...query,
    summary: query.data,
    fecharDia: fecharDiaMutation.mutateAsync,
    isClosing: fecharDiaMutation.isPending,
    invalidateSummary
  };
}
