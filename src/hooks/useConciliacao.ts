import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ReconciliationRow } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';

export function useConciliacaoDetalhes(date?: string) {
  const targetDate = date ?? getDefaultDate();
  return useQuery({
    queryKey: ['reconciliations', 'details', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', targetDate)
        .order('store_id');
      if (error) throw error;
      
      const rows = data as ReconciliationRow[];
      return rows;
    },
  });
}

export function useConciliacaoResumo(date?: string) {
  const targetDate = date ?? getDefaultDate();
  return useQuery({
    queryKey: ['reconciliations', 'resumo', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', targetDate);
      if (error) throw error;

      const rows = data as ReconciliationRow[];
      const totalIn = rows.reduce((s, r) => s + (r.os_total ?? 0), 0);
      const totalDivergence = rows.reduce((s, r) => s + Math.abs(r.divergence ?? 0), 0);
      const resultado = rows.reduce((s, r) => s + (r.divergence ?? 0), 0);
      
      const approved = rows.filter(r => r.status === 'approved').length;
      const divergence = rows.filter(r => r.status === 'divergence').length;
      const pending = rows.filter(r => r.status === 'pending').length;

      return { totalIn, totalDivergence, resultado, approved, divergence, pending, rows };
    },
  });
}

// Auxiliary function to calculate reconciliation status
const calculateReconciliationStatus = (financialTotal: number, dailyCash: number, machineTotal: number = 0) => {
  const divergence = financialTotal - (dailyCash + machineTotal);
  let status: 'approved' | 'divergence' | 'pending' = 'pending';
  
  if (financialTotal > 0 && (dailyCash >= 0 || machineTotal >= 0)) {
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
      const machineTotal = existing?.machine_total || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, value, machineTotal);

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
    mutationFn: async ({ storeId, date, osTotal, financialTotal, bankTotal }: { storeId: string; date?: string; osTotal: number; financialTotal: number; bankTotal?: number }) => {
      const targetDate = date ?? getDefaultDate();
      
      // Fetch existing row to preserve daily_cash and calculate divergence
      const { data: existing } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId)
        .eq('date', targetDate)
        .maybeSingle();
        
      const dailyCash = existing?.daily_cash || 0;
      const machineTotal = existing?.machine_total || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, dailyCash, machineTotal);

      const upsertData: any = { 
        store_id: storeId, 
        date: targetDate, 
        os_total: osTotal,
        financial_total: financialTotal,
        divergence,
        status
      };

      if (bankTotal !== undefined) {
        upsertData.bank_total = bankTotal;
      }

      const { error } = await supabase
        .from('reconciliations')
        .upsert(upsertData, { onConflict: 'store_id,date' });
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

export function useSaveMachineTotal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, machineTotal, date }: { storeId: string; machineTotal: number; date: string }) => {
      const { data: existing } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId)
        .eq('date', date)
        .maybeSingle();
        
      const financialTotal = existing?.financial_total || 0;
      const dailyCash = existing?.daily_cash || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, dailyCash, machineTotal);

      const { error } = await supabase
        .from('reconciliations')
        .upsert({ 
          store_id: storeId, 
          date: date, 
          machine_total: machineTotal,
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

      // 2. Fetch transactions for the exact target date (to check for cash)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('store_id, payment_method, amount, type')
        .eq('target_date', date);
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

export function useSaveBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, date, bankDivergence, machineFees, ofxImported }: { storeId: string; date: string; bankDivergence: number; machineFees: number; ofxImported: boolean }) => {
      const { data: existing } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('store_id', storeId)
        .eq('date', date)
        .maybeSingle();
        
      // Recalculate status if necessary, or preserve existing logic
      const financialTotal = existing?.financial_total || 0;
      const dailyCash = existing?.daily_cash || 0;
      const machineTotal = existing?.machine_total || 0;
      const { divergence, status } = calculateReconciliationStatus(financialTotal, dailyCash, machineTotal);

      const { error } = await supabase
        .from('reconciliations')
        .upsert({ 
          store_id: storeId, 
          date: date, 
          bank_divergence: bankDivergence,
          machine_fees: machineFees,
          ofx_imported: ofxImported,
          // Preserve existing necessary fields
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

export function useSystemTransactions(date: string) {
  return useQuery({
    queryKey: ['system-transactions', date],
    queryFn: async () => {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);
      if (error) throw error;
      
      // Map to SystemTransaction interface
      return (data || []).map(t => ({
        id: t.id,
        amount: t.amount,
        date: new Date(t.created_at),
        description: t.description,
        store_id: t.store_id
      }));
    }
  });
}

export function useDailyReconciliationDelta(targetDate: string) {
  return useQuery({
    queryKey: ['reconciliation-delta', targetDate],
    queryFn: async () => {
      const startOfDay = `${targetDate}T00:00:00.000Z`;
      const endOfDay = `${targetDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('transactions')
        .select('store_id, amount, type, source')
        .gte('occurred_at', startOfDay)
        .lte('occurred_at', endOfDay);

      if (error) throw error;

      const deltas: Record<string, { bancoDelta: number; sistemaDelta: number }> = {};

      for (const tx of data || []) {
        const sid = tx.store_id;
        if (!sid) continue;
        if (!deltas[sid]) {
          deltas[sid] = { bancoDelta: 0, sistemaDelta: 0 };
        }
        const val = tx.type === 'in' ? Number(tx.amount) : -Number(tx.amount);
        // ofx is strictly 'ofx', everything else is considered 'sistema' (patio, despesa, maquininha)
        if (tx.source === 'ofx') {
          deltas[sid].bancoDelta += val;
        } else {
          deltas[sid].sistemaDelta += val;
        }
      }

      return deltas;
    }
  });
}

// ─── Visualização das 3 Tabelas de Conciliação ────────────────────────────────────
export function useReconciliationViews(storeId: string, date: string) {
  return useQuery({
    queryKey: ['reconciliation-views', storeId, date],
    enabled: !!storeId && !!date,
    queryFn: async () => {
      const { data: patioOs } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      const { data: matches } = await supabase
        .from('conciliation_matches')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date);

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date)
        .in('source', ['rede', 'rede_taxa', 'ofx', 'maquininha']);

      const txMap = new Map(txs?.map(t => [t.id, t]));
      
      const matchByOs: Record<string, any> = {};
      matches?.forEach(m => {
        if (!m.system_os_number) return;
        if (!matchByOs[m.system_os_number]) {
          matchByOs[m.system_os_number] = { redeTxs: [], ofxTxs: [] };
        }
        if (m.rede_transaction_id && txMap.has(m.rede_transaction_id)) {
           matchByOs[m.system_os_number].redeTxs.push(txMap.get(m.rede_transaction_id));
        }
        if (m.ofx_transaction_id && txMap.has(m.ofx_transaction_id)) {
           matchByOs[m.system_os_number].ofxTxs.push(txMap.get(m.ofx_transaction_id));
        }
      });

      const redeTransactions = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const taxaTransactions = txs?.filter(t => t.source === 'rede_taxa') || [];

      // Marcamos as taxas já usadas para não duplicar se houver várias sem OS
      const usedTaxas = new Set();

      const osVsRede = redeTransactions.map(redeTx => {
         let taxaTx = null;
         if (redeTx.os_number) {
            taxaTx = taxaTransactions.find(taxa => taxa.os_number === redeTx.os_number && !usedTaxas.has(taxa.id));
         } else {
            taxaTx = taxaTransactions.find(taxa => !taxa.os_number && !usedTaxas.has(taxa.id) && taxa.occurred_at === redeTx.occurred_at);
         }
         if (taxaTx) usedTaxas.add(taxaTx.id);
         
         const redeBruto = redeTx.amount + (taxaTx ? Math.abs(taxaTx.amount) : 0);
         
         let osFaturamento = 0;
         let osNumber = redeTx.os_number;
         
         if (!osNumber) {
            const match = matches?.find(m => m.rede_transaction_id === redeTx.id);
            if (match && match.system_os_number) {
               osNumber = match.system_os_number;
            }
         }
         
         if (osNumber) {
            const cleanOsNumber = String(osNumber).replace(/^[^-]+_/, '').trim();
            const osInfo = patioOs?.find(o => 
               String(o.os_number).trim() === cleanOsNumber || 
               String(o.os_number).trim() === String(osNumber).trim() ||
               String(osNumber).endsWith(`_${o.os_number}`)
            );
            if (osInfo) {
               osFaturamento = osInfo.paid_value !== undefined && osInfo.paid_value !== null ? osInfo.paid_value : (osInfo.total_value || 0);
            }
         }
         
         const delta = osNumber ? (osFaturamento - redeBruto) : 0;
         
         return {
            maquininha_title: redeTx.title || 'Transação Maquininha',
            rede_bruto: redeBruto,
            os_total: osFaturamento,
            os_number: osNumber || 'Não Localizada',
            delta,
            status: osNumber ? (Math.abs(delta) < 1.0 ? 'PAREADO' : 'COM_DELTA') : 'SEM_PAR'
         };
      });

      const redeTxsForOfx = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const ofxTxsForRede = txs?.filter(t => t.source === 'ofx' && t.amount > 0) || [];
      
      const isAdquirente = (title: string, subtitle?: string) => {
         const txt = `${title || ''} ${subtitle || ''}`.toUpperCase();
         return txt.includes('REDE') || txt.includes('REDECARD') || txt.includes('MAST') || 
                txt.includes('VISA') || txt.includes('ELO') || txt.includes('PAGAMENTO S.A.') ||
                txt.includes('ADQUIRENTE') || txt.includes('CARTAO');
      };

      const adquirenteOfx = ofxTxsForRede.filter(t => isAdquirente(t.title || '', t.subtitle));
      const outrasOfx = ofxTxsForRede.filter(t => !isAdquirente(t.title || '', t.subtitle));

      const redeVsOfx = {
         rede: redeTxsForOfx.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method })),
         ofx: adquirenteOfx.map(t => ({ id: t.id, title: t.title || t.subtitle, amount: t.amount })),
         outrasOfx: outrasOfx.map(t => ({ id: t.id, title: t.title || t.subtitle, amount: t.amount }))
      };

      const matchedOfxIds = new Set(matches?.filter(m => m.ofx_transaction_id).map(m => m.ofx_transaction_id));
      const ofxSemMatch = txs?.filter(t => t.source === 'ofx' && Number(t.amount) > 0 && !matchedOfxIds.has(t.id)).map(t => ({
         id: t.id,
         title: t.title,
         subtitle: t.subtitle,
         amount: t.amount,
         occurred_at: t.occurred_at
      })) || [];

      return {
        osVsRede,
        redeVsOfx,
        ofxSemMatch
      };
    }
  });
}
