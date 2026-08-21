import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AutonomousReconciliationResult } from '@/types/autoHealing';
import { toast } from 'sonner';

export function useAutonomousReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetDate: string): Promise<AutonomousReconciliationResult> => {
      const { data, error } = await supabase.rpc('run_autonomous_reconciliation_loop', {
        p_date: targetDate,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao executar motor autônomo de conciliação.');
      }

      return data as AutonomousReconciliationResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-insights'] });

      if (data.is_conforme) {
        toast.success(`Conciliação concluída e auditada! Diferença final: R$ ${data.final_delta.toFixed(2)}`);
      } else {
        toast.warning(`Conciliação concluída com divergência residual de R$ ${data.final_delta.toFixed(2)}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao executar auditoria pericial.');
    },
  });
}
