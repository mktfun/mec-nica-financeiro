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
        .lte('occurred_at', endOfMonth)
        .eq('source', 'system');

      if (txMonthErr) throw txMonthErr;

      const { data: recsMonth, error: recMonthErr } = await supabase
        .from('reconciliations')
        .select('divergence, machine_fees')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
      if (recMonthErr) throw recMonthErr;

      // 2. Query para o Saldo Consolidado Real (Todos os Tempos)
      const { data: txsAllTime, error: txAllErr } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('source', 'system');
        
      if (txAllErr) throw txAllErr;

      const rowsMonth = txsMonth ?? [];
      const totalIn = rowsMonth.filter(r => r.type === 'in').reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalOut = rowsMonth.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalDivergences = (recsMonth ?? []).reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);

      const rowsAll = txsAllTime ?? [];
      const globalIn = rowsAll.filter(r => r.type === 'in').reduce((s, r) => s + (r.amount ?? 0), 0);
      const globalOut = rowsAll.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount ?? 0), 0);
      
      const { data: recsAll, error: recsAllErr } = await supabase
        .from('reconciliations')
        .select('machine_fees');
      if (recsAllErr) throw recsAllErr;
      
      const totalMachineFees = (recsAll ?? []).reduce((s, r) => s + (r.machine_fees ?? 0), 0);
      const globalBalance = globalIn - globalOut - totalMachineFees;

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
        .eq('type', 'out')
        .eq('source', 'system');
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
        .select('amount, type')
        .eq('source', 'system');
        
      if (storeId) {
        globalQuery = globalQuery.eq('store_id', storeId);
      }
      
      const { data: globalData, error: globalError } = await globalQuery;
      if (globalError) throw globalError;
      
      const globalRows = globalData as { amount: number, type: string }[];
      const globalIn = globalRows.filter(r => r.type === 'in').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const globalOut = globalRows.filter(r => r.type === 'out').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      
      let recsQuery = supabase.from('reconciliations').select('machine_fees');
      if (storeId) recsQuery = recsQuery.eq('store_id', storeId);
      const { data: recsData } = await recsQuery;
      const totalMachineFees = (recsData || []).reduce((acc, curr) => acc + Number(curr.machine_fees || 0), 0);

      const globalBalance = globalIn - globalOut - totalMachineFees;

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
        .select('store_id, amount, type')
        .eq('source', 'system');
        
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

export function useWeeklyRevenueTrend(anchorDate?: string) {
  const targetDate = anchorDate ?? getDefaultDate();
  return useQuery({
    queryKey: ['weeklyRevenueTrend', targetDate],
    queryFn: async () => {
      // Usar a data fornecida como âncora, ou a data de hoje
      const anchor = new Date(targetDate);
      
      const pastWeek = new Date(anchor);
      pastWeek.setDate(anchor.getDate() - 14); // 14 dias para trás da âncora
      
      const startDateStr = pastWeek.toISOString().split('T')[0] + 'T00:00:00.000Z';
      // Ajuste: também precisamos de um limite superior (end date) para não trazer dados do futuro em relação à âncora
      const endDateStr = anchor.toISOString().split('T')[0] + 'T23:59:59.999Z';
      
      const { data, error } = await supabase
        .from('transactions')
        .select('created_at, amount, type')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .eq('type', 'in')
        .eq('source', 'system');
        
      if (error) throw error;
      
      const rows = data as { created_at: string, amount: number }[];
      
      // Agrupar por dia
      const dailyMap: Record<string, number> = {};
      
      for (let i = 0; i <= 14; i++) {
        const d = new Date(pastWeek);
        d.setDate(pastWeek.getDate() + i);
        dailyMap[d.toISOString().split('T')[0]] = 0;
      }
      
      rows.forEach(row => {
        const dateKey = row.created_at.split('T')[0];
        if (dailyMap[dateKey] !== undefined) {
          dailyMap[dateKey] += Number(row.amount);
        }
      });
      
      const chartData = Object.keys(dailyMap).sort().map(date => ({
        date,
        value: dailyMap[date]
      }));
      
      return chartData;
    }
  });
}

export function useBulkInsertTransactions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactions: any[]) => {
      // Chunking if necessary, but for now Supabase can handle a reasonable array
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions);
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['extrato'] });
      queryClient.invalidateQueries({ queryKey: ['all-stores-balances'] });
    }
  });
}

export function useDailySystemBalance(targetDate: string) {
  return useQuery({
    queryKey: ['daily-system-balance', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', targetDate);
        
      if (error) throw error;
      
      const rows = data as TransactionRow[];
      
      return rows.reduce((acc: Record<string, number>, row) => {
        if (row.source === 'ofx' || (row.title && row.title.includes('Extrato Bancário'))) {
          return acc;
        }
        
        const storeId = row.store_id || 'unknown';
        if (!acc[storeId]) acc[storeId] = 0;
        
        const amount = Number(row.amount || 0);
        if (row.type === 'in') {
          acc[storeId] += amount;
        } else if (row.type === 'out') {
          acc[storeId] -= amount;
        }
        
        return acc;
      }, {});
    },
    enabled: !!targetDate,
  });
}
