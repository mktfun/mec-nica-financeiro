import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface JustifiedTransactionItem {
  id: string;
  store_id: string;
  store_name: string;
  source_table: 'ofx' | 'pos' | 'manual';
  date: string;
  title: string;
  amount: number;
  category: string;
  justification: string;
}

export interface JustifiedTransactionsResult {
  transactions: JustifiedTransactionItem[];
  totalByStore: Record<string, number>;
  totalGlobal: number;
}

export function useJustifiedTransactions(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery<JustifiedTransactionsResult>({
    queryKey: ['justified_transactions', targetDate],
    queryFn: async (): Promise<JustifiedTransactionsResult> => {
      const items: JustifiedTransactionItem[] = [];
      const totalByStore: Record<string, number> = {};
      let totalGlobal = 0;

      // 1. Busca transações do OFX justificadas
      const { data: ofxData, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .select(`
          id,
          store_id,
          title,
          amount,
          date,
          manual_category,
          manual_justification,
          stores ( id, name )
        `)
        .not('manual_justification', 'is', null)
        .gte('date', `${targetDate}T00:00:00`)
        .lte('date', `${targetDate}T23:59:59`);

      if (!ofxErr && ofxData) {
        ofxData.forEach((row: any) => {
          const storeName = row.stores?.name || row.store_id || 'Loja Não Identificada';
          const amt = Math.abs(Number(row.amount || 0));
          items.push({
            id: row.id,
            store_id: row.store_id,
            store_name: storeName,
            source_table: 'ofx',
            date: row.date,
            title: row.title || 'Transação Bancária OFX',
            amount: amt,
            category: row.manual_category || 'Outros',
            justification: row.manual_justification || 'Justificado',
          });
          totalByStore[row.store_id] = (totalByStore[row.store_id] || 0) + amt;
          totalGlobal += amt;
        });
      }

      // 2. Busca transações de Maquininhas (POS) justificadas
      const { data: posData, error: posErr } = await supabase
        .from('pos_transactions')
        .select(`
          id,
          store_id,
          machine_name,
          payment_method,
          gross_amount,
          target_date,
          manual_category,
          manual_justification,
          stores ( id, name )
        `)
        .not('manual_justification', 'is', null)
        .eq('target_date', targetDate);

      if (!posErr && posData) {
        posData.forEach((row: any) => {
          const storeName = row.stores?.name || row.store_id || 'Loja Não Identificada';
          const amt = Math.abs(Number(row.gross_amount || 0));
          items.push({
            id: row.id,
            store_id: row.store_id,
            store_name: storeName,
            source_table: 'pos',
            date: row.target_date,
            title: `${row.machine_name || 'Rede'} - ${row.payment_method || 'Cartão'}`,
            amount: amt,
            category: row.manual_category || 'Outros',
            justification: row.manual_justification || 'Justificado',
          });
          totalByStore[row.store_id] = (totalByStore[row.store_id] || 0) + amt;
          totalGlobal += amt;
        });
      }

      // 3. Busca transações manuais justificadas
      const { data: manData, error: manErr } = await supabase
        .from('manual_transactions')
        .select(`
          id,
          store_id,
          title,
          amount,
          date,
          manual_category,
          manual_justification,
          stores ( id, name )
        `)
        .not('manual_justification', 'is', null)
        .eq('date', targetDate);

      if (!manErr && manData) {
        manData.forEach((row: any) => {
          const storeName = row.stores?.name || row.store_id || 'Loja Não Identificada';
          const amt = Math.abs(Number(row.amount || 0));
          items.push({
            id: row.id,
            store_id: row.store_id,
            store_name: storeName,
            source_table: 'manual',
            date: row.date,
            title: row.title || 'Ajuste Manual',
            amount: amt,
            category: row.manual_category || 'Outros',
            justification: row.manual_justification || 'Justificado',
          });
          totalByStore[row.store_id] = (totalByStore[row.store_id] || 0) + amt;
          totalGlobal += amt;
        });
      }

      return {
        transactions: items,
        totalByStore,
        totalGlobal,
      };
    },
    staleTime: 1000 * 30, // 30 segundos
  });
}
