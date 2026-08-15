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
        .from('estoque_os_pendente')
        .select('*')
        .eq('status', 'PENDENTE');

      if (patioErr) console.warn("Aviso ao carregar estoque_os_pendente:", patioErr);

      const totalSystemOS = patioOs?.reduce((acc, os) => {
        return acc + Number(os.valor_os || 0);
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
      // 1. Buscar transações do banco e da maquininha
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('target_date', date);

      if (txsErr) throw txsErr;

      // 2. Buscar OSs reais do pátio
      const { data: patioOs, error: patioErr } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId);

      if (patioErr) console.warn("Aviso ao carregar patio_os:", patioErr);

      // --- Maquininhas (Rede) ---
      const redeTxs = txs?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
      const ofxInTxs = txs?.filter(t => t.source === 'ofx' && t.type === 'in' && Number(t.amount) > 0) || [];

      // OSs de cartão (crédito/débito) da filial
      const cardOsList = (patioOs || []).filter(o => {
        const hasCardVal = Number(o.credit_value || 0) > 0 || Number(o.debit_value || 0) > 0;
        const method = String(o.payment_method || '').toLowerCase();
        const hasCardMethod = method.includes('cart') || method.includes('crédito') || method.includes('credito') || method.includes('debito') || method.includes('débito') || method.includes('rede');
        return hasCardVal || hasCardMethod;
      });

      const totalCardOsFaturamento = cardOsList.reduce((sum, o) => {
        const c = Number(o.credit_value || 0) + Number(o.debit_value || 0);
        return sum + (c > 0 ? c : (Number(o.paid_value) || Number(o.total_value) || 0));
      }, 0);

      // Entradas bancárias de Adquirente (REDE, CARTÃO, etc.)
      const adquirenteOfx = ofxInTxs.filter(t => {
        const txt = `${t.title || ''} ${t.subtitle || ''} ${t.counterpart_name || ''} ${t.description || ''}`.toUpperCase();
        return txt.includes('REDE') || txt.includes('REDEMULTI') || txt.includes('CARTAO') || txt.includes('CARTÃO') || txt.includes('VISA') || txt.includes('MAST') || txt.includes('CIELO');
      });

      const totalRedeNet = redeTxs.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const totalAdquirenteOfx = adquirenteOfx.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const isRedeBankSettled = totalAdquirenteOfx > 0 || totalRedeNet === 0 || Math.abs(totalRedeNet - totalAdquirenteOfx) < 5.0;

      // 1. osVsRede: Cartão OS -> Maquininha
      const osVsRede = redeTxs.map(redeTx => {
        const redeBruto = Number(redeTx.gross_amount || redeTx.amount || 0);
        const redeLiquido = Number(redeTx.amount || 0);
        const taxaBrl = Number(redeTx.fee_amount || Math.max(0, redeBruto - redeLiquido));
        const taxaPercent = redeBruto > 0 ? (taxaBrl / redeBruto * 100) : 0;

        let rawOsNum = redeTx.os_number;
        let osData: any = null;
        const isRealOsNumber = rawOsNum && /^\d+$/.test(String(rawOsNum).trim());

        // 1. Busca por número de OS real gravado
        if (isRealOsNumber) {
          osData = (patioOs || []).find(o => String(o.os_number) === String(rawOsNum));
        }

        // 2. Busca por valor próximo entre OSs de cartão da filial
        if (!osData && cardOsList.length > 0) {
          const matchByVal = cardOsList.find(o => {
            const osVal = Number(o.paid_value) || Number(o.total_value) || (Number(o.credit_value || 0) + Number(o.debit_value || 0));
            return Math.abs(osVal - redeBruto) < 1.0 || Math.abs(osVal - redeLiquido) < 1.0;
          });
          if (matchByVal) {
            osData = matchByVal;
            rawOsNum = matchByVal.os_number;
          }
        }

        // O faturamento da maquininha da loja que entrou no banco / sistema
        let osTotal = 0;
        if (osData) {
          osTotal = Number(osData.paid_value) || Number(osData.total_value) || 0;
        } else if (totalAdquirenteOfx > 0) {
          osTotal = redeTxs.length === 1 ? totalAdquirenteOfx : (totalAdquirenteOfx / redeTxs.length);
        } else {
          osTotal = redeLiquido > 0 ? redeLiquido : redeBruto;
        }

        const delta = redeBruto - osTotal;
        const isSettledWithBank = isRedeBankSettled || (totalAdquirenteOfx > 0 && Math.abs(totalAdquirenteOfx - totalRedeNet) < 5.0);

        let displayOsLabel = 'Extrato REDE Consolidado';
        if (osData && osData.os_number) {
          displayOsLabel = `OS #${osData.os_number}`;
        } else if (isRealOsNumber) {
          displayOsLabel = `OS #${rawOsNum}`;
        }

        return {
          id: redeTx.id,
          maquininha_title: redeTx.title || 'Importação Rede',
          rede_bruto: redeBruto,
          taxa_brl: taxaBrl,
          taxa_percent: taxaPercent,
          rede_liquido: redeLiquido,
          os_total: osTotal,
          os_number: displayOsLabel,
          is_real_os: !!osData,
          os_data: osData ? {
            ...osData,
            client_name: osData.client_name || osData.store_name,
            vehicle: osData.plate || '',
            parsed_credit_debit: (Number(osData.credit_value || 0) + Number(osData.debit_value || 0)),
            parsed_pix_transfer: Number(osData.pix_transfer_value || 0)
          } : null,
          delta: delta,
          status: (osData || isSettledWithBank || redeTx.match_status === 'MATCHED') ? 'PAREADO' : 'SEM_PAR'
        };
      });

      // 2. redeVsOfx: Maquininha Líquida -> Entradas OFX de Adquirente
      const depositGroups = adquirenteOfx.map(ofxTx => {
        const matchedRedeTxs = redeTxs.filter(r => r.matched_ofx_id === ofxTx.id || redeTxs.length === 1);
        const totalChildAmount = matchedRedeTxs.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        return {
          ofxDeposit: {
            id: ofxTx.id,
            title: ofxTx.title || ofxTx.subtitle || ofxTx.counterpart_name || 'Crédito Adquirente',
            amount: Number(ofxTx.amount || 0),
            occurred_at: ofxTx.occurred_at
          },
          childRedeTxs: matchedRedeTxs.map(t => ({ 
            id: t.id, 
            title: t.title, 
            amount: Number(t.amount || 0), 
            payment_method: t.payment_method, 
            target_date: t.target_date 
          })),
          totalChildAmount: totalChildAmount > 0 ? totalChildAmount : Number(ofxTx.amount || 0),
          isMatched: true,
          groupDelta: Number(ofxTx.amount || 0) - totalChildAmount,
          matchType: 'Entrou no Banco',
          layer: 'CAMADA_1'
        };
      });

      const redeVsOfx = {
        rede: redeTxs,
        ofx: adquirenteOfx,
        depositGroups,
        isSettled: isRedeBankSettled,
        totalRedeNet,
        totalAdquirenteOfx,
        unassignedRedeTxs: isRedeBankSettled ? [] : redeTxs,
        outrasOfx: ofxInTxs.filter(t => !adquirenteOfx.includes(t))
      };

      // 3. pixVsOfx: PIX (OS -> Banco OFX)
      const osPixList = (patioOs || []).filter(o => {
        const val = Number(o.pix_transfer_value || 0);
        const method = String(o.payment_method || '').toLowerCase();
        return val > 0 || method.includes('pix') || method.includes('transf') || method.includes('ted');
      }).map(o => ({
        id: o.id,
        os_number: o.os_number,
        client_name: o.client_name || 'Cliente',
        plate: o.plate || '',
        amount: Number(o.pix_transfer_value) > 0 ? Number(o.pix_transfer_value) : (Number(o.paid_value) || Number(o.total_value) || 0),
        status: o.status,
        payment_method: o.payment_method,
        matched_ofx_id: o.matched_ofx_id
      }));

      const ofxPixList = ofxInTxs.filter(t => {
        const txt = `${t.title || ''} ${t.subtitle || ''} ${t.counterpart_name || ''} ${t.description || ''}`.toUpperCase();
        return (txt.includes('PIX') || txt.includes('TRANSF') || txt.includes('TED') || txt.includes('TEF')) && !adquirenteOfx.includes(t);
      });

      const matchedOfxIds = new Set<string>();
      const pixGroups = osPixList.map(osPix => {
        const matchedOfx = ofxPixList.find(ofx => {
          if (matchedOfxIds.has(ofx.id)) return false;
          const amtDiff = Math.abs(Number(ofx.amount) - Number(osPix.amount));
          return amtDiff < 0.1 || (osPix.matched_ofx_id === ofx.id);
        });

        if (matchedOfx) matchedOfxIds.add(matchedOfx.id);

        return {
          osPix,
          ofxPix: matchedOfx ? {
            id: matchedOfx.id,
            title: matchedOfx.title || matchedOfx.counterpart_name || 'PIX Recebido',
            amount: Number(matchedOfx.amount || 0),
            occurred_at: matchedOfx.occurred_at
          } : null,
          isMatched: !!matchedOfx || osPix.status === 'ENTROU' || osPix.status === 'finalizado'
        };
      });

      const pixVsOfx = {
        osPix: osPixList,
        ofxPix: ofxPixList,
        pixGroups
      };

      // 4. ofxSemMatch: Entradas bancárias que não são de Adquirente nem de PIX OS
      const ofxSemMatch = ofxInTxs.filter(t => {
        return !adquirenteOfx.some(a => a.id === t.id) && !matchedOfxIds.has(t.id);
      }).map(t => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle,
        amount: Number(t.amount || 0),
        type: t.type || 'in',
        occurred_at: t.occurred_at,
        counterpart_name: t.counterpart_name,
        cnpj_cpf: t.cnpj_cpf,
        manual_category: t.manual_category || null,
        manual_justification: t.manual_justification || null
      }));

      return {
        osVsRede,
        redeVsOfx,
        pixVsOfx,
        ofxSemMatch,
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
        .from('estoque_os_pendente')
        .select('*')
        .eq('status', 'PENDENTE');

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
      const resolvedStatus = newStatus === 'em_aberto' ? 'PENDENTE' : 'PAGA';
      const { data, error } = await supabase
        .from('estoque_os_pendente')
        .update({ status: resolvedStatus, data_baixa: new Date().toISOString() })
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
      queryClient.invalidateQueries({ queryKey: ['estoque_os_pendente'] });
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

export function useRedeVsExtrato(storeId: string, date: string) {
  return useQuery({
    queryKey: ['rede-vs-extrato', storeId, date],
    queryFn: async () => []
  });
}

export function useSaveBankReconciliation() {
  return useMutation({
    mutationFn: async (data: any) => { return data; }
  });
}

export function useSaveMachineTotal() {
  return useMutation({
    mutationFn: async (data: any) => { return data; }
  });
}
