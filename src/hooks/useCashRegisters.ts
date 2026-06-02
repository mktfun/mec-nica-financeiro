import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CashRegisterRow } from '@/lib/supabase';

export function useCashRegisters(storeId: string) {
  return useQuery({
    queryKey: ['cash_registers', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('store_id', storeId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as CashRegisterRow[];
    },
    enabled: !!storeId,
  });
}

export function useCloseCashRegister() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, declaredAmount, expectedAmount }: { id: string; declaredAmount: number; expectedAmount: number }) => {
      const divergence = declaredAmount - expectedAmount;
      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          declared_amount: declaredAmount,
          divergence,
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      // Também poderíamos invalidar dashboard se mostrássemos o caixa lá
    },
  });
}
