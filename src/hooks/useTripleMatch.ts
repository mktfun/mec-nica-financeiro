import { useState } from 'react';
import { useAiSettings } from '@/hooks/useAiSettings';
import { generateTripleMatchSuggestions, MatchSuggestion } from '@/lib/llm-matcher';
import { toast } from 'sonner';

export type ExactMatchParsed = {
  os: any;
  rede?: any;
  ofx?: any;
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type TripleMatchRow = {
  date: string;
  osAmount: number;
  osEstimatedAmount: number; // com juros descontados
  machineAmount: number;
  ofxAmount: number;
  status: 'approved' | 'divergent';
};

export function useTripleMatch(storeId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['triple-match', storeId, startDate, endDate],
    enabled: !!storeId,
    queryFn: async () => {
      // Pega transações no período (por target_date) da loja
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('amount, type, source, payment_method, target_date')
        .eq('store_id', storeId!)
        .eq('type', 'in')
        .in('source', ['sistema', 'patio', 'rede', 'maquininha', 'ofx'])
        .gte('target_date', startDate)
        .lte('target_date', endDate);

      if (error) throw error;

      // Map to compute daily triple match base no target_date
      const dailyMap: Record<string, TripleMatchRow> = {};

      (txs || []).forEach(tx => {
        const dateKey = tx.target_date;
        if (!dateKey) return;
        
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            osAmount: 0,
            osEstimatedAmount: 0,
            machineAmount: 0,
            ofxAmount: 0,
            status: 'divergent'
          };
        }

        const amt = Number(tx.amount || 0);

        if (tx.source === 'sistema' || tx.source === 'patio') {
          dailyMap[dateKey].osAmount += amt;
          dailyMap[dateKey].osEstimatedAmount += amt; 
        } else if (tx.source === 'rede' || tx.source === 'maquininha') {
          dailyMap[dateKey].machineAmount += amt;
        } else if (tx.source === 'ofx') {
          dailyMap[dateKey].ofxAmount += amt;
        }
      });

      const result = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
      
      // Calculate status inteligente (Desacoplamento do OFX para maquininha)
      result.forEach(row => {
        // Tolerância de R$ 2.00 para aprovar
        const diffOsToMachine = Math.abs(row.osEstimatedAmount - row.machineAmount);
        const diffOsToOfx = Math.abs(row.osEstimatedAmount - row.ofxAmount);
        
        if (row.osEstimatedAmount > 0) {
           if (row.machineAmount > 0) {
             // Se tem registro de maquininha, a OS deve bater com ela (ignora OFX pois cai agrupado)
             row.status = diffOsToMachine < 2.0 ? 'approved' : 'divergent';
           } else {
             // Se não tem maquininha (ex: PIX), a OS deve bater direto no Extrato (OFX)
             row.status = diffOsToOfx < 2.0 ? 'approved' : 'divergent';
           }
        } else if (row.machineAmount === 0 && row.ofxAmount === 0) {
           row.status = 'approved';
        } else {
          row.status = 'divergent';
        }
      });

      return result;
    }
  });
}

export function useTripleMatchAI() {
  const [exactMatches, setExactMatches] = useState<ExactMatchParsed[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<MatchSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: settings } = useAiSettings();

  const runExactMatch = (osList: any[], redeList: any[], ofxList: any[]) => {
    const matches: ExactMatchParsed[] = [];
    const unmatchedOs = [...osList];
    const unmatchedRede = [...redeList];
    const unmatchedOfx = [...ofxList];

    for (let i = unmatchedOs.length - 1; i >= 0; i--) {
      const os = unmatchedOs[i];
      const osPaid = os.paid_value || (os.delta_paid !== undefined ? os.delta_paid : 0);
      
      const redeIdx = unmatchedRede.findIndex(r => r.netAmount === osPaid || r.grossAmount === osPaid || r.amount === osPaid);
      let rede: any = undefined;
      if (redeIdx !== -1) {
        rede = unmatchedRede[redeIdx];
        unmatchedRede.splice(redeIdx, 1);
      }

      const ofxIdx = unmatchedOfx.findIndex(t => t.amount === osPaid);
      let ofx: any = undefined;
      if (ofxIdx !== -1) {
        ofx = unmatchedOfx[ofxIdx];
        unmatchedOfx.splice(ofxIdx, 1);
      }

      if (rede || ofx) {
        matches.push({ os, rede, ofx });
        unmatchedOs.splice(i, 1);
      }
    }

    setExactMatches(matches);
    return { matches, unmatchedOs, unmatchedRede, unmatchedOfx };
  };

  const runAiMatch = async (unmatchedOs: any[], unmatchedRede: any[], unmatchedOfx: any[]) => {
    if (!settings || !settings.api_key) {
      toast.error('Configure a API Key da Inteligência Artificial em Ajustes primeiro.');
      return;
    }

    if (unmatchedOs.length === 0) {
      toast.info('Não há Ordens de Serviço sem match para enviar para a IA.');
      return;
    }

    setIsProcessing(true);
    try {
      const osMapped = unmatchedOs.map((o, i) => ({ id: o.os_number || `os_${i}`, total_value: o.total_value, paid_value: o.paid_value, exit_date: o.closed_at || o.opened_at, customer_name: o.plate }));
      const redeMapped = unmatchedRede.map((r, i) => ({ id: r.nsu || `rede_${i}`, net_value: r.netAmount || r.amount, gross_value: r.grossAmount || r.amount, payment_date: r.date || r.dateVenda, nsu: r.nsu || '' }));
      const ofxMapped = unmatchedOfx.map((t, i) => ({ id: t.fitid || `ofx_${i}`, amount: t.amount, date: t.date, memo: t.title }));

      const suggestions = await generateTripleMatchSuggestions(settings, osMapped as any, redeMapped as any, ofxMapped as any);
      setAiSuggestions(suggestions);
      toast.success(`${suggestions.length} sugestões de conciliação encontradas pela IA!`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    exactMatches,
    aiSuggestions,
    isProcessing,
    runExactMatch,
    runAiMatch,
    setAiSuggestions
  };
}
