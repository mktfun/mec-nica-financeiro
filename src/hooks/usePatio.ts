import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, PatioOSRow } from '@/lib/supabase';

export function usePatioOS(filters?: { status?: PatioOSRow['status']; storeId?: string }) {
  return useQuery({
    queryKey: ['patio', filters],
    queryFn: async () => {
      let q = supabase.from('patio_os').select('*');
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.storeId) q = q.eq('store_id', filters.storeId);
      q = q.order('days_open', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as PatioOSRow[];
    },
  });
}

export function useUpdatePatioOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PatioOSRow> }) => {
      const { error } = await supabase
        .from('patio_os')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patio'] });
    },
  });
}
