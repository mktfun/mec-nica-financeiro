import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreOsCandidate {
  id: string;
  os_number: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pix_transfer_value: number;
  payment_method: string;
  status: string;
  date: string;
  matched_ofx_id?: string | null;
}

export function useAvailableStoreOs(storeId: string, date?: string) {
  return useQuery<StoreOsCandidate[]>({
    queryKey: ['available_store_os', storeId, date],
    queryFn: async () => {
      if (!storeId) return [];

      const candidatesMap = new Map<string, StoreOsCandidate>();

      // 1. Busca OSs que JÁ ESTÃO vinculadas em ofx_transactions para esta loja
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
          patioQuery = patioQuery.lte('opened_at', `${date}T23:59:59`);
        }

        const { data: patioData } = await patioQuery;

        if (patioData) {
          patioData.forEach((row: any) => {
            const num = String(row.os_number || '').trim();
            if (!num) return;

            // Bloqueia se já estiver vinculada a outro PIX
            if (alreadyLinkedSet.has(num)) return;

            const totalVal = Number(row.total_value || 0);
            const paidVal = Number(row.paid_value || 0);
            const pixVal = Number(row.pix_transfer_value || 0);
            const openVal = Math.max(0, totalVal - paidVal);
            const paymentMethodStr = String(row.payment_method || '').toUpperCase();

            // Bloqueia OSs puramente em Cartão ou Dinheiro sem saldo em aberto
            const isPureCardOrCash = (paymentMethodStr.includes('CREDITO') || paymentMethodStr.includes('DEBITO') || paymentMethodStr.includes('DINHEIRO') || paymentMethodStr.includes('ESPECIE')) &&
              !paymentMethodStr.includes('PIX') && !paymentMethodStr.includes('TRANSF') && pixVal === 0 && openVal === 0;

            if (isPureCardOrCash) return;

            const hasPixRelevance = pixVal > 0 || paymentMethodStr.includes('PIX') || paymentMethodStr.includes('TRANSF') || openVal > 0;
            if (!hasPixRelevance) return;

            candidatesMap.set(num, {
              id: row.id,
              os_number: num,
              client_name: row.client_name || 'Cliente',
              plate: row.plate || '',
              total_value: totalVal,
              paid_value: paidVal,
              pix_transfer_value: pixVal,
              payment_method: row.payment_method || (pixVal > 0 ? 'PIX' : (openVal > 0 ? 'Em Aberto' : 'Outros')),
              status: row.status || 'PENDENTE',
              date: row.last_payment_date || row.closed_at || row.opened_at || date || '',
              matched_ofx_id: null,
            });
          });
        }
      } catch (e) {
        console.warn('Aviso ao consultar patio_os:', e);
      }

      // 3. Complementa com estoque_os_pendente (apenas da mesma loja e não vinculadas)
      try {
        const { data: pendenteData } = await supabase
          .from('estoque_os_pendente')
          .select('*')
          .eq('store_id', storeId);

        if (pendenteData) {
          pendenteData.forEach((row: any) => {
            const num = String(row.os_number || row.numero_os || '').trim();
            if (!num || alreadyLinkedSet.has(num) || candidatesMap.has(num)) return;

            const totalVal = Number(row.total_value || row.valor_os || 0);
            const paidVal = Number(row.paid_value || row.valor_pago || 0);
            const pixVal = Number(row.pix_transfer_value || 0);
            const openVal = Math.max(0, totalVal - paidVal);
            const paymentMethodStr = String(row.payment_method || row.forma_pagamento || '').toUpperCase();

            const isPureCardOrCash = (paymentMethodStr.includes('CREDITO') || paymentMethodStr.includes('DEBITO') || paymentMethodStr.includes('DINHEIRO') || paymentMethodStr.includes('ESPECIE')) &&
              !paymentMethodStr.includes('PIX') && !paymentMethodStr.includes('TRANSF') && pixVal === 0 && openVal === 0;

            if (isPureCardOrCash) return;

            candidatesMap.set(num, {
              id: row.id,
              os_number: num,
              client_name: row.client_name || row.cliente || 'Cliente',
              plate: row.plate || row.placa || '',
              total_value: totalVal,
              paid_value: paidVal,
              pix_transfer_value: pixVal,
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

export function useManualMatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const linkTransactionToOs = async (transactionId: string, osNumber: string, storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Atualiza em transactions
      await supabase
        .from('transactions')
        .update({
          os_number: osNumber,
          status: 'completed',
          match_status: 'MATCHED',
        })
        .eq('id', transactionId);

      // 2. Atualiza em ofx_transactions
      await supabase
        .from('ofx_transactions')
        .update({
          matched_os_number: osNumber,
        })
        .eq('id', transactionId);

      // 3. Atualiza em estoque_os_pendente e patio_os
      if (osNumber) {
        await supabase
          .from('estoque_os_pendente')
          .update({ matched_ofx_id: transactionId, status: 'PAGO' })
          .eq('os_number', osNumber);

        await supabase
          .from('patio_os')
          .update({ matched_ofx_id: transactionId, status: 'PAGO' })
          .eq('os_number', osNumber);
      }

      // Invalida todos os caches de conciliação
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao vincular transação à OS:', err);
      setError(err.message || 'Erro ao vincular transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const unlinkTransaction = async (transactionId: string, osNumber?: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Limpa em transactions
      await supabase
        .from('transactions')
        .update({
          os_number: null,
          match_status: 'UNMATCHED',
        })
        .eq('id', transactionId);

      // 2. Limpa em ofx_transactions
      await supabase
        .from('ofx_transactions')
        .update({
          matched_os_number: null,
        })
        .eq('id', transactionId);

      // 3. Limpa em estoque_os_pendente / patio_os se informado
      if (osNumber) {
        await supabase
          .from('estoque_os_pendente')
          .update({ matched_ofx_id: null, status: 'PENDENTE' })
          .eq('os_number', osNumber);

        await supabase
          .from('patio_os')
          .update({ matched_ofx_id: null, status: 'PENDENTE' })
          .eq('os_number', osNumber);
      }

      // Invalida todos os caches de conciliação
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      queryClient.invalidateQueries({ queryKey: ['available_store_os'] });
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao desvincular transação:', err);
      setError(err.message || 'Erro ao desvincular transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { linkTransactionToOs, unlinkTransaction, loading, error };
}
