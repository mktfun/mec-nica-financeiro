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
    impactsOption: boolean = true,
    amount?: number,
    targetDate?: string,
    type: 'in' | 'out' = 'in',
    storeId?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      let matchedData: any = null;

      const cleanCategory = category.replace(/\s*\[Apenas Conciliar\]/gi, '').trim();
      const finalCategory = impactsOption ? cleanCategory : `${cleanCategory} [Apenas Conciliar]`;
      const cleanJustification = justification.replace(/\s*\[NÃO SOMAR\]/gi, '').trim();
      const finalJustification = impactsOption ? cleanJustification : `${cleanJustification} [NÃO SOMAR]`.trim();

      const finalDate = targetDate || new Date().toISOString().split('T')[0];
      const finalAmount = amount ? Math.abs(Number(amount)) : 0;

      if (type === 'out') {
        // Fluxo de Saída: Utiliza resolve_orphan_saida_ofx
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('resolve_orphan_saida_ofx', {
          p_ofx_id: transactionId,
          p_category: cleanCategory,
          p_justification: cleanJustification,
          p_contabilizar_no_subtotal: impactsOption,
          p_store_id: storeId || null,
          p_amount: finalAmount || null,
          p_target_date: finalDate
        });

        if (rpcErr) {
          console.warn('Fallback para update manual de saída:', rpcErr);
          await supabase
            .from('ofx_transactions')
            .update({
              manual_category: finalCategory,
              manual_justification: finalJustification,
              contabilizar_no_subtotal: impactsOption
            })
            .eq('id', transactionId);

          await supabase
            .from('transactions')
            .update({
              manual_category: finalCategory,
              manual_justification: finalJustification
            })
            .eq('id', transactionId);
        }
      } else {
        // Fluxo de Entrada: Atualiza tabelas e sincroniza daily_revenue_adjustments
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

        const entryAmount = finalAmount 
          || (matchedData?.amount ? Math.abs(Number(matchedData.amount)) : 0)
          || (matchedData?.net_amount ? Math.abs(Number(matchedData.net_amount)) : 0)
          || (matchedData?.gross_amount ? Math.abs(Number(matchedData.gross_amount)) : 0);

        if (impactsOption && entryAmount > 0) {
          await supabase
            .from('daily_revenue_adjustments')
            .upsert({
              id: transactionId,
              date: finalDate,
              title: cleanCategory || 'Receita Avulsa',
              description: cleanJustification || 'Justificado na conciliação da filial',
              type: 'venda_avulsa',
              amount: entryAmount
            }, { onConflict: 'id' });
        } else {
          await supabase
            .from('daily_revenue_adjustments')
            .delete()
            .eq('id', transactionId);
        }
      }

      // Invalida todos os caches de conciliação, justificativas, bills e snapshots
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['justified_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['ofx_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['open-bills-for-step2'] }),
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

