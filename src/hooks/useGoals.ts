import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface GoalRow {
  id: string;
  store_id: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export function useMonthlyGoal(storeId: string = 'GLOBAL') {
  return useQuery({
    queryKey: ['goal', storeId],
    queryFn: async () => {
      // Pega o início e fim do mês atual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('store_id', storeId)
        .gte('start_date', firstDay)
        .lte('end_date', lastDay)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Ignora erro de schema caso a migration ainda nÁo tenha rodado
        console.warn('Failed to fetch goals:', error);
      }

      // Se nÁo houver meta para o mês, retorna valores padrÁo para a UI nÁo quebrar
      if (!data) {
        return {
          target_amount: 0,
          current_amount: 0,
        } as Partial<GoalRow>;
      }

      return data as GoalRow;
    },
  });
}
