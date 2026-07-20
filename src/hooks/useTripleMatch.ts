import { useState } from 'react';
import { useAiSettings } from '@/hooks/useAiSettings';
import { generateTripleMatchSuggestions, MatchSuggestion } from '@/lib/llm-matcher';
import { toast } from 'sonner';

export type ExactMatchParsed = {
  os: any;
  rede?: any;
  ofx?: any;
};

export function useTripleMatch() {
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
      // Map parsed data to the format llm-matcher expects (or adjust llm-matcher)
      // llm-matcher expects id, value, paid, date
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
