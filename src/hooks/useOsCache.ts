import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface OficinaOsCache {
  id: string;
  store_id: string;
  os_number: string;
  status_cache: string;
  payload_completo: any;
  created_at: string;
  updated_at: string;
}

export function useOsCache(limit: number = 100) {
  return useQuery({
    queryKey: ['os-cache', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oficina_os_cache')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching OS cache:', error);
        throw error;
      }

      return data as OficinaOsCache[];
    },
    refetchInterval: 10000,
  });
}
