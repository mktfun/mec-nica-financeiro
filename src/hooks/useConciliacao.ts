import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ReconciliationRow } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';

export function useConciliacaoDetalhes(date?: string) {
  const targetDate = date ?? getDefaultDate();
  return useQuery({
    queryKey: ['reconciliations', 'details', targetDate],
    queryFn: async () => {
      const [year, month] = targetDate.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const end = new Date(Number(year), Number(month), 0);
      const endOfMonth = `${year}-${month}-${String(end.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('store_id');
      if (error) throw error;
      
      const rows = data as ReconciliationRow[];
      
      // Agrupar por store_id para retornar soma mensal
      const aggregated = rows.reduce((acc, row) => {
        if (!acc[row.store_id]) {
          acc[row.store_id] = { ...row, os_total: 0, financial_total: 0, divergence: 0, status: 'approved' };
        }
        acc[row.store_id].os_total = (acc[row.store_id].os_total || 0) + (row.os_total || 0);
        acc[row.store_id].financial_total = (acc[row.store_id].financial_total || 0) + (row.financial_total || 0);
        acc[row.store_id].divergence = (acc[row.store_id].divergence || 0) + (row.divergence || 0);
        
        if (row.status === 'divergence') acc[row.store_id].status = 'divergence';
        else if (row.status === 'pending' && acc[row.store_id].status !== 'divergence') acc[row.store_id].status = 'pending';
        return acc;
      }, {} as Record<string, ReconciliationRow>);

      return Object.values(aggregated);
    },
  });
}

export function useConciliacaoResumo(date?: string) {
  const targetDate = date ?? getDefaultDate();
  return useQuery({
    queryKey: ['reconciliations', 'resumo', targetDate],
    queryFn: async () => {
      const [year, month] = targetDate.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const end = new Date(Number(year), Number(month), 0);
      const endOfMonth = `${year}-${month}-${String(end.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
      if (error) throw error;

      const rows = data as ReconciliationRow[];
      // Entradas do Dia (Dashboard) agora usa os_total para mostrar todo o faturamento da OS
      const totalIn = rows.reduce((s, r) => s + (r.os_total ?? 0), 0);
      const totalDivergence = rows.reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);
      const resultado = rows.reduce((s, r) => s + (r.divergence ?? 0), 0);
      
      // Contar status únicos por loja
      const storeStatus = rows.reduce((acc, row) => {
        if (!acc[row.store_id]) {
          acc[row.store_id] = 'approved';
        }
        if (row.status === 'divergence') acc[row.store_id] = 'divergence';
        else if (row.status === 'pending' && acc[row.store_id] !== 'divergence') acc[row.store_id] = 'pending';
        return acc;
      }, {} as Record<string, string>);

      const statusArray = Object.values(storeStatus);
      const approved = statusArray.filter(s => s === 'approved').length;
      const divergence = statusArray.filter(s => s === 'divergence').length;
      
      // pendentes: podemos dizer que se a loja não teve fechamento ou está pending, é pendente.
      // O Dashboard sabe o total de lojas cadastradas (stores.length). 
      // Então pending será (Total de Lojas - approved - divergence) lá no UI, 
      // Aqui só devolvemos o 'approved' e 'divergence' das que tiveram movimento, e 'pending' das que tem movimento mas tão pending
      const pending = statusArray.filter(s => s === 'pending').length;

      return { totalIn, totalDivergence, resultado, approved, divergence, pending, rows };
    },
  });
}

// Auxiliary function to calculate reconciliation status
const calculateReconciliationStatus = (financialTotal: number, dailyCash: number) => {
  const divergence = financialTotal - dailyCash;
  let status: 'approved' | 'divergence' | 'pending' = 'pending';
  
  if (financialTotal > 0 && dailyCash >= 0) {
    if (Math.abs(divergence) < 0.01) {
      status = 'approved';
    } else {
      status = 'divergence';
    }
  }
  
  return { divergence, status };
};

export function useSaveDailyCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, value, date }: { storeId: string; value: number; date?: string }) => {
      const targetDate = date ?? getDefaultDate();
      
      // Fetch existing row to calculate divergence properly
      const { data: existing } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId)
        .eq('date', targetDate)
        .maybeSingle();
        
      const financialTotal = existing?.financial_total || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, value);

      const { error } = await supabase
        .from('reconciliations')
        .upsert({ 
          store_id: storeId, 
          date: targetDate, 
          daily_cash: value,
          divergence,
          status
        }, { onConflict: 'store_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });
}

export function useSaveImportedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, date, osTotal, financialTotal }: { storeId: string; date?: string; osTotal: number; financialTotal: number }) => {
      const targetDate = date ?? getDefaultDate();
      
      // Fetch existing row to preserve daily_cash and calculate divergence
      const { data: existing } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId)
        .eq('date', targetDate)
        .maybeSingle();
        
      const dailyCash = existing?.daily_cash || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, dailyCash);

      const { error } = await supabase
        .from('reconciliations')
        .upsert({ 
          store_id: storeId, 
          date: targetDate, 
          os_total: osTotal,
          financial_total: financialTotal,
          divergence,
          status
        }, { onConflict: 'store_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });
}

export function useHistorico(limit = 30) {
  return useQuery({
    queryKey: ['reconciliations', 'history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('date, status, financial_total, divergence, os_count, store_id')
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useStoreHistory(storeId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['reconciliations', 'history', storeId, limit],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId!)
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ReconciliationRow[];
    },
  });
}
export function useConciliacaoDiaria(date: string) {
  return useQuery({
    queryKey: ['reconciliations', 'diaria', date],
    queryFn: async () => {
      // 1. Fetch reconciliations for the exact date
      const { data: recData, error: recError } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', date);
      if (recError) throw recError;
      const reconciliations = recData as ReconciliationRow[];

      // 2. Fetch transactions for the exact date (to check for cash)
      // Since transactions might use created_at as timestamp, we need to filter between start and end of day.
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('store_id, payment_method, amount, type')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);
      if (txError) throw txError;

      // 3. Fetch open OSs from patio
      const { data: osData, error: osError } = await supabase
        .from('patio_os')
        .select('store_id, status, payment_method')
        .in('status', ['em_aberto', 'pago_parcial']);
      if (osError) throw osError;

      // Process results per store
      const storeMap: Record<string, any> = {};
      
      // Initialize with reconciliations
      reconciliations.forEach(rec => {
        storeMap[rec.store_id] = {
          ...rec,
          expects_cash: false,
          has_transactions: false
        };
      });

      // Check transactions for cash
      txData?.forEach(tx => {
        if (!storeMap[tx.store_id]) {
          storeMap[tx.store_id] = { store_id: tx.store_id, expects_cash: false, has_transactions: true, status: 'pending', os_total: 0, financial_total: 0, divergence: 0, daily_cash: 0 };
        }
        storeMap[tx.store_id].has_transactions = true;
        if (tx.payment_method?.toLowerCase() === 'dinheiro' || tx.payment_method?.toLowerCase() === 'espécie') {
          storeMap[tx.store_id].expects_cash = true;
        }
      });

      // Check open OSs for cash
      osData?.forEach(os => {
        if (!storeMap[os.store_id]) {
          storeMap[os.store_id] = { store_id: os.store_id, expects_cash: false, has_transactions: false, status: 'pending', os_total: 0, financial_total: 0, divergence: 0, daily_cash: 0 };
        }
        // If it's open, maybe they will pay in cash today. So we expect cash input just in case.
        // The user said: "apenas pras lojsa que tem os aberta ou ate msm fechada ou pga parcial, que tem dinheiro em reais na os"
        storeMap[os.store_id].expects_cash = true;
      });

      return storeMap;
    }
  });
}
