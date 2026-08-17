import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface JustifiedTransactionItem {
  id: string;
  store_id: string;
  store_name: string;
  source_table: 'transactions' | 'ofx' | 'pos' | 'manual';
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
      const itemsMap = new Map<string, JustifiedTransactionItem>();
      const totalByStore: Record<string, number> = {};
      let totalGlobal = 0;

      // 0. Carrega lojas para obter nomes amigáveis
      const { data: storesData } = await supabase.from('stores').select('id, name');
      const storeNameMap: Record<string, string> = {};
      storesData?.forEach((s) => {
        storeNameMap[s.id] = s.name;
      });

      const getStoreLabel = (storeId: string) => storeNameMap[storeId] || storeId || 'Loja Geral';

      // 1. Busca na tabela unificada `transactions`
      try {
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select('id, store_id, title, subtitle, amount, occurred_at, target_date, manual_category, manual_justification, os_number, match_status')
          .eq('target_date', targetDate);

        if (!txErr && txData) {
          txData.forEach((row: any) => {
            // Se já for vinculada a uma OS, NÃO conta como justificativa avulsa (evita duplicar no faturamento)
            if (row.os_number || row.match_status === 'MATCHED') return;

            const hasCat = row.manual_category && String(row.manual_category).trim() !== '';
            const hasJust = row.manual_justification && String(row.manual_justification).trim() !== '';
            if (hasCat || hasJust) {
              const amt = Math.abs(Number(row.amount || 0));
              itemsMap.set(row.id, {
                id: row.id,
                store_id: row.store_id || 'st-01',
                store_name: getStoreLabel(row.store_id),
                source_table: 'transactions',
                date: row.target_date || targetDate,
                title: row.title || row.subtitle || 'Transação',
                amount: amt,
                category: row.manual_category || 'Ajuste Geral',
                justification: row.manual_justification || 'Justificado',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao consultar transactions unificadas:', e);
      }

      // 2. Busca em `ofx_transactions` (usando bank_name e counterpart_name)
      try {
        const { data: ofxData, error: ofxErr } = await supabase
          .from('ofx_transactions')
          .select('id, store_id, bank_name, counterpart_name, amount, occurred_at, target_date, manual_category, manual_justification, matched_os_number')
          .eq('target_date', targetDate);

        if (!ofxErr && ofxData) {
          ofxData.forEach((row: any) => {
            // Se já for vinculada a uma OS, NÃO conta como justificativa avulsa
            if (row.matched_os_number) return;

            const hasCat = row.manual_category && String(row.manual_category).trim() !== '';
            const hasJust = row.manual_justification && String(row.manual_justification).trim() !== '';
            if (hasCat || hasJust) {
              const amt = Math.abs(Number(row.amount || 0));
              const title = row.bank_name || row.counterpart_name || 'Extrato Itaú OFX';
              itemsMap.set(row.id, {
                id: row.id,
                store_id: row.store_id || 'st-01',
                store_name: getStoreLabel(row.store_id),
                source_table: 'ofx',
                date: row.target_date || targetDate,
                title,
                amount: amt,
                category: row.manual_category || 'Ajuste OFX',
                justification: row.manual_justification || 'Justificado',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao consultar ofx_transactions:', e);
      }

      // 3. Busca em `pos_transactions` (maquininhas)
      try {
        const { data: posData, error: posErr } = await supabase
          .from('pos_transactions')
          .select('id, store_id, machine_name, payment_method, gross_amount, target_date, manual_category, manual_justification')
          .eq('target_date', targetDate);

        if (!posErr && posData) {
          posData.forEach((row: any) => {
            const hasCat = row.manual_category && String(row.manual_category).trim() !== '';
            const hasJust = row.manual_justification && String(row.manual_justification).trim() !== '';
            if (hasCat || hasJust) {
              const amt = Math.abs(Number(row.gross_amount || 0));
              const title = `${row.machine_name || 'Rede'} - ${row.payment_method || 'Cartão'}`;
              itemsMap.set(row.id, {
                id: row.id,
                store_id: row.store_id || 'st-01',
                store_name: getStoreLabel(row.store_id),
                source_table: 'pos',
                date: row.target_date || targetDate,
                title,
                amount: amt,
                category: row.manual_category || 'Ajuste Maquininha',
                justification: row.manual_justification || 'Justificado',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao consultar pos_transactions:', e);
      }

      // 4. Consolida totais por loja e global
      const items = Array.from(itemsMap.values());
      items.forEach((item) => {
        totalByStore[item.store_id] = (totalByStore[item.store_id] || 0) + item.amount;
        totalGlobal += item.amount;
      });

      return {
        transactions: items,
        totalByStore,
        totalGlobal,
      };
    },
    staleTime: 1000 * 20,
  });
}
