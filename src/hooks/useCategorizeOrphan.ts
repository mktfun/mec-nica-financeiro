import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCategorizeOrphan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorize = async (transactionId: string, category: string, justification: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Tenta via RPC
      const { data, error: rpcError } = await supabase.rpc('categorize_orphan_transaction', {
        p_tx_id: transactionId,
        p_category: category,
        p_justification: justification
      });

      if (!rpcError) {
        return { success: true, data };
      }

      // 2. Fallback direto na tabela transactions
      const { data: updateData, error: updateError } = await supabase
        .from('transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return { success: true, data: updateData };
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
