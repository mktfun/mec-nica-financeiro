import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStores } from './useStores';

export interface ImportLog {
  id: string;
  store_id: string;
  store_name: string;
  target_date: string;
  total_os: number;
  total_paid_all: number;
  total_dinheiro: number;
  os_count: number;
  receivables_count: number;
  created_at: string;
}

export interface ImportLogFilters {
  storeId?: string;
  startDate?: string;
  endDate?: string;
}

export function useImportLogs(filters?: ImportLogFilters) {
  return useQuery({
    queryKey: ['import_logs', filters],
    queryFn: async () => {
      let q = supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.storeId) q = q.eq('store_id', filters.storeId);
      if (filters?.startDate) q = q.gte('target_date', filters.startDate);
      if (filters?.endDate) q = q.lte('target_date', filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as ImportLog[];
    },
  });
}

export function useImportLogDetail(storeId: string, targetDate: string) {
  return useQuery({
    queryKey: ['import_log_detail', storeId, targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId)
        .eq('closed_at', targetDate)
        .order('os_number');
      if (error) throw error;
      return data;
    },
    enabled: !!storeId && !!targetDate,
  });
}
