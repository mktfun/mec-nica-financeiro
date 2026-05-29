import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, StoreRow } from '@/lib/supabase';

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as StoreRow[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as StoreRow;
    },
    enabled: !!id,
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StoreRow> }) => {
      const { data, error } = await supabase
        .from('stores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StoreRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}
