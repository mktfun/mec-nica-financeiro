import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, AlertRow } from '@/lib/supabase';

export function useAlerts(date?: string) {
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['alerts', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('date', targetDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AlertRow[];
    },
  });
}

export function useAllAlerts() {
  return useQuery({
    queryKey: ['alerts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AlertRow[];
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
