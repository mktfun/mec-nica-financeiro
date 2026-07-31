import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StoreSaldoState } from '@/lib/modulo1Calculations';

const isValidUuid = (str?: string | null) => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

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
      const targetDateObj = new Date(date);
      const searchDates: string[] = [];
      for (let d = 0; d <= 7; d++) {
        const dObj = new Date(targetDateObj.getTime() - d * 86400000);
        searchDates.push(dObj.toISOString().split('T')[0]);
      }

      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .in('target_date', searchDates);

      if (txsErr) throw txsErr;

      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      if (patioErr) console.warn("Aviso patio_os:", patioErr);

      const { data: matches, error: matchesErr } = await supabase
        .from('conciliation_matches')
        .select('*')
        .eq('store_id', storeId);

      if (matchesErr) console.warn("Aviso matches:", matchesErr);

      const matchedOsNumbers = new Set(
        (matches || []).map(m => m.system_os_number).filter(Boolean)
      );

      const candidateOsPool = (patioOs || []).filter(o => 
        o.status !== 'ENTROU' && !matchedOsNumbers.has(o.os_number)
      );

      const allRedeTxs = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const d0RedeTxs = allRedeTxs.filter(t => t.target_date === date);
      const taxaTransactions = txs?.filter(t => t.source === 'rede_taxa' && t.target_date === date) || [];

      const usedTaxas = new Set<string>();

      const osVsRede = d0RedeTxs.map(redeTx => {
         let taxaTx = null;
         if (redeTx.os_number) {
            taxaTx = taxaTransactions.find(taxa => taxa.os_number === redeTx.os_number && !usedTaxas.has(taxa.id));
         } else {
            taxaTx = taxaTransactions.find(taxa => !taxa.os_number && !usedTaxas.has(taxa.id) && taxa.occurred_at === redeTx.occurred_at);
         }
         if (taxaTx) usedTaxas.add(taxaTx.id);
         
         const taxaAmount = taxaTx ? Math.abs(taxaTx.amount) : 0;
         const redeBruto = redeTx.amount + taxaAmount;
         const taxaPercent = redeBruto > 0 ? (taxaAmount / redeBruto) * 100 : 0;
         
         let osFaturamento = 0;
         let osNumber = redeTx.os_number;
         let osData: any = null;
         
         if (!osNumber) {
            const match = matches?.find(m => m.rede_transaction_id === redeTx.id);
            if (match && match.system_os_number) {
               osNumber = match.system_os_number;
            }
         }
         
         if (!osNumber) {
            const candidateByValue = candidateOsPool.find(o => {
               const creditVal = Number(o.credit_debit_value || 0) || Number(o.total_value || 0) || Number(o.paid_value || 0);
               return Math.abs(creditVal - redeBruto) < 1.0;
            });
            if (candidateByValue) {
               osNumber = candidateByValue.os_number;
               osData = candidateByValue;
            }
         }

         if (osNumber && !osData) {
            const cleanOsNumber = String(osNumber).replace(/^[^-]+_/, '').trim();
            osData = patioOs?.find(o => 
               String(o.os_number).trim() === cleanOsNumber || 
               String(o.os_number).trim() === String(osNumber).trim() ||
               String(osNumber).endsWith(`_${o.os_number}`)
            );
         }

         if (osData) {
            const creditVal = Number(osData.credit_debit_value || 0) || Number(osData.total_value || 0) || Number(osData.paid_value || 0);
            osFaturamento = creditVal;
         }
         
         const delta = osNumber ? (osFaturamento - redeBruto) : 0;
         
         return {
            id: redeTx.id,
            maquininha_title: redeTx.title || 'Transação Maquininha',
            rede_bruto: redeBruto,
            taxa_brl: taxaAmount,
            taxa_percent: taxaPercent,
            rede_liquido: redeTx.amount,
            os_total: osFaturamento,
            os_number: osNumber || 'Não Localizada',
            os_data: osData,
            delta,
            status: osNumber ? (Math.abs(delta) < 1.0 ? 'PAREADO' : 'COM_DELTA') : 'SEM_PAR'
         };
      });

      const d0OfxIn = txs?.filter(t => t.source === 'ofx' && t.target_date === date && t.amount > 0) || [];
      
      const isAdquirente = (title: string, subtitle?: string) => {
         const txt = `${title || ''} ${subtitle || ''}`.toUpperCase();
         return txt.includes('REDE') || txt.includes('REDECARD') || txt.includes('MAST') || 
                txt.includes('VISA') || txt.includes('ELO') || txt.includes('PAGAMENTO S.A.') ||
                txt.includes('ADQUIRENTE') || txt.includes('CARTAO');
      };

      const adquirenteOfx = d0OfxIn.filter(t => isAdquirente(t.title || '', t.subtitle));
      const outrasOfx = d0OfxIn.filter(t => !isAdquirente(t.title || '', t.subtitle));

      const poolRedeTxs = [...allRedeTxs];
      const depositGroups: any[] = [];
      const unmatchedAlerts: any[] = [];

      adquirenteOfx.forEach(ofxTx => {
         const targetVal = ofxTx.amount;

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

         const d0Candidates = poolRedeTxs.filter(r => r.target_date === date);
         const subsetMatchD0 = findExactSubsetMatch(targetVal, d0Candidates, 6);

         if (subsetMatchD0 && subsetMatchD0.length > 0) {
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
            id: ofxTx.id,
            type: 'DEPOSITO_SEM_VENDA',
            title: ofxTx.title || ofxTx.subtitle,
            amount: ofxTx.amount,
            occurred_at: ofxTx.occurred_at,
            reason: 'Nenhuma combinação de vendas da maquininha corresponde a este depósito.'
         });
      });

      const unassignedD0Rede = poolRedeTxs.filter(r => r.target_date === date);
      unassignedD0Rede.forEach(r => {
         unmatchedAlerts.push({
            id: r.id,
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

      const osPixList: any[] = [];
      patioOs?.forEach(os => {
         const totalVal = os.paid_value !== undefined && os.paid_value !== null ? os.paid_value : (os.total_value || 0);
         const realPixVal = os.pix_transfer_value !== undefined && os.pix_transfer_value !== null ? os.pix_transfer_value : (os.parsed_pix_transfer || 0);
         const pixRatio = realPixVal / (totalVal || 1);
         const isPixMethod = (os.payment_method || '').toLowerCase().includes('pix') || (os.payment_method || '').toLowerCase().includes('transf');
         
         if (realPixVal > 0 || isPixMethod || pixRatio > 0) {
            const pixVal = realPixVal > 0 ? realPixVal : (pixRatio > 0 ? totalVal * pixRatio : totalVal);
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

export function useModulo1StoresData(date: string) {
  return useQuery({
    queryKey: ['modulo1_stores_data', date],
    queryFn: async (): Promise<StoreSaldoState[]> => {
      const { data: stores, error: storesErr } = await supabase
        .from('stores')
        .select('*');

      if (storesErr) throw storesErr;

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', date);

      const { data: patioOs } = await supabase
        .from('patio_os')
        .select('*');

      const { data: receivables } = await supabase
        .from('receivables')
        .select('*');
      return (stores || []).map(store => {
        const storeTxs = txs?.filter(t => t.store_id === store.id) || [];
        const storeOs = patioOs?.filter(o => o.store_id === store.id) || [];
        const storeRec = receivables?.filter(r => r.store_id === store.id) || [];

        const saldoBancoItau = storeTxs
          .filter(t => t.source === 'ofx' && (t.type === 'in' || Number(t.amount || 0) > 0))
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);

        const cartaoEntrou = storeTxs
          .filter(t => t.source === 'rede' && t.type === 'in')
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);

        // Saldo em aberto real das OSs ativas (total_value - paid_value)
        const naLojaOs = storeOs
          .filter(o => o.status === 'em_aberto' || o.status === 'pago_parcial')
          .reduce((acc, o) => {
            return acc + Math.max(0, Number(o.total_value || 0) - Number(o.paid_value || 0));
          }, 0);

        // 1. Extrair transações PIX/TED do OFX (entrada)
        const ofxPixTxs = storeTxs.filter(t => {
           if (t.source !== 'ofx' || t.type !== 'in') return false;
           const txt = `${t.title || ''} ${t.subtitle || ''}`.toUpperCase();
           return txt.includes('PIX') || txt.includes('TRANSF') || txt.includes('TED') || txt.includes('DOC');
        });

        // 2. Extrair valores declarados como PIX nas OSs
        const osPixList = storeOs.map(os => {
           const totalVal = os.paid_value !== undefined && os.paid_value !== null ? os.paid_value : (os.total_value || 0);
           const realPixVal = (os as any).pix_transfer_value !== undefined && (os as any).pix_transfer_value !== null ? (os as any).pix_transfer_value : ((os as any).parsed_pix_transfer || 0);
           const pixRatio = realPixVal / (totalVal || 1);
           const isPixMethod = (os.payment_method || '').toLowerCase().includes('pix') || (os.payment_method || '').toLowerCase().includes('transf');
           
           if (realPixVal > 0 || isPixMethod || pixRatio > 0) {
              return realPixVal > 0 ? realPixVal : (pixRatio > 0 ? totalVal * pixRatio : totalVal);
           }
           return 0;
        }).filter(v => v > 0);

        // 3. Cruzar OFX com OS (Match)
        let pixOsMatched = 0;
        ofxPixTxs.forEach(ofxPix => {
           const amt = Number(ofxPix.amount || 0);
           const matchIdx = osPixList.findIndex(osVal => Math.abs(osVal - amt) < 0.05);
           if (matchIdx !== -1) {
              pixOsMatched += amt;
              // Remove para não dar match duplo
              osPixList.splice(matchIdx, 1);
           }
        });

        const faturamentoAtual = cartaoEntrou + pixOsMatched;

        const aReceber = storeRec
          .filter(r => r.status === 'pendente')
          .reduce((acc, r) => acc + Number(r.value || 0), 0);

        return {
          store_id: store.id,
          store_name: store.name,
          saldo_banco_itau: saldoBancoItau,
          limite_credito: (store as any).credit_limit || 0,
          cartao_entrou: cartaoEntrou,
          cartao_nao_entrou: 0,
          dinheiro_loja: 0,
          a_receber: aReceber,
          na_loja_os: naLojaOs,
          pix_os: pixOsMatched,
          faturamento_atual: faturamentoAtual,
          faturamento_anterior: faturamentoAtual * 0.9,
          seguro_sinistro: 0,
          juros_atual: 0,
          caixa_anterior: (store as any).previous_caixa || 0,
          valor_contas: 0
        };
      });
    }
  });
}

export function useUpdateOsStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, osNumber, storeId, targetDate, newStatus }: {
      osId: string;
      osNumber: string;
      storeId: string;
      targetDate: string;
      newStatus: 'ENTROU' | 'finalizado' | 'em_aberto';
    }) => {
      const { data, error } = await supabase
        .from('patio_os')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', osId);

      if (error) throw error;

      if (newStatus === 'ENTROU') {
        await supabase.from('conciliation_matches').upsert([{
          store_id: storeId,
          system_os_number: osNumber,
          target_date: targetDate,
          status: 'APPROVED',
          match_type: 'MANUAL_OVERRIDE'
        }], { onConflict: 'store_id,system_os_number' });
      } else {
        await supabase.from('conciliation_matches')
          .delete()
          .eq('store_id', storeId)
          .eq('system_os_number', osNumber);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      queryClient.invalidateQueries({ queryKey: ['modulo1_stores_data'] });
      queryClient.invalidateQueries({ queryKey: ['patio_os'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao_resumo'] });
    }
  });
}

export function useResolveUnmatchedAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, targetDate, txId, reason }: {
      storeId: string;
      targetDate: string;
      txId: string;
      reason?: string;
    }) => {
      const safeOfxId = isValidUuid(txId) ? txId : null;

      const { data, error } = await supabase
        .from('conciliation_matches')
        .insert([{
          store_id: storeId,
          target_date: targetDate,
          ofx_transaction_id: safeOfxId,
          status: 'APPROVED',
          match_type: 'MANUAL_OVERRIDE',
          notes: reason || 'Resolvido manualmente pelo operador'
        }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      queryClient.invalidateQueries({ queryKey: ['modulo1_stores_data'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao_resumo'] });
    }
  });
}
