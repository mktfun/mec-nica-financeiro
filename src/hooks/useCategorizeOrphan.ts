import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCategorizeOrphan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorize = async (transactionId: string, category: string, justification: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('categorize_orphan_transaction', {
        p_tx_id: transactionId,
        p_category: category,
        p_justification: justification
      });

      if (rpcError) throw rpcError;

      return { success: true, data };
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
