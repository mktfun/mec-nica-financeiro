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
  totalRedeGross: number;
  totalRedeNet: number;
  totalRedeFee: number;
  totalOfxIn: number;
  totalOfxOut: number;
  totalDivergence: number;
  approved: number;
}

export function useReconciliationsForDate(date: string) {
  return useQuery({
    queryKey: ['reconciliations', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('date', date);
      if (error) throw error;
      return data || [];
    },
    enabled: !!date,
  });
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

      const totalRedeGross = txs
        ?.filter(t => t.source === 'rede' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.gross_amount || t.amount), 0) || 0;

      const totalRedeNet = txs
        ?.filter(t => t.source === 'rede' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalRedeFee = txs
        ?.filter(t => t.source === 'rede' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.fee_amount || 0), 0) || 0;

      const totalOfxIn = txs
        ?.filter(t => t.source === 'ofx' && t.type === 'in')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalOfxOut = txs
        ?.filter(t => t.source === 'ofx' && t.type === 'out')
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      const totalOfxPix = txs
        ?.filter(t => t.source === 'ofx' && t.type === 'in' && t.payment_method?.toLowerCase().includes('pix'))
        .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      // Divergência real = OS Bruto - Rede Bruto - PIX 
      // (Simplified logic just for the hook. ResumoDiaPanel will do the precise per-store math)
      const totalDivergence = Math.abs(totalSystemOS - totalRedeGross - totalOfxPix);

      return {
        date,
        totalSystemOS,
        totalRedeGross,
        totalRedeNet,
        totalRedeFee,
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
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', date);
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
      const { data, error } = await supabase
        .from('transactions')
        .select('store_id, amount, type, source')
        .eq('target_date', targetDate);

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
      // 1. Buscar transações do banco
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date);

      if (txsErr) throw txsErr;

      // 2. Buscar OSs do pátio
      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      if (patioErr) console.warn("Aviso patio_os:", patioErr);

      // --- Maquininhas (Rede) ---
      const redeTxs = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const taxaTransactions = txs?.filter(t => t.source === 'rede_taxa') || [];
      const ofxInTxs = txs?.filter(t => t.source === 'ofx' && t.type === 'in' && t.amount > 0) || [];

      // osVsRede: mapeamento 1:1 local simplificado
      const osVsRede = redeTxs.map(redeTx => {
        let taxaAmount = 0;
        let osNumber = redeTx.os_number;
        let osData = null;

        // Tenta achar OS se estiver pareada
        if (!osNumber) {
          const possibleOs = patioOs?.find(o => 
            o.matched_ofx_id === redeTx.matched_ofx_id && redeTx.matched_ofx_id !== null
          );
          if (possibleOs) {
            osNumber = possibleOs.os_number;
            osData = possibleOs;
          }
        }

        const redeBruto = redeTx.amount;
        return {
          id: redeTx.id,
          maquininha_title: redeTx.title || 'Transação Maquininha',
          rede_bruto: redeBruto,
          taxa_brl: taxaAmount,
          taxa_percent: 0,
          rede_liquido: redeTx.amount,
          os_total: osData ? (osData.total_value || osData.paid_value) : 0,
          os_number: osNumber || 'Não Localizada',
          os_data: osData,
          delta: 0,
          status: redeTx.match_status === 'MATCHED' ? 'PAREADO' : 'SEM_PAR'
        };
      });

      // depositGroups: Agrupando Rede vs OFX baseado no matched_ofx_id
      const depositGroups: any[] = [];
      const adquirenteOfx = ofxInTxs.filter(t => {
         const txt = `${t.title || ''} ${t.subtitle || ''}`.toUpperCase();
         return txt.includes('REDE') || txt.includes('CARTAO') || txt.includes('VISA') || txt.includes('MAST');
      });

      adquirenteOfx.forEach(ofxTx => {
        const matchedRedeTxs = redeTxs.filter(r => r.matched_ofx_id === ofxTx.id);
        const totalChildAmount = matchedRedeTxs.reduce((sum, r) => sum + r.amount, 0);

        depositGroups.push({
          ofxDeposit: {
            id: ofxTx.id,
            title: ofxTx.title || ofxTx.subtitle,
            amount: ofxTx.amount,
            occurred_at: ofxTx.occurred_at
          },
          childRedeTxs: matchedRedeTxs.map(t => ({ 
            id: t.id, title: t.title, amount: t.amount, payment_method: t.payment_method, target_date: t.target_date 
          })),
          totalChildAmount,
          isMatched: ofxTx.match_status === 'MATCHED' || matchedRedeTxs.length > 0,
          groupDelta: ofxTx.amount - totalChildAmount,
          matchType: ofxTx.match_status === 'MATCHED' ? 'Pareamento DB' : 'Pendente',
          layer: ofxTx.match_status === 'MATCHED' ? 'CAMADA_1' : 'CAMADA_4_EXCECAO'
        });
      });

      const redeVsOfx = {
         rede: redeTxs,
         ofx: adquirenteOfx,
         depositGroups,
         unassignedRedeTxs: redeTxs.filter(r => r.match_status !== 'MATCHED'),
         outrasOfx: ofxInTxs.filter(t => !adquirenteOfx.includes(t))
      };

      // --- PIX (OS vs OFX) ---
      const ofxPixList = ofxInTxs.filter(t => {
         const txt = `${t.title || ''} ${t.subtitle || ''}`.toUpperCase();
         return txt.includes('PIX') || txt.includes('TRANSF') || txt.includes('TED') || txt.includes('DOC');
      });

      const osPixList = patioOs?.filter(o => o.match_status === 'MATCHED' || o.matched_ofx_id) || [];

      const pixGroups = ofxPixList.map(ofxPix => {
        const matchedOs = osPixList.find(os => os.matched_ofx_id === ofxPix.id);
        return {
          ofxPix: { id: ofxPix.id, title: ofxPix.title, amount: ofxPix.amount, occurred_at: ofxPix.occurred_at },
          matchedOs: matchedOs ? { os_number: matchedOs.os_number, client_name: matchedOs.client_name, amount: matchedOs.total_value } : null,
          isMatched: !!matchedOs || ofxPix.match_status === 'MATCHED'
        };
      });

      const pixVsOfx = {
        osPix: osPixList,
        ofxPix: ofxPixList,
        pixGroups
      };

      return {
        osVsRede,
        redeVsOfx,
        pixVsOfx,
        ofxSemMatch: [],
        unmatchedAlerts: []
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

      const thirtyDaysAgo = new Date(new Date(date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: reconciliations } = await supabase
        .from('reconciliations')
        .select('store_id, date, na_loja_os')
        .lte('date', date)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false });

      const { data: matches } = await supabase
        .from('conciliation_matches')
        .select('*')
        .eq('target_date', date);

      return (stores || []).map(store => {
        const storeTxs = txs?.filter(t => t.store_id === store.id) || [];
        const storeOs = patioOs?.filter(o => o.store_id === store.id) || [];
        const storeRec = receivables?.filter(r => r.store_id === store.id) || [];
        // Encontra o snapshot mais recente que tenha dívida legada registrada (> 0)
      const storeRecon = reconciliations?.find(r => r.store_id === store.id && r.date === date);

        const saldoBancoItau = storeTxs
          .filter(t => t.source === 'ofx' && (t.type === 'in' || Number(t.amount || 0) > 0))
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);

        const cartaoEntrou = storeTxs
          .filter(t => t.source === 'rede' && t.type === 'in')
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);

        // Saldo em aberto real das OSs ativas (total_value - paid_value)
        // Se houver snapshot histórico em reconciliations.na_loja_os, usar ele!
        const isHistorical = storeRecon && storeRecon.na_loja_os !== undefined && storeRecon.na_loja_os !== null;
        
        const naLojaOs = isHistorical 
          ? Number(storeRecon.na_loja_os) 
          : storeOs
              .filter(o => {
                const s = String(o.status || '').toLowerCase().trim();
                return ['em_aberto', 'pago_parcial', 'pendente', 'aberta', 'aberto', 'em andamento'].includes(s);
              })
              .reduce((acc, o) => {
                return acc + Math.max(0, Number(o.total_value || 0) - Number(o.paid_value || 0));
              }, 0);

        // 1. Extrair transações de entrada do OFX (sem filtro restrito de texto como 'PIX', pois cada banco tem uma sigla)
        const ofxPixTxs = storeTxs.filter(t => t.source === 'ofx' && t.type === 'in');

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
        let pixOsExpected = 0;
        
        const originalOsPixList = [...osPixList];
        
        ofxPixTxs.forEach(ofxPix => {
           const amt = Number(ofxPix.amount || 0);
           const matchIdx = osPixList.findIndex(osVal => Math.abs(osVal - amt) < 0.05);
           if (matchIdx !== -1) {
              pixOsMatched += amt;
              // Remove para não dar match duplo
              osPixList.splice(matchIdx, 1);
           }
        });
        
        pixOsExpected = originalOsPixList.reduce((acc, val) => acc + val, 0);

        const storeMatches = matches?.filter(m => m.store_id === store.id) || [];
        const linkedOfxIds = new Set(storeMatches.map(m => m.ofx_transaction_id).filter(Boolean));
        
        const faturamentoRealOfx = storeTxs
          .filter(t => t.source === 'ofx' && t.type === 'in' && linkedOfxIds.has(t.id))
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);

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
          pix_os_expected: pixOsExpected,
          faturamento_real_ofx: faturamentoRealOfx,
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
