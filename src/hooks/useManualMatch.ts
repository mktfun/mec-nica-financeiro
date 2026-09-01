import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreOsCandidate {
  id: string;
  os_number: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pix_transfer_value: number;
  credit_value?: number;
  debit_value?: number;
  cash_value?: number;
  open_balance: number;
  payment_method: string;
  status: string;
  date: string;
  matched_ofx_id?: string | null;
}

export function useAvailableStoreOs(storeId: string, date?: string, matchType: 'pix' | 'rede' | 'all' = 'all') {
  return useQuery<StoreOsCandidate[]>({
    queryKey: ['available_store_os', storeId, date, matchType],
    queryFn: async () => {
      if (!storeId) return [];

      const candidatesMap = new Map<string, StoreOsCandidate>();

      // 1. Busca OSs que JÁ ESTÃO vinculadas em ofx_transactions ou pos_transactions para esta loja
      const { data: linkedOfx } = await supabase
        .from('ofx_transactions')
        .select('matched_os_number')
        .eq('store_id', storeId)
        .not('matched_os_number', 'is', null);

      const alreadyLinkedSet = new Set<string>();
      (linkedOfx || []).forEach(row => {
        const num = String(row.matched_os_number || '').trim();
        if (num) alreadyLinkedSet.add(num);
      });

      // 2. Busca em patio_os para esta loja
      try {
        let patioQuery = supabase
          .from('patio_os')
          .select('*')
          .eq('store_id', storeId);

        if (date) {
          patioQuery = patioQuery.lte('opened_at', date + 'T23:59:59');
        }

        const { data: patioData } = await patioQuery;

        if (patioData) {
          patioData.forEach((row: any) => {
            const num = String(row.os_number || '').trim();
            if (!num) return;

            const totalVal = Number(row.total_value || 0);
            const paidVal = Number(row.paid_value || 0);
            const pixVal = Number(row.pix_transfer_value || 0);
            const creditVal = Number(row.credit_value || 0);
            const debitVal = Number(row.debit_value || 0);
            const cashVal = Number(row.cash_value || 0);
            const openVal = Math.max(0, totalVal - paidVal);
            const paymentMethodStr = String(row.payment_method || '').toUpperCase();

            if (matchType === 'pix') {
              const isPureCardOrCash = (paymentMethodStr.includes('CREDITO') || paymentMethodStr.includes('DEBITO') || paymentMethodStr.includes('DINHEIRO')) &&
                !paymentMethodStr.includes('PIX') && !paymentMethodStr.includes('TRANSF') && pixVal === 0 && openVal === 0;
              if (isPureCardOrCash) return;
            }

            candidatesMap.set(num, {
              id: row.id,
              os_number: num,
              client_name: row.client_name || 'Cliente',
              plate: row.plate || '',
              total_value: totalVal,
              paid_value: paidVal,
              pix_transfer_value: pixVal,
              credit_value: creditVal,
              debit_value: debitVal,
              cash_value: cashVal,
              open_balance: openVal,
              payment_method: row.payment_method || (pixVal > 0 ? 'PIX' : (openVal > 0 ? 'Em Aberto' : 'Outros')),
              status: row.status || 'PENDENTE',
              date: row.last_payment_date || row.closed_at || row.opened_at || date || '',
              matched_ofx_id: row.matched_ofx_id || null,
            });
          });
        }
      } catch (e) {
        console.warn('Aviso ao consultar patio_os:', e);
      }

      // 3. Complementa com estoque_os_pendente
      try {
        const { data: pendenteData } = await supabase
          .from('estoque_os_pendente')
          .select('*')
          .eq('store_id', storeId);

        if (pendenteData) {
          pendenteData.forEach((row: any) => {
            const num = String(row.os_number || row.numero_os || '').trim();
            if (!num || candidatesMap.has(num)) return;

            const totalVal = Number(row.total_value || row.valor_os || 0);
            const paidVal = Number(row.paid_value || row.valor_pago || 0);
            const pixVal = Number(row.pix_transfer_value || 0);
            const creditVal = Number(row.credit_value || 0);
            const debitVal = Number(row.debit_value || 0);
            const cashVal = Number(row.cash_value || 0);
            const openVal = Math.max(0, totalVal - paidVal);

            candidatesMap.set(num, {
              id: row.id,
              os_number: num,
              client_name: row.client_name || row.cliente || 'Cliente',
              plate: row.plate || row.placa || '',
              total_value: totalVal,
              paid_value: paidVal,
              pix_transfer_value: pixVal,
              credit_value: creditVal,
              debit_value: debitVal,
              cash_value: cashVal,
              open_balance: openVal,
              payment_method: row.payment_method || row.forma_pagamento || (pixVal > 0 ? 'PIX' : 'Em Aberto'),
              status: row.status || 'PENDENTE',
              date: row.date || row.data || date || '',
              matched_ofx_id: null,
            });
          });
        }
      } catch (e) {
        console.warn('Aviso ao consultar estoque_os_pendente:', e);
      }

      return Array.from(candidatesMap.values());
    },
    enabled: !!storeId,
  });
}

export interface CreateAndLinkOsParams {
  transactionType: 'ofx' | 'rede' | 'pix';
  transactionId: string;
  storeId: string;
  osNumber: string;
  clientName?: string;
  plate?: string;
  totalValue?: number;
  paymentMethod?: string;
  linkAmount?: number;
}

export function useManualMatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createAndLinkOs = async (params: CreateAndLinkOsParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('create_and_link_manual_os', {
        p_transaction_type: params.transactionType,
        p_transaction_id: params.transactionId,
        p_store_id: params.storeId,
        p_os_number: params.osNumber,
        p_client_name: params.clientName || null,
        p_plate: params.plate || null,
        p_total_value: params.totalValue || null,
        p_payment_method: params.paymentMethod || null,
        p_link_amount: params.linkAmount || null
      });

      if (rpcErr) throw rpcErr;

      await queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      await queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      await queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      await queryClient.invalidateQueries({ queryKey: ['patio-os'] });
      await queryClient.invalidateQueries({ queryKey: ['patio_os'] });

      return { success: true, data };
    } catch (err: any) {
      console.error('Erro ao criar OS e vincular transação:', err);
      setError(err.message || 'Erro ao criar OS e vincular transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const linkTransactionToOs = async (
    transactionId: string, 
    osNumber: string, 
    storeId?: string,
    source: 'ofx' | 'rede' = 'ofx',
    amount?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (source === 'rede') {
        const { data, error: rpcErr } = await supabase.rpc('link_manual_rede_to_os', {
          p_pos_id: transactionId,
          p_os_number: osNumber,
          p_store_id: storeId || null,
          p_amount: amount || null
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { data, error: rpcErr } = await supabase.rpc('link_manual_pix_to_os', {
          p_ofx_id: transactionId,
          p_os_number: osNumber,
          p_store_id: storeId || null,
          p_amount: amount || null
        });
        if (rpcErr) throw rpcErr;
      }

      await queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      await queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      await queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      await queryClient.invalidateQueries({ queryKey: ['patio-os'] });
      await queryClient.invalidateQueries({ queryKey: ['patio_os'] });

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao vincular transação à OS:', err);
      setError(err.message || 'Erro ao vincular transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const unlinkTransaction = async (
    transactionId: string, 
    osNumber?: string,
    source: 'ofx' | 'rede' = 'ofx'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc('unlink_manual_os_match', {
        p_transaction_type: source,
        p_transaction_id: transactionId,
        p_os_number: osNumber || null
      });
      if (rpcErr) throw rpcErr;

      await queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      await queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      await queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      await queryClient.invalidateQueries({ queryKey: ['patio-os'] });
      await queryClient.invalidateQueries({ queryKey: ['patio_os'] });

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao desvincular transação:', err);
      setError(err.message || 'Erro ao desvincular transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { linkTransactionToOs, createAndLinkOs, unlinkTransaction, loading, error };
}
