import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCategorizeOrphan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorize = async (transactionId: string, category: string, justification: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Tenta atualizar diretamente na tabela física ofx_transactions (extrato bancário)
      const { data: ofxData, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId)
        .select();

      if (!ofxErr && ofxData && ofxData.length > 0) {
        return { success: true, data: ofxData[0] };
      }

      // 2. Se não estiver no OFX, tenta em pos_transactions (maquininhas)
      const { data: posData, error: posErr } = await supabase
        .from('pos_transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId)
        .select();

      if (!posErr && posData && posData.length > 0) {
        return { success: true, data: posData[0] };
      }

      // 3. Se não estiver em POS, tenta em manual_transactions
      const { data: manData, error: manErr } = await supabase
        .from('manual_transactions')
        .update({
          manual_category: category,
          manual_justification: justification
        })
        .eq('id', transactionId)
        .select();

      if (!manErr && manData && manData.length > 0) {
        return { success: true, data: manData[0] };
      }

      throw new Error(ofxErr?.message || posErr?.message || manErr?.message || 'Transação não encontrada nas tabelas base.');
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
