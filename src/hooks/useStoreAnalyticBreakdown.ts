import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  BreakdownCategoryItem,
  groupTransactionsBySupplier,
  groupTransactionsByRevenueSource,
} from '@/lib/parsers/supplierUtils';

export interface StoreAnalyticBreakdown {
  store_id: string;
  start_date: string;
  end_date: string;
  current_balance: number;
  total_in: number;
  total_out: number;
  net_result: number;
  total_count: number;
  suppliers_out: BreakdownCategoryItem[];
  sources_in: BreakdownCategoryItem[];
  transactions: any[];
}

export function useStoreAnalyticBreakdown(
  storeId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['store_analytic_breakdown', storeId, startDate, endDate],
    queryFn: async (): Promise<StoreAnalyticBreakdown> => {
      if (!storeId || !startDate || !endDate) {
        return {
          store_id: storeId || '',
          start_date: startDate || '',
          end_date: endDate || '',
          current_balance: 0,
          total_in: 0,
          total_out: 0,
          net_result: 0,
          total_count: 0,
          suppliers_out: [],
          sources_in: [],
          transactions: [],
        };
      }

      // 1. Tenta chamar a RPC get_store_analytic_breakdown
      try {
        const { data, error } = await supabase.rpc('get_store_analytic_breakdown' as any, {
          p_store_id: storeId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (!error && data) {
          const res = typeof data === 'string' ? JSON.parse(data) : data;
          const suppliers = groupTransactionsBySupplier(res.transactions || res.suppliers_out || []);
          const sources = groupTransactionsByRevenueSource(res.transactions || res.sources_in || []);

          return {
            store_id: res.store_id || storeId,
            start_date: res.start_date || startDate,
            end_date: res.end_date || endDate,
            current_balance: Number(res.current_balance || 0),
            total_in: Number(res.total_in || 0),
            total_out: Number(res.total_out || 0),
            net_result: Number(res.net_result || 0),
            total_count: Number(res.total_count || 0),
            suppliers_out: suppliers.length > 0 ? suppliers : (res.suppliers_out || []),
            sources_in: sources.length > 0 ? sources : (res.sources_in || []),
            transactions: res.transactions || [],
          };
        }
      } catch (rpcErr) {
        console.warn('[useStoreAnalyticBreakdown] RPC fallback to client aggregation:', rpcErr);
      }

      // 2. Fallback resiliente: Query direta nas tabelas/views
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('occurred_at', { ascending: false });

      const { data: rawTxs, error: txErr } = await txQuery;
      if (txErr) throw txErr;

      const txs = (rawTxs || []) as any[];

      const totalIn = txs
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      const totalOut = txs
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      // Busca o último saldo bancário registrado no extrato OFX mais recente da loja (fixo e independente do filtro de datas)
      let currentBalance = 0;
      const { data: recData } = await supabase
        .from('reconciliations')
        .select('bank_total')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(1);

      if (recData && recData.length > 0) {
        currentBalance = Number(recData[0].bank_total || 0);
      }

      const suppliersOut = groupTransactionsBySupplier(txs);
      const sourcesIn = groupTransactionsByRevenueSource(txs);

      return {
        store_id: storeId,
        start_date: startDate,
        end_date: endDate,
        current_balance: currentBalance,
        total_in: totalIn,
        total_out: totalOut,
        net_result: totalIn - totalOut,
        total_count: txs.length,
        suppliers_out: suppliersOut,
        sources_in: sourcesIn,
        transactions: txs,
      };
    },
    enabled: !!storeId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
