import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, InterestRateRow } from '@/lib/supabase';

export function useInterestRates() {
  return useQuery({
    queryKey: ['interest_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interest_rates')
        .select('*')
        .order('payment_method');
      if (error) {
        // If table doesn't exist yet, we will just return empty array
        if (error.code === '42P01') {
          return [] as InterestRateRow[];
        }
        throw error;
      }
      return data as InterestRateRow[];
    },
  });
}

export function useAddInterestRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: Omit<InterestRateRow, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('interest_rates')
        .insert(rate)
        .select()
        .single();
      if (error) throw error;
      return data as InterestRateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest_rates'] });
    },
  });
}

export function useDeleteInterestRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('interest_rates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest_rates'] });
    },
  });
}
