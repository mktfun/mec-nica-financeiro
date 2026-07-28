import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAiSettings } from '@/hooks/useAiSettings';
import { generateTripleMatchSuggestions } from '@/lib/llm-matcher';
import { supabase } from '@/lib/supabase';

export function useBackgroundAiReconciler(
  storeIdOrStores?: string | any[],
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
    if (!targetDate) return;

    const runReconciliation = async () => {
      // Coletar IDs de lojas a processar
      let storeIdsToProcess: string[] = [];

      if (Array.isArray(storeIdOrStores)) {
        storeIdsToProcess = storeIdOrStores.map(s => typeof s === 'string' ? s : s.id).filter(Boolean);
      } else if (typeof storeIdOrStores === 'string' && storeIdOrStores) {
        storeIdsToProcess = [storeIdOrStores];
      }

      if (storeIdsToProcess.length === 0) {
        try {
          const { data: allStores } = await supabase.from('stores').select('id');
          storeIdsToProcess = (allStores || []).map(s => s.id);
        } catch (e) {
          console.warn('Erro ao listar lojas para IA:', e);
          return;
        }
      }

      // Loop Sequencial por cada loja da rede
      for (const currentStoreId of storeIdsToProcess) {
        let finalOs = unmatchedOs;
        let finalRede = unmatchedRede;
        let finalOfx = unmatchedOfx;

        // Se os arrays passados forem vazios ou se estiver processando múltiplas lojas
        if (finalOs.length === 0 && finalRede.length === 0 && finalOfx.length === 0) {
          try {
            const { data: osData } = await supabase
              .from('patio_os')
              .select('*')
              .eq('store_id', currentStoreId)
              .neq('status', 'ENTROU');

            const { data: txData } = await supabase
              .from('transactions')
              .select('*')
              .eq('store_id', currentStoreId)
              .eq('target_date', targetDate);

            // Filtrar transações que já possuem match gravado
            const { data: existingMatches } = await supabase
              .from('conciliation_matches')
              .select('ofx_transaction_id, rede_transaction_id, system_os_number')
              .eq('store_id', currentStoreId);

            const matchedOfxSet = new Set((existingMatches || []).map(m => m.ofx_transaction_id).filter(Boolean));
            const matchedRedeSet = new Set((existingMatches || []).map(m => m.rede_transaction_id).filter(Boolean));
            const matchedOsSet = new Set((existingMatches || []).map(m => m.system_os_number).filter(Boolean));

            finalOs = (osData || []).filter(o => !matchedOsSet.has(o.os_number));
            finalRede = (txData || []).filter(t => (t.source === 'rede' || t.source === 'maquininha') && !matchedRedeSet.has(t.id));
            finalOfx = (txData || []).filter(t => t.source === 'ofx' && !matchedOfxSet.has(t.id));
          } catch (err) {
            console.warn(`Erro ao carregar pendências da loja ${currentStoreId}:`, err);
            continue;
          }
        }

        // Se não houver nada pendente para esta loja, pula
        if (finalOs.length === 0 && finalOfx.length === 0 && finalRede.length === 0) continue;

        // Trava de hash por loja + data + contagem
        const currentHash = `${currentStoreId}_${targetDate}_os:${finalOs.length}_rede:${finalRede.length}_ofx:${finalOfx.length}`;
        if (processedHashRef.current.includes(currentHash)) continue;

        processedHashRef.current += `|${currentHash}`;

        // Fatiamento de OSs em lotes de até 15 para garantir que 100% cheguem à LLM
        const CHUNK_SIZE = 15;
        const osChunks = [];
        if (finalOs.length === 0) {
          osChunks.push([]);
        } else {
          for (let i = 0; i < finalOs.length; i += CHUNK_SIZE) {
            osChunks.push(finalOs.slice(i, i + CHUNK_SIZE));
          }
        }

        for (const osChunk of osChunks) {
          try {
            const matches = await generateTripleMatchSuggestions(aiSettings, osChunk, finalRede, finalOfx, currentStoreId);
            const highConfidenceMatches = matches.filter(m => m.confidence >= 90);

            if (highConfidenceMatches.length > 0) {
              for (const m of highConfidenceMatches) {
                try {
                  await supabase.from('conciliation_matches').insert({
                    store_id: currentStoreId,
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
            console.warn(`Execução silenciosa de IA na loja ${currentStoreId} encontrou aviso:`, err);
          }
        }
      }
    };

    runReconciliation();
  }, [storeIdOrStores, targetDate, unmatchedOs.length, unmatchedRede.length, unmatchedOfx.length, aiSettings?.api_key, aiSettings?.provider]);
}


