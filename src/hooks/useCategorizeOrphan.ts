import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCategorizeOrphan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const categorize = async (transactionId: string, category: string, justification: string) => {
    setLoading(true);
    setError(null);
    try {
      let matchedData: any = null;

      // 1. Atualiza na tabela unificada transactions se existir
      await supabase
        .from('transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId);

      // 2. Tenta atualizar na tabela física ofx_transactions (extrato bancário)
      const { data: ofxData, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId)
        .select();

      if (!ofxErr && ofxData && ofxData.length > 0) {
        matchedData = ofxData[0];
      }

      // 3. Se não estiver no OFX, tenta em pos_transactions (maquininhas)
      if (!matchedData) {
        const { data: posData, error: posErr } = await supabase
          .from('pos_transactions')
          .update({
            manual_category: category,
            manual_justification: justification
          })
          .eq('id', transactionId)
          .select();

        if (!posErr && posData && posData.length > 0) {
          matchedData = posData[0];
        }
      }

      // 4. Se não estiver em POS, tenta em manual_transactions
      if (!matchedData) {
        const { data: manData, error: manErr } = await supabase
          .from('manual_transactions')
          .update({
            manual_category: category,
            manual_justification: justification
          })
          .eq('id', transactionId)
          .select();

        if (!manErr && manData && manData.length > 0) {
          matchedData = manData[0];
        }
      }

      // Invalida todos os caches de conciliação, justificativas e snapshots
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['extrato'] });

      return { success: true, data: matchedData || { id: transactionId, manual_category: category, manual_justification: justification } };
    } catch (err: any) {
      console.error('Error categorizing orphan transaction:', err);
      setError(err.message || 'Erro ao categorizar transação');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { categorize, loading, error };
}
