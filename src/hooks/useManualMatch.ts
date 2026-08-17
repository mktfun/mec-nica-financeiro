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

export function useAvailableStoreOs(storeId: string, date: string) {
  return useQuery<StoreOsCandidate[]>({
    queryKey: ['available_store_os', storeId, date],
    queryFn: async () => {
      const candidatesMap = new Map<string, StoreOsCandidate>();

      // 1. Busca em estoque_os_pendente
      try {
        const { data: pendenteData } = await supabase
          .from('estoque_os_pendente')
          .select('*')
          .eq('store_id', storeId);

        if (pendenteData) {
          pendenteData.forEach((row: any) => {
            const num = String(row.os_number || row.numero_os || '').trim();
            if (num) {
              candidatesMap.set(num, {
                id: row.id,
                os_number: num,
                client_name: row.client_name || row.cliente || 'Cliente',
                plate: row.plate || row.placa || '',
                total_value: Number(row.total_value || row.valor_os || 0),
                paid_value: Number(row.paid_value || row.valor_pago || 0),
                pix_transfer_value: Number(row.pix_transfer_value || 0),
                payment_method: row.payment_method || row.forma_pagamento || 'PIX',
                status: row.status || 'PENDENTE',
                date: row.date || row.data || date,
                matched_ofx_id: row.matched_ofx_id || null,
              });
            }
          });
        }
      } catch (e) {
        console.warn('Aviso ao consultar estoque_os_pendente:', e);
      }

      // 2. Busca em patio_os para complementar
      try {
        const { data: patioData } = await supabase
          .from('patio_os')
          .select('*')
          .eq('store_id', storeId);

        if (patioData) {
          patioData.forEach((row: any) => {
            const num = String(row.os_number || '').trim();
            if (num && !candidatesMap.has(num)) {
              candidatesMap.set(num, {
                id: row.id,
                os_number: num,
                client_name: row.client_name || 'Cliente',
                plate: row.plate || '',
                total_value: Number(row.total_value || 0),
                paid_value: Number(row.paid_value || 0),
                pix_transfer_value: Number(row.pix_transfer_value || 0),
                payment_method: row.payment_method || 'PIX',
                status: row.status || 'PENDENTE',
                date: row.date || date,
                matched_ofx_id: row.matched_ofx_id || null,
              });
            }
          });
        }
      } catch (e) {
        console.warn('Aviso ao consultar patio_os:', e);
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
