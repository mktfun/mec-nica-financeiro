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
      queryClient.invalidateQueries({ queryKey: ['patio_os'] });
      queryClient.invalidateQueries({ queryKey: ['patio-os'] });
      queryClient.invalidateQueries({ queryKey: ['patio'] });
      queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      queryClient.invalidateQueries({ queryKey: ['store-ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['os_import_observations'] });
      queryClient.invalidateQueries({ queryKey: ['ofx_balance_selections'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['cash_vault'] });

      const d = new Date(targetDate + 'T12:00:00');
      const formatted = d.toLocaleDateString('pt-BR');

      const res = data as any;
      const osRestored = Number(res?.restored_os_count || 0);
      const osDeleted = Number(res?.deleted_new_os_count || 0);
      const desc = osRestored > 0 || osDeleted > 0
        ? `${osRestored} OS(s) restaurada(s) para o estado anterior, ${osDeleted} nova(s) removida(s). Dados do dia limpos com sucesso.`
        : 'Transações, contas, extratos e snapshot foram limpos para este dia.';

      toast.success(`Dados do dia ${formatted} foram resetados com sucesso!`, {
        description: desc,
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
