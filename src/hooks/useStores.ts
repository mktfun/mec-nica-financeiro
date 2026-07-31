import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, StoreRow } from '@/lib/supabase';

const sanitizeStore = (store: StoreRow): StoreRow => {
  if (!store.name) return store;
  return {
    ...store,
    name: store.name.replace(/\uFFFD/g, 'ó').replace(/M.dulo/g, 'Módulo').replace(/Mdulo/g, 'Módulo')
  };
};

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) {
        console.warn('Failed to fetch stores:', error);
        return [];
      }
      return (data as StoreRow[]).map(sanitizeStore);
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

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newStore: Omit<StoreRow, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('stores')
        .insert([{ ...newStore, active: true, id: crypto.randomUUID() }])
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

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}
