import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function usePurgeDailyData() {
  const queryClient = useQueryClient();

  const purgeMutation = useMutation({
    mutationFn: async (targetDate: string) => {
      if (!targetDate) {
        throw new Error('Data não informada para exclusão.');
      }

      const { data, error } = await supabase.rpc('purge_daily_financial_data', {
        p_date: targetDate,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, targetDate) => {
      // Invalidação ampla de todos os caches financeiros relacionados
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['extrato'] });
      queryClient.invalidateQueries({ queryKey: ['conciliation_matches'] });
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['import_logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily_revenue_adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const d = new Date(targetDate + 'T12:00:00');
      const formatted = d.toLocaleDateString('pt-BR');

      toast.success(`Dados do dia ${formatted} foram resetados com sucesso!`, {
        description: 'Transações, contas, extratos e snapshot foram limpos para este dia.',
      });
    },
    onError: (err: any) => {
      toast.error(`Falha ao resetar dados do dia: ${err.message || 'Erro desconhecido'}`);
    },
  });

  return {
    purgeDailyData: purgeMutation.mutateAsync,
    isPurging: purgeMutation.isPending,
  };
}
