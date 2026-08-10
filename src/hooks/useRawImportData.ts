import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface RawOsRecord {
  os_number: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  total_value: number;
  paid_value: number;
  remaining_value: number;
  payment_method: string | null;
}

export interface RawRedeRecord {
  id: string;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  fee_percentage: number;
  matched_os_number: string | null;
}

export interface RawOfxTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  occurred_at: string;
  fitid: string | null;
  matched_os_number: string | null;
}

export interface RawOfxResponse {
  account_limit: number | null;
  previous_balance: number | null;
  transactions: RawOfxTransaction[];
}

export function useRawOs(storeId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['raw_os', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_raw_os_data' as any, {
        p_store_id: storeId,
        p_date: date
      });
      if (error) throw error;
      return (data || []) as RawOsRecord[];
    },
    enabled: enabled && !!storeId && !!date
  });
}

export function useRawRede(storeId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['raw_rede', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_raw_rede_data' as any, {
        p_store_id: storeId,
        p_date: date
      });
      if (error) throw error;
      return (data || []) as RawRedeRecord[];
    },
    enabled: enabled && !!storeId && !!date
  });
}

export function useRawOfx(storeId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['raw_ofx', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_raw_ofx_data' as any, {
        p_store_id: storeId,
        p_date: date
      });
      if (error) throw error;
      return data as unknown as RawOfxResponse;
    },
    enabled: enabled && !!storeId && !!date
  });
}
