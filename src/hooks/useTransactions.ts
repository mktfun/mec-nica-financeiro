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
        .eq('source', 'ofx');

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
        .eq('source', 'ofx');
        
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

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('occurred_at, amount, type')
        .eq('source', 'ofx');
      if (txErr) throw txErr;

      // Group transactions (Entradas) by date
      const entriesByDate = (txs || []).reduce((acc: any, curr) => {
        if (curr.type === 'in') {
          const d = curr.occurred_at?.split('T')[0];
          if (d) {
            acc[d] = (acc[d] || 0) + (curr.amount || 0);
          }
        }
        return acc;
      }, {});

      // Group transactions (Saídas) by date
      const exitsByDate = (txs || []).reduce((acc: any, curr) => {
        if (curr.type === 'out') {
          const d = curr.occurred_at?.split('T')[0];
          if (d) {
            acc[d] = (acc[d] || 0) + (curr.amount || 0);
          }
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

      query = query.eq('source', 'ofx');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (startDate) {
        query = query.gte('target_date', startDate);
      }
      if (endDate) {
        query = query.lte('target_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const rows = data as TransactionRow[];
      
      const totalIn = rows.filter(r => r.type === 'in').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const totalOut = rows.filter(r => r.type === 'out').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      
      // Query adicional para Saldo Global da Loja
      let globalBalance = 0;
      
      if (storeId) {
        const { data: recData, error: recError } = await supabase
          .from('reconciliations')
          .select('bank_total')
          .eq('store_id', storeId)
          .order('date', { ascending: false })
          .limit(1);
          
        if (recError) throw recError;
        
        if (recData && recData.length > 0) {
          globalBalance = Number(recData[0].bank_total || 0);
        }
      }

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
        .from('reconciliations')
        .select('store_id, bank_total, date')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      const rows = data as { store_id: string, bank_total: number, date: string }[];
      
      const balances: Record<string, number> = {};
      
      for (const row of rows) {
        if (balances[row.store_id] === undefined) {
          balances[row.store_id] = Number(row.bank_total || 0);
        }
      }
      
      return balances;
    }
  });
}

export function useTransactionsPorDataELoja(date: string, storeId: string) {
  return useQuery({
    queryKey: ['transactions', 'store', storeId, 'date', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date)
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
        .eq('source', 'ofx');
        
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

export function useCreateImportBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ target_date }: { target_date: string }) => {
      const { data, error } = await supabase
        .from('import_batches')
        .insert({ target_date })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  });
}

export function useBulkInsertConciliationMatches() {
  return useMutation({
    mutationFn: async (matches: any[]) => {
      if (matches.length === 0) return null;
      const { data, error } = await supabase
        .from('conciliation_matches')
        .insert(matches);
      if (error) throw error;
      return data;
    }
  });
}

export function useBulkInsertTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any[] | { transactions: any[], storeBankBalances?: Record<string, number>, storePreviousBalances?: Record<string, number>, import_batch_id?: string }) => {
      // Separar as transações do possível ofxBankBalance
      const txs = Array.isArray(payload) ? payload : payload.transactions;
      const storeBankBalances = Array.isArray(payload) ? undefined : payload.storeBankBalances;
      const storePreviousBalances = Array.isArray(payload) ? undefined : payload.storePreviousBalances;
      const import_batch_id = Array.isArray(payload) ? undefined : payload.import_batch_id;
      
      // Inject import_batch_id into all transactions
      if (import_batch_id) {
        txs.forEach((t: any) => t.import_batch_id = import_batch_id);
      }
      
      // 1. Separar OFX (com fitid) de outras transações
      const ofxTxsRaw = txs.filter((t: any) => t.fitid);
      
      // Deduplicate by store_id + fitid in memory before upsert to avoid 'ON CONFLICT cannot affect row a second time'
      const ofxMap = new Map();
      ofxTxsRaw.forEach((t: any) => {
        const key = `${t.store_id || 'null'}_${t.fitid}`;
        const { id, ...rest } = t;
        ofxMap.set(key, rest);
      });
      const ofxTxs = Array.from(ofxMap.values());
      
      const otherTxs = txs.filter((t: any) => !t.fitid);

      let data: any = null;
      let error: any = null;

      // OFX: Upsert idempotente (onConflict DO NOTHING graças ao ignoreDuplicates)
      // Removemos o delete prévio destrutivo para preservar as chaves primárias originais e não quebrar amarrações (Wipeout Bug)
      if (ofxTxs.length > 0) {
        const { data: d1, error: e1 } = await supabase
          .from('transactions')
          .upsert(ofxTxs, { onConflict: 'store_id, fitid', ignoreDuplicates: true });
        if (e1) { error = e1; } else { data = d1; }
      }

      // Outras transações (Rede/Maquininha): insert normal com delete prévio restrito à origem
      if (!error && otherTxs.length > 0) {
        const storeDates = new Set<string>();
        otherTxs.forEach((t: any) => {
          if (t.target_date) {
            storeDates.add(`${t.store_id || 'null'}|${t.target_date}`);
          }
        });

        for (const sd of Array.from(storeDates)) {
          const [sId, tDate] = sd.split('|');
          const delQuery = supabase
            .from('transactions')
            .delete()
            .eq('target_date', tDate)
            .in('source', ['rede', 'maquininha']);
            
          if (sId === 'null') {
            await delQuery.is('store_id', null);
          } else {
            await delQuery.eq('store_id', sId);
          }
        }

        const { data: d2, error: e2 } = await supabase
          .from('transactions')
          .insert(otherTxs);
        if (e2) { error = e2; } else { data = data || d2; }
      }
        
      if (error) throw error;
      
      // 2. Se houver saldo(s) bancário(s) e houver transações (para pegar a loja e a data)
      if (storeBankBalances && Object.keys(storeBankBalances).length > 0 && txs.length > 0) {
        // Pega os stores únicos 
        const storeDates = new Map<string, string>();
        txs.forEach(t => {
          if (t.target_date) {
            const sId = t.store_id || 'global_account';
            storeDates.set(sId, t.target_date);
          }
        });
        
        // Adiciona as chaves de storeBankBalances que não vieram nas transações (ex: OFX sem lançamentos na data)
        Object.keys(storeBankBalances).forEach(k => {
           if (!storeDates.has(k)) {
             storeDates.set(k, txs[0].target_date);
           }
        });
        
        // Fazer upsert para cada store+date com o saldo real do extrato DAQUELA LOJA ESPECIFICA
        for (const [storeKey, targetDate] of storeDates.entries()) {
          const bankBalance = storeBankBalances[storeKey];
          const previousBalance = storePreviousBalances ? storePreviousBalances[storeKey] : undefined;
          
          if (bankBalance !== undefined || previousBalance !== undefined) {
            const realStoreId = storeKey === 'global_account' ? null : storeKey;
            const updatePayload: any = {
              store_id: realStoreId,
              date: targetDate,
              status: 'pending' // status default
            };
            if (bankBalance !== undefined) updatePayload.bank_total = bankBalance;
            if (previousBalance !== undefined) updatePayload.previous_balance = previousBalance;

            await supabase
              .from('reconciliations')
              .upsert(updatePayload, { onConflict: 'store_id, date' });
          }
        }
      }
      
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
      
      return rows.reduce((acc: Record<string, { gross: number; net: number; fee: number }>, row) => {
        if (row.source === 'ofx' || (row.title && row.title.includes('Extrato Bancário'))) {
          return acc; // OFX is handled in useDailyBankBalance
        }
        
        // Pula transações de OS (sistema/patio) antigas se existirem, pois agora o sistema é regido pelas transações reais (Rede)
        if (row.source === 'sistema' || row.source === 'patio') {
          return acc;
        }
        
        const storeId = row.store_id || 'unknown';
        if (!acc[storeId]) acc[storeId] = { gross: 0, net: 0, fee: 0 };
        
        const amount = Number(row.amount || 0);
        const gross = Number(row.gross_amount || amount);
        const fee = Number(row.fee_amount || 0);

        if (row.type === 'in') {
          acc[storeId].gross += gross;
          acc[storeId].net += amount;
          acc[storeId].fee += fee;
        } else if (row.type === 'out') {
          acc[storeId].gross -= gross;
          acc[storeId].net -= amount;
          acc[storeId].fee -= fee;
        }
        
        return acc;
      }, {});
    },
    enabled: !!targetDate,
  });
}


export function useLatestBankBalance() {
  return useQuery({
    queryKey: ['latest-bank-balance'],
    queryFn: async () => {
      // Busca o último bank_total importado por loja (sem restrição de data)
      // para evitar saldo zerado em dias sem novo upload de OFX
      const { data: stores, error: storesErr } = await supabase.from('stores').select('id');
      if (storesErr) throw storesErr;

      const result: Record<string, number> = {};

      await Promise.all(
        (stores || []).map(async (store) => {
          const { data } = await supabase
            .from('reconciliations')
            .select('bank_total')
            .eq('store_id', store.id)
            .not('bank_total', 'is', null)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data?.bank_total) {
            result[store.id] = Number(data.bank_total);
          }
        })
      );

      return result;
    },
  });
}

export function useDailyBankBalance(targetDate: string) {
  return useQuery({
    queryKey: ['daily-bank-balance', targetDate],
    queryFn: async () => {
      // O usuário exigiu que o Saldo OFX seja O SALDO BRUTO DO ARQUIVO (<LEDGERBAL>), sem cálculo matemático de in/out.
      // O saldo bruto é salvo na tabela reconciliations no campo bank_total durante a importação.
      const { data: recData, error: recError } = await supabase
        .from('reconciliations')
        .select('store_id, bank_total')
        .eq('date', targetDate);
        
      if (recError) throw recError;

      // Query OFX transactions for this specific target_date to get the sum of IN and OUT
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('store_id, amount, type')
        .eq('target_date', targetDate)
        .eq('source', 'ofx');
        
      if (txError) throw txError;
      
      const balances: Record<string, { in: number, out: number, rawBalance: number }> = {};

      // Initialize rawBalance from reconciliations
      (recData || []).forEach((row: any) => {
        const storeId = row.store_id || 'GLOBAL';
        if (!balances[storeId]) balances[storeId] = { in: 0, out: 0, rawBalance: 0 };
        balances[storeId].rawBalance = Number(row.bank_total || 0);
      });

      // Sum in and out from transactions
      (txData || []).forEach((row: any) => {
        const storeId = row.store_id || 'GLOBAL';
        if (!balances[storeId]) balances[storeId] = { in: 0, out: 0, rawBalance: 0 };
        
        const amt = Number(row.amount || 0);
        if (row.type === 'in') balances[storeId].in += amt;
        if (row.type === 'out') balances[storeId].out += amt;
      });

      return balances;
    },
    enabled: !!targetDate,
  });
}

