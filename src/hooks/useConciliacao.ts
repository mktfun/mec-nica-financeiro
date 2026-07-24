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

/**
 * Função de busca de subconjunto com soma exata (Subset-Sum / Backtracking)
 * Encontra até maxDepth elementos em candidates cuja soma seja igual a targetAmount (+- TOLERANCE)
 */
function findExactSubsetMatch(
  targetAmount: number,
  candidates: any[],
  maxDepth = 6
): any[] | null {
  const TOLERANCE = 0.05;

  function backtrack(
    startIndex: number,
    currentSum: number,
    currentSubset: any[]
  ): any[] | null {
    if (Math.abs(currentSum - targetAmount) <= TOLERANCE) {
      return currentSubset;
    }
    if (currentSum > targetAmount + TOLERANCE || currentSubset.length >= maxDepth) {
      return null;
    }

    for (let i = startIndex; i < candidates.length; i++) {
      const candidate = candidates[i];
      const result = backtrack(
        i + 1,
        currentSum + candidate.amount,
        [...currentSubset, candidate]
      );
      if (result) return result;
    }

    return null;
  }

  return backtrack(0, 0, []);
}

export function useReconciliationViews(storeId: string, date: string) {
  return useQuery({
    queryKey: ['reconciliation_views', storeId, date],
    queryFn: async () => {
      // Calcular datas D-1 e D-2 para contextualização temporal
      const targetDateObj = new Date(date);
      const d1Obj = new Date(targetDateObj.getTime() - 86400000);
      const d2Obj = new Date(targetDateObj.getTime() - 86400000 * 2);
      const d1Str = d1Obj.toISOString().split('T')[0];
      const d2Str = d2Obj.toISOString().split('T')[0];

      // Buscar transações de D0, D-1 e D-2 para a loja
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .in('target_date', [date, d1Str, d2Str]);

      if (txsErr) throw txsErr;

      // Buscar TODAS as OSs da loja
      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      if (patioErr) console.warn("Aviso patio_os:", patioErr);

      const { data: matches, error: matchesErr } = await supabase
        .from('conciliation_matches')
        .select('*')
        .eq('store_id', storeId)
        .in('target_date', [date, d1Str, d2Str]);

      if (matchesErr) console.warn("Aviso matches:", matchesErr);

      const allRedeTxs = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const d0RedeTxs = allRedeTxs.filter(t => t.target_date === date);
      const taxaTransactions = txs?.filter(t => t.source === 'rede_taxa' && t.target_date === date) || [];

      const usedTaxas = new Set<string>();

      // ABA 1: OS vs Maquininha (D0)
      const osVsRede = d0RedeTxs.map(redeTx => {
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

      // ABA 2: Maquininha vs Banco OFX (MOTOR MULTICAMADAS COM SUBSET-SUM E D-1)
      const d0OfxIn = txs?.filter(t => t.source === 'ofx' && t.target_date === date && t.amount > 0) || [];
      
      const isAdquirente = (title: string, subtitle?: string) => {
         const txt = `${title || ''} ${subtitle || ''}`.toUpperCase();
         return txt.includes('REDE') || txt.includes('REDECARD') || txt.includes('MAST') || 
                txt.includes('VISA') || txt.includes('ELO') || txt.includes('PAGAMENTO S.A.') ||
                txt.includes('ADQUIRENTE') || txt.includes('CARTAO');
      };

      const adquirenteOfx = d0OfxIn.filter(t => isAdquirente(t.title || '', t.subtitle));
      const outrasOfx = d0OfxIn.filter(t => !isAdquirente(t.title || '', t.subtitle));

      const poolRedeTxs = [...allRedeTxs]; // Pool contendo vendas D0, D-1, D-2
      const depositGroups: any[] = [];
      const unmatchedAlerts: any[] = [];

      // PASSAGEM DE PAREAMENTO EM 4 CAMADAS
      adquirenteOfx.forEach(ofxTx => {
         const targetVal = ofxTx.amount;

         // --- CAMADA 1: Exact 1:1 Match ---
         const exactOneIndex = poolRedeTxs.findIndex(r => Math.abs(r.amount - targetVal) <= 0.05);
         if (exactOneIndex !== -1) {
            const matchedTx = poolRedeTxs.splice(exactOneIndex, 1)[0];
            depositGroups.push({
               ofxDeposit: {
                  id: ofxTx.id,
                  title: ofxTx.title || ofxTx.subtitle,
                  amount: ofxTx.amount,
                  occurred_at: ofxTx.occurred_at
               },
               childRedeTxs: [{ id: matchedTx.id, title: matchedTx.title, amount: matchedTx.amount, payment_method: matchedTx.payment_method, target_date: matchedTx.target_date }],
               totalChildAmount: matchedTx.amount,
               isMatched: true,
               groupDelta: 0,
               matchType: matchedTx.target_date === date ? '1:1 Exato' : `1:1 Exato (${matchedTx.target_date === d1Str ? 'D-1' : 'D-2'})`,
               layer: 'CAMADA_1'
            });
            return;
         }

         // --- CAMADA 2: Subset-Sum Combinatório N:1 (Mesmo dia D0) ---
         const d0Candidates = poolRedeTxs.filter(r => r.target_date === date);
         const subsetMatchD0 = findExactSubsetMatch(targetVal, d0Candidates, 6);

         if (subsetMatchD0 && subsetMatchD0.length > 0) {
            // Remover da pool os selecionados
            subsetMatchD0.forEach(c => {
               const idx = poolRedeTxs.findIndex(r => r.id === c.id);
               if (idx !== -1) poolRedeTxs.splice(idx, 1);
            });

            const totalSum = subsetMatchD0.reduce((acc, item) => acc + item.amount, 0);

            depositGroups.push({
               ofxDeposit: {
                  id: ofxTx.id,
                  title: ofxTx.title || ofxTx.subtitle,
                  amount: ofxTx.amount,
                  occurred_at: ofxTx.occurred_at
               },
               childRedeTxs: subsetMatchD0.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method, target_date: t.target_date })),
               totalChildAmount: totalSum,
               isMatched: true,
               groupDelta: targetVal - totalSum,
               matchType: `Combinação Exata (${subsetMatchD0.length} Vendas)`,
               layer: 'CAMADA_2'
            });
            return;
         }

         // --- CAMADA 3: Busca Temporal Estendida (D-1 / D-2) ---
         const subsetMatchTemporal = findExactSubsetMatch(targetVal, poolRedeTxs, 6);
         if (subsetMatchTemporal && subsetMatchTemporal.length > 0) {
            subsetMatchTemporal.forEach(c => {
               const idx = poolRedeTxs.findIndex(r => r.id === c.id);
               if (idx !== -1) poolRedeTxs.splice(idx, 1);
            });

            const totalSum = subsetMatchTemporal.reduce((acc, item) => acc + item.amount, 0);

            depositGroups.push({
               ofxDeposit: {
                  id: ofxTx.id,
                  title: ofxTx.title || ofxTx.subtitle,
                  amount: ofxTx.amount,
                  occurred_at: ofxTx.occurred_at
               },
               childRedeTxs: subsetMatchTemporal.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method, target_date: t.target_date })),
               totalChildAmount: totalSum,
               isMatched: true,
               groupDelta: targetVal - totalSum,
               matchType: 'Combinação Temporal (D-1 / D-2)',
               layer: 'CAMADA_3'
            });
            return;
         }

         // --- CAMADA 4: Não Pareado (Encaminhado para Alerta de Exceção) ---
         depositGroups.push({
            ofxDeposit: {
               id: ofxTx.id,
               title: ofxTx.title || ofxTx.subtitle,
               amount: ofxTx.amount,
               occurred_at: ofxTx.occurred_at
            },
            childRedeTxs: [],
            totalChildAmount: 0,
            isMatched: false,
            groupDelta: ofxTx.amount,
            matchType: 'Pendente de Revisão',
            layer: 'CAMADA_4_EXCECAO'
         });

         unmatchedAlerts.push({
            type: 'DEPOSITO_SEM_VENDA',
            title: ofxTx.title || ofxTx.subtitle,
            amount: ofxTx.amount,
            occurred_at: ofxTx.occurred_at,
            reason: 'Nenhuma combinação de vendas da maquininha corresponde a este depósito.'
         });
      });

      // Adicionar vendas da maquininha D0 que sobraram sem depósito para os Alertas
      const unassignedD0Rede = poolRedeTxs.filter(r => r.target_date === date);
      unassignedD0Rede.forEach(r => {
         unmatchedAlerts.push({
            type: 'VENDA_SEM_DEPOSITO',
            title: r.title,
            amount: r.amount,
            occurred_at: r.occurred_at,
            reason: 'Venda de cartão processada na maquininha sem depósito correspondente no extrato bancário.'
         });
      });

      const redeVsOfx = {
         rede: d0RedeTxs.map(t => ({ id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method })),
         ofx: adquirenteOfx.map(t => ({ id: t.id, title: t.title || t.subtitle, amount: t.amount })),
         depositGroups,
         unassignedRedeTxs: unassignedD0Rede,
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

      // Agrupamento de PIX com Subset-Sum / Exact match
      const pixGroups = ofxPixList.map(ofxPix => {
         const matchedOs = osPixList.find(os => Math.abs(os.amount - ofxPix.amount) < 0.05);
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

      const ofxSemMatch = d0OfxIn.filter(t => 
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
        ofxSemMatch,
        unmatchedAlerts
      };
    }
  });
}
