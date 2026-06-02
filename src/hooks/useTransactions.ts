import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TransactionRow } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';

export function useTransactions(limit = 20) {
  return useQuery({
    queryKey: ['transactions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as TransactionRow[];
    },
  });
}

export function useTransactionsByStore(storeId: string) {
  return useQuery({
    queryKey: ['transactions', 'store', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('occurred_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as TransactionRow[];
    },
    enabled: !!storeId,
  });
}

export function useDashboardSummary(monthStr?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', monthStr],
    queryFn: async () => {
      let year, month;
      if (monthStr) {
        [year, month] = monthStr.split('-');
      } else {
        const today = getDefaultDate();
        [year, month] = today.split('-');
      }
      const startOfMonth = `${year}-${month}-01`;
      const end = new Date(Number(year), Number(month), 0);
      const endOfMonth = `${year}-${month}-${String(end.getDate()).padStart(2, '0')}`;

      // 1. Query para as Entradas/Saídas/Divergências do Mês
      const { data: txsMonth, error: txMonthErr } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('occurred_at', startOfMonth)
        .lte('occurred_at', endOfMonth);

      if (txMonthErr) throw txMonthErr;

      const { data: recsMonth, error: recMonthErr } = await supabase
        .from('reconciliations')
        .select('divergence')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
      if (recMonthErr) throw recMonthErr;

      // 2. Query para o Saldo Consolidado Real (Todos os Tempos)
      const { data: txsAllTime, error: txAllErr } = await supabase
        .from('transactions')
        .select('amount, type');
        
      if (txAllErr) throw txAllErr;

      const rowsMonth = txsMonth ?? [];
      const totalIn = rowsMonth.filter(r => r.type === 'in').reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalOut = rowsMonth.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalDivergences = (recsMonth ?? []).reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);

      const rowsAll = txsAllTime ?? [];
      const globalIn = rowsAll.filter(r => r.type === 'in').reduce((s, r) => s + (r.amount ?? 0), 0);
      const globalOut = rowsAll.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount ?? 0), 0);
      const globalBalance = globalIn - globalOut;

      return {
        totalIn,
        totalOut,
        balance: globalBalance,
        totalDivergences,
        motorStatus: 'completed' as 'completed' | 'processing',
      };
    },
  });
}

export function useCashFlow(days = 7) {
  return useQuery({
    queryKey: ['cashFlow', days],
    queryFn: async () => {
      // Obter datas dos ultimos X dias
      const dates = Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().split('T')[0];
      });

      const { data: recs, error: recErr } = await supabase
        .from('reconciliations')
        .select('date, financial_total')
        .in('date', dates);
      if (recErr) throw recErr;

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('occurred_at, amount, type')
        .eq('type', 'out');
      if (txErr) throw txErr;

      // Group reconciliations (Entradas) by date
      const entriesByDate = (recs || []).reduce((acc: any, curr) => {
        const d = curr.date;
        acc[d] = (acc[d] || 0) + (curr.financial_total || 0);
        return acc;
      }, {});

      // Group transactions (Saídas) by date
      const exitsByDate = (txs || []).reduce((acc: any, curr) => {
        const d = curr.occurred_at?.split('T')[0];
        if (d) {
          acc[d] = (acc[d] || 0) + (curr.amount || 0);
        }
        return acc;
      }, {});

      // Construir array final no formato que o CashFlowChart espera
      return dates.map(d => {
        const [, month, day] = d.split('-');
        return {
          date: `${day}/${month}`,
          in: entriesByDate[d] || 0,
          out: exitsByDate[d] || 0,
        };
      });
    },
  });
}

export function useExtrato(storeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['extrato', storeId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (startDate) {
        query = query.gte('occurred_at', startDate);
      }
      if (endDate) {
        query = query.lte('occurred_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const rows = data as TransactionRow[];
      
      const totalIn = rows.filter(r => r.type === 'in').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const totalOut = rows.filter(r => r.type === 'out').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      
      // Query adicional para Saldo Global da Loja
      let globalQuery = supabase
        .from('transactions')
        .select('amount, type');
        
      if (storeId) {
        globalQuery = globalQuery.eq('store_id', storeId);
      }
      
      const { data: globalData, error: globalError } = await globalQuery;
      if (globalError) throw globalError;
      
      const globalRows = globalData as { amount: number, type: string }[];
      const globalIn = globalRows.filter(r => r.type === 'in').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const globalOut = globalRows.filter(r => r.type === 'out').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const globalBalance = globalIn - globalOut;

      return {
        transactions: rows,
        totalIn,
        totalOut,
        balance: totalIn - totalOut, // Mantém compatibilidade
        globalBalance
      };
    },
  });
}

export function useAllStoresBalances() {
  return useQuery({
    queryKey: ['all-stores-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('store_id, amount, type');
        
      if (error) throw error;
      
      const rows = data as { store_id: string, amount: number, type: string }[];
      
      const balances: Record<string, number> = {};
      
      for (const row of rows) {
        if (!balances[row.store_id]) balances[row.store_id] = 0;
        const amount = Number(row.amount || 0);
        balances[row.store_id] += row.type === 'in' ? amount : -amount;
      }
      
      return balances;
    }
  });
}

export function useTransactionsPorDataELoja(date: string, storeId: string) {
  return useQuery({
    queryKey: ['transactions', 'store', storeId, 'date', date],
    queryFn: async () => {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TransactionRow[];
    },
    enabled: !!storeId && !!date,
  });
}
