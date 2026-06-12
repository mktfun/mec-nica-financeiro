import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInterestRates } from './useInterestRates';

export type TripleMatchRow = {
  date: string;
  osAmount: number;
  osEstimatedAmount: number; // com juros descontados
  machineAmount: number;
  ofxAmount: number;
  status: 'approved' | 'divergent';
};

export function useTripleMatch(storeId: string | undefined, startDate: string, endDate: string) {
  const { data: rates = [], isLoading: isLoadingRates } = useInterestRates();

  return useQuery({
    queryKey: ['triple-match', storeId, startDate, endDate, rates],
    enabled: !!storeId && !isLoadingRates,
    queryFn: async () => {
      // Pega transações no período (por occurred_at) da loja, que são de 'patio', 'maquininha' ou 'ofx' (do tipo IN)
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('amount, type, source, payment_method, occurred_at')
        .eq('store_id', storeId!)
        .eq('type', 'in') // Apenas entradas para maquininha e ofx, pátio geralmente é IN
        .in('source', ['patio', 'maquininha', 'ofx'])
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate + 'T23:59:59.999Z');

      if (error) throw error;

      // Map to compute daily triple match
      const dailyMap: Record<string, TripleMatchRow> = {};

      const getRateForMethod = (method: string | null) => {
        if (!method) return 0;
        const normalized = method.toLowerCase();
        for (const rate of rates) {
          if (normalized.includes(rate.payment_method.toLowerCase())) {
            return rate.rate_percentage;
          }
        }
        return 0;
      };

      (txs || []).forEach(tx => {
        const dateKey = tx.occurred_at?.split('T')[0];
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

        if (tx.source === 'patio') {
          dailyMap[dateKey].osAmount += amt;
          const rate = getRateForMethod(tx.payment_method);
          const estimatedAmt = amt * (1 - (rate / 100));
          dailyMap[dateKey].osEstimatedAmount += estimatedAmt;
        } else if (tx.source === 'maquininha') {
          dailyMap[dateKey].machineAmount += amt;
        } else if (tx.source === 'ofx') {
          dailyMap[dateKey].ofxAmount += amt;
        }
      });

      const result = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
      
      // Calculate status
      result.forEach(row => {
        // Tolerância de R$ 1.00 ou 1% para aprovar
        const diffOsToMachine = Math.abs(row.osEstimatedAmount - row.machineAmount);
        const diffMachineToOfx = Math.abs(row.machineAmount - row.ofxAmount);
        
        if (
          row.osEstimatedAmount > 0 &&
          diffOsToMachine < 2.0 && 
          diffMachineToOfx < 2.0
        ) {
          row.status = 'approved';
        } else if (
          row.osEstimatedAmount === 0 && row.machineAmount === 0 && row.ofxAmount === 0
        ) {
           row.status = 'approved';
        } else {
          row.status = 'divergent';
        }
      });

      return result;
    }
  });
}
