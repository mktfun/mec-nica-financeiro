import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ReceivableRow } from '@/lib/supabase';

export function useRecebiveis(filters?: { status?: ReceivableRow['status']; storeId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['receivables', filters],
    queryFn: async () => {
      let q = supabase.from('receivables').select('*');
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.storeId) q = q.eq('store_id', filters.storeId);
      if (filters?.startDate) q = q.gte('due_date', filters.startDate);
      if (filters?.endDate) q = q.lte('due_date', filters.endDate);
      q = q.order('due_date', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data as ReceivableRow[];
    },
  });
}

export function useMarkReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({ status: 'recebido', received_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
    },
  });
}
