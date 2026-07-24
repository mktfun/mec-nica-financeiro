import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ConciliacaoResumo {
  date: string;
  totalSystemOS: number;
  totalRedeNet: number;
  totalOfxIn: number;
  totalOfxOut: number;
  totalDivergence: number;
  approved: number;
}

export function useConciliacaoResumo(date: string) {
  return useQuery({
    queryKey: ['conciliacao_resumo', date],
    queryFn: async (): Promise<ConciliacaoResumo> => {
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', date);

      if (txsErr) throw txsErr;

      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*');

      if (patioErr) console.warn("Aviso ao carregar patio_os:", patioErr);

      const totalSystemOS = patioOs?.reduce((acc, os) => {
        const val = os.paid_value !== undefined && os.paid_value !== null ? os.paid_value : (os.total_value || 0);
        return acc + Number(val);
      }, 0) || 0;

      const totalRedeNet = txs
        ?.filter(t => t.source === 'rede' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalOfxIn = txs
        ?.filter(t => t.source === 'ofx' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalOfxOut = txs
        ?.filter(t => t.source === 'ofx' && t.type === 'out')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalDivergence = Math.abs(totalSystemOS - totalOfxIn);

      return {
        date,
        totalSystemOS,
        totalRedeNet,
        totalOfxIn,
        totalOfxOut,
        totalDivergence,
        approved: totalDivergence < 1.0 ? 1 : 0
      };
    }
  });
}

export function useConciliacaoDetalhes(date: string) {
  return useQuery({
    queryKey: ['conciliacao_detalhes', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('target_date', date);

      if (error) throw error;
      return data || [];
    }
  });
}

export function useSaveImportedReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { store_id: string; store_name: string; target_date: string; total_os: number; os_count: number; total_paid_all: number; receivables_count: number }) => {
      const { data, error } = await supabase.from('import_logs').upsert([payload], { onConflict: 'store_id,target_date' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_logs'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao_detalhes'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao_resumo'] });
    }
  });
}

export function useStoreHistory(storeId: string) {
  return useQuery({
    queryKey: ['store_history', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('target_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
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
      
      return (data || []).map(t => ({
        id: t.id,
        amount: t.amount,
        date: new Date(t.created_at),
        description: t.description || t.title,
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

export function useReconciliationViews(storeId: string, date: string) {
  return useQuery({
    queryKey: ['reconciliation_views', storeId, date],
    queryFn: async () => {
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date);

      if (txsErr) throw txsErr;

      // Buscar TODAS as OSs da loja sem restrição rígida de data única
      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      if (patioErr) console.warn("Aviso patio_os:", patioErr);

      const { data: matches, error: matchesErr } = await supabase
        .from('conciliation_matches')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date);

      if (matchesErr) console.warn("Aviso matches:", matchesErr);

      const redeTransactions = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const taxaTransactions = txs?.filter(t => t.source === 'rede_taxa') || [];

      const usedTaxas = new Set<string>();

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
         let osData: any = null;
         
         if (!osNumber) {
            const match = matches?.find(m => m.rede_transaction_id === redeTx.id);
            if (match && match.system_os_number) {
               osNumber = match.system_os_number;
            }
         }
         
         if (osNumber) {
            const cleanOsNumber = String(osNumber).replace(/^[^-]+_/, '').trim();
            osData = patioOs?.find(o => 
               String(o.os_number).trim() === cleanOsNumber || 
               String(o.os_number).trim() === String(osNumber).trim() ||
               String(osNumber).endsWith(`_${o.os_number}`)
            );
            if (osData) {
               const totalOsValue = osData.paid_value !== undefined && osData.paid_value !== null ? osData.paid_value : (osData.total_value || 0);
               const creditRatio = (osData.parsed_credit_debit || 0) / (totalOsValue || 1);
               osFaturamento = creditRatio > 0 ? (totalOsValue * creditRatio) : totalOsValue;
            }
         }
         
         const delta = osNumber ? (osFaturamento - redeBruto) : 0;
         
         return {
            id: redeTx.id,
            maquininha_title: redeTx.title || 'Transação Maquininha',
            rede_bruto: redeBruto,
            os_total: osFaturamento,
            os_number: osNumber || 'Não Localizada',
            os_data: osData,
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

      // AGRUPAMENTO DE MAQUININHAS POR DEPÓSITO BANCÁRIO OFX
      const availableRedeTxs = [...redeTxsForOfx];
      const depositGroups = adquirenteOfx.map(ofxTx => {
         const targetAmount = ofxTx.amount;
         const childTxs: any[] = [];
         let accumulated = 0;

         // Tenta encontrar grupo de vendas da maquininha cuja soma seja igual ao depósito OFX
         for (let i = 0; i < availableRedeTxs.length; i++) {
            const rTx = availableRedeTxs[i];
            if (accumulated + rTx.amount <= targetAmount + 0.5) {
               childTxs.push(rTx);
               accumulated += rTx.amount;
               if (Math.abs(accumulated - targetAmount) < 1.0) break;
            }
         }

         // Remove da lista de disponíveis os itens atribuídos
         childTxs.forEach(c => {
            const idx = availableRedeTxs.findIndex(r => r.id === c.id);
            if (idx !== -1) availableRedeTxs.splice(idx, 1);
         });

         const groupDelta = targetAmount - accumulated;

         return {
            ofxDeposit: {
               id: ofxTx.id,
               title: ofxTx.title || ofxTx.subtitle,
               amount: ofxTx.amount,
               occurred_at: ofxTx.occurred_at
            },
            childRedeTxs: childTxs.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method })),
            totalChildAmount: accumulated,
            isMatched: Math.abs(groupDelta) < 1.0,
            groupDelta
         };
      });

      const redeVsOfx = {
         rede: redeTxsForOfx.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method })),
         ofx: adquirenteOfx.map(t => ({ id: t.id, title: t.title || t.subtitle, amount: t.amount })),
         depositGroups,
         unassignedRedeTxs: availableRedeTxs,
         outrasOfx: outrasOfx.map(t => ({ id: t.id, title: t.title || t.subtitle, amount: t.amount }))
      };

      // ABA 3: PIX (OS -> Banco OFX)
      const osPixList: any[] = [];
      patioOs?.forEach(os => {
         const totalVal = os.paid_value !== undefined && os.paid_value !== null ? os.paid_value : (os.total_value || 0);
         const pixRatio = (os.parsed_pix_transfer || 0) / (totalVal || 1);
         const isPixMethod = (os.payment_method || '').toLowerCase().includes('pix') || (os.payment_method || '').toLowerCase().includes('transf');
         
         if (pixRatio > 0 || isPixMethod) {
            const pixVal = pixRatio > 0 ? (totalVal * pixRatio) : totalVal;
            osPixList.push({
               os_number: os.os_number,
               client_name: os.client_name,
               amount: pixVal,
               raw_os: os
            });
         }
      });

      const ofxPixList = outrasOfx.filter(t => {
         const txt = `${t.title || ''} ${t.subtitle || ''}`.toUpperCase();
         return txt.includes('PIX') || txt.includes('TRANSF') || txt.includes('TED') || txt.includes('DOC');
      }).map(t => ({
         id: t.id,
         title: t.title || t.subtitle,
         amount: t.amount,
         occurred_at: t.occurred_at
      }));

      // Agrupamento de PIX por valor/vínculo
      const pixGroups = ofxPixList.map(ofxPix => {
         const matchedOs = osPixList.find(os => Math.abs(os.amount - ofxPix.amount) < 1.0);
         return {
            ofxPix,
            matchedOs,
            isMatched: !!matchedOs
         };
      });

      const pixVsOfx = {
         osPix: osPixList,
         ofxPix: ofxPixList,
         pixGroups
      };

      // ABA 4: Extrato Sem Match
      const matchedOfxIds = new Set(matches?.filter(m => m.ofx_transaction_id).map(m => m.ofx_transaction_id));
      const adquirenteIds = new Set(adquirenteOfx.map(t => t.id));

      const ofxSemMatch = txs?.filter(t => 
         t.source === 'ofx' && 
         Number(t.amount) > 0 && 
         !matchedOfxIds.has(t.id) &&
         !adquirenteIds.has(t.id)
      ).map(t => ({
         id: t.id,
         title: t.title,
         subtitle: t.subtitle,
         amount: t.amount,
         occurred_at: t.occurred_at
      })) || [];

      return {
        osVsRede,
        redeVsOfx,
        pixVsOfx,
        ofxSemMatch
      };
    }
  });
}
