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
    
    // Só dispara se houver lançamentos sem par
    if (unmatchedOs.length === 0 && unmatchedOfx.length === 0 && unmatchedRede.length === 0) return;

    // Trava de hash para não repetir a mesma chamada no mesmo render
    const currentHash = `${storeId}_${targetDate}_os:${unmatchedOs.length}_rede:${unmatchedRede.length}_ofx:${unmatchedOfx.length}`;
    if (processedHashRef.current === currentHash) return;

    processedHashRef.current = currentHash;

    // Dispara a IA silenciosamente em segundo plano (Headless)
    generateTripleMatchSuggestions(aiSettings, unmatchedOs, unmatchedRede, unmatchedOfx, storeId)
      .then(async (matches) => {
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
              console.warn('Aviso: Não foi possível inserir match automático:', insertErr);
            }
          }
          // Invalida a conciliação para refletir os pares no frontend
          queryClient.invalidateQueries({ queryKey: ['conciliacao_detalhes'] });
        }
        
        // Invalida os logs de telemetria para atualizar a tela /agente
        queryClient.invalidateQueries({ queryKey: ['ai_execution_logs'] });
      })
      .catch((err) => {
        console.warn('Execução silenciosa de IA encontrou aviso (não crítico):', err);
      });
  }, [storeId, targetDate, unmatchedOs.length, unmatchedRede.length, unmatchedOfx.length, aiSettings?.api_key, aiSettings?.provider]);
}
