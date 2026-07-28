import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAiSettings } from '@/hooks/useAiSettings';
import { generateTripleMatchSuggestions } from '@/lib/llm-matcher';
import { supabase } from '@/lib/supabase';

export function useBackgroundAiReconciler(
  storeId?: string,
  targetDate?: string,
  unmatchedOs: any[] = [],
  unmatchedRede: any[] = [],
  unmatchedOfx: any[] = []
) {
  const { data: aiSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const processedHashRef = useRef<string>('');

  useEffect(() => {
    if (!aiSettings?.api_key || !aiSettings.provider) return;
    if (!storeId || !targetDate) return;

    const runReconciliation = async () => {
      let finalOs = unmatchedOs;
      let finalRede = unmatchedRede;
      let finalOfx = unmatchedOfx;

      // Se os arrays passados forem vazios, faz busca direta das pendências reais da loja/data no Supabase
      if (finalOs.length === 0 && finalRede.length === 0 && finalOfx.length === 0) {
        try {
          const { data: osData } = await supabase
            .from('patio_os')
            .select('*')
            .eq('store_id', storeId)
            .neq('status', 'ENTROU')
            .limit(20);

          const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('store_id', storeId)
            .eq('target_date', targetDate);

          finalOs = osData || [];
          finalRede = txData?.filter(t => t.source === 'rede' || t.source === 'maquininha') || [];
          finalOfx = txData?.filter(t => t.source === 'ofx') || [];
        } catch (err) {
          console.warn('Erro ao carregar pendências para IA:', err);
        }
      }

      // Só dispara se houver lançamentos pendentes
      if (finalOs.length === 0 && finalOfx.length === 0 && finalRede.length === 0) return;

      // Trava de hash para não repetir no mesmo render
      const currentHash = `${storeId}_${targetDate}_os:${finalOs.length}_rede:${finalRede.length}_ofx:${finalOfx.length}`;
      if (processedHashRef.current === currentHash) return;

      processedHashRef.current = currentHash;

      // Dispara a IA silenciosamente em segundo plano (Headless)
      try {
        const matches = await generateTripleMatchSuggestions(aiSettings, finalOs, finalRede, finalOfx, storeId);
        const highConfidenceMatches = matches.filter(m => m.confidence >= 90);

        if (highConfidenceMatches.length > 0) {
          for (const m of highConfidenceMatches) {
            try {
              await supabase.from('conciliation_matches').insert({
                store_id: storeId,
                target_date: targetDate,
                match_type: m.match_type,
                system_os_number: m.os_number || null,
                confidence_score: m.confidence,
                reasoning: m.reasoning,
                created_at: new Date().toISOString()
              });
            } catch (insertErr) {
              console.warn('Aviso ao inserir match automático:', insertErr);
            }
          }
          queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
          queryClient.invalidateQueries({ queryKey: ['conciliacao_detalhes'] });
        }

        queryClient.invalidateQueries({ queryKey: ['ai_execution_logs'] });
      } catch (err) {
        console.warn('Execução silenciosa de IA encontrou aviso (não crítico):', err);
      }
    };

    runReconciliation();
  }, [storeId, targetDate, unmatchedOs.length, unmatchedRede.length, unmatchedOfx.length, aiSettings?.api_key, aiSettings?.provider]);
}

