import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCategorizeOrphan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const categorize = async (
    transactionId: string, 
    category: string, 
    justification: string,
    impactsRevenue: boolean = true,
    amount?: number,
    targetDate?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      let matchedData: any = null;

      // Se NÃO impacta faturamento, anota a tag [Apenas Conciliar] de forma transparente
      const cleanCategory = category.replace(/\s*\[Apenas Conciliar\]/gi, '').trim();
      const finalCategory = impactsRevenue ? cleanCategory : `${cleanCategory} [Apenas Conciliar]`;
      const cleanJustification = justification.replace(/\s*\[NÃO SOMAR\]/gi, '').trim();
      const finalJustification = impactsRevenue ? cleanJustification : `${cleanJustification} [NÃO SOMAR]`.trim();

      // 1. Atualiza na tabela unificada transactions se existir
      const { data: updatedTx } = await supabase
        .from('transactions')
        .update({
          manual_category: finalCategory,
          manual_justification: finalJustification
        })
        .eq('id', transactionId)
        .select('id, target_date, occurred_at, amount, store_id')
        .maybeSingle();

      if (updatedTx) {
        matchedData = updatedTx;
      }

      // 2. Atualiza em ofx_transactions se existir
      const { data: ofxData } = await supabase
        .from('ofx_transactions')
        .update({
          manual_category: finalCategory,
          manual_justification: finalJustification
        })
        .eq('id', transactionId)
        .select('id, target_date, occurred_at, amount, store_id')
        .maybeSingle();

      if (ofxData && !matchedData) {
        matchedData = ofxData;
      }

      // 3. Atualiza em pos_transactions se existir
      if (!matchedData) {
        const { data: posData } = await supabase
          .from('pos_transactions')
          .update({
            manual_category: finalCategory,
            manual_justification: finalJustification
          })
          .eq('id', transactionId)
          .select('id, target_date, occurred_at, net_amount, gross_amount, store_id')
          .maybeSingle();

        if (posData) {
          matchedData = posData;
        }
      }

      // 3. Sincroniza em daily_revenue_adjustments para impactar o faturamento oficial
      const finalDate = targetDate 
        || matchedData?.target_date 
        || (matchedData?.occurred_at ? matchedData.occurred_at.split('T')[0] : new Date().toISOString().split('T')[0]);
        
      const finalAmount = amount 
        || (matchedData?.amount ? Math.abs(Number(matchedData.amount)) : 0)
        || (matchedData?.net_amount ? Math.abs(Number(matchedData.net_amount)) : 0)
        || (matchedData?.gross_amount ? Math.abs(Number(matchedData.gross_amount)) : 0);

      if (impactsRevenue && finalAmount > 0) {
        await supabase
          .from('daily_revenue_adjustments')
          .upsert({
            id: transactionId,
            date: finalDate,
            title: cleanCategory || 'Receita Avulsa',
            description: cleanJustification || 'Justificado na conciliação da filial',
            type: 'venda_avulsa',
            amount: finalAmount
          }, { onConflict: 'id' });
      } else {
        // Se mudou para NÃO impactar faturamento, remove do daily_revenue_adjustments
        await supabase
          .from('daily_revenue_adjustments')
          .delete()
          .eq('id', transactionId);
      }

      // Invalida todos os caches de conciliação, justificativas e snapshots
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['justified_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
        queryClient.invalidateQueries({ queryKey: ['extrato'] })
      ]);

      return { 
        success: true, 
        data: matchedData || { 
          id: transactionId, 
          manual_category: finalCategory, 
          manual_justification: finalJustification
        } 
      };
    } catch (err: any) {
      console.error('Error categorizing orphan transaction:', err);
      setError(err.message || 'Erro ao salvar justificativa');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { categorize, loading, error };
}
