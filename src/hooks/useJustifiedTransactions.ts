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
  impacts_revenue: boolean;
}

export interface JustifiedTransactionsResult {
  transactions: JustifiedTransactionItem[];
  totalByStore: Record<string, number>;
  totalGlobal: number;
  totalAllByStore: Record<string, number>;
  totalAllGlobal: number;
}

export function useJustifiedTransactions(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery<JustifiedTransactionsResult>({
    queryKey: ['justified_transactions', targetDate],
    queryFn: async (): Promise<JustifiedTransactionsResult> => {
      const itemsMap = new Map<string, JustifiedTransactionItem>();
      const totalByStore: Record<string, number> = {};
      const totalAllByStore: Record<string, number> = {};
      let totalGlobal = 0;
      let totalAllGlobal = 0;

      // 0. Carrega lojas para obter nomes amigáveis
      const { data: storesData } = await supabase.from('stores').select('id, name');
      const storeNameMap: Record<string, string> = {};
      storesData?.forEach((s) => {
        storeNameMap[s.id] = s.name;
      });

      const getStoreLabel = (storeId: string) => storeNameMap[storeId] || storeId || 'Loja Geral';

      const checkImpactsRevenue = (cat?: string, just?: string, isCredit: boolean = true) => {
        // Se for débito/saída (pagamentos, salários, despesas, tarifas, contas), NUNCA impacta faturamento
        if (!isCredit) return false;

        const c = String(cat || '').toLowerCase();
        const j = String(just || '').toLowerCase();

        // Bloqueios explícitos de conciliação / transferência / patrimonial
        if (c.includes('[apenas conciliar]') || c.includes('apenas conciliar') || j.includes('[não somar]') || j.includes('[nao somar]')) {
          return false;
        }
        if (c.includes('rendimento') || c.includes('marco zero') || c.includes('transferência') || c.includes('transferencia') || c.includes('aporte') || c.includes('tarifa') || c.includes('salário') || c.includes('salario') || c.includes('folha') || c.includes('sispag') || c.includes('fornecedor') || c.includes('boleto')) {
          return false;
        }

        // Modelo estritamente opt-in: só soma ao Faturamento se for explicitamente Receita Extra / Venda Não Registrada
        if (c.includes('receita extra') || j.includes('[receita extra]') || c.includes('venda avulsa') || c.includes('receita avulsa') || j.includes('[receita]')) {
          return true;
        }

        // Por padrão, justificativas de conciliação de tesouraria NÃO inflam o Faturamento da empresa
        return false;
      };

      // 1. Busca na tabela unificada `transactions`
      try {
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select('id, store_id, title, subtitle, amount, occurred_at, target_date, manual_category, manual_justification, os_number, status')
          .eq('target_date', targetDate);

        if (!txErr && txData) {
          txData.forEach((row: any) => {
            // Se já for vinculada a uma OS, NÃO conta como justificativa avulsa (evita duplicar no faturamento)
            if (row.os_number || row.status === 'MATCHED') return;

            const hasCat = row.manual_category && String(row.manual_category).trim() !== '';
            const hasJust = row.manual_justification && String(row.manual_justification).trim() !== '';
            if (hasCat || hasJust) {
              const rawAmt = Number(row.amount || 0);
              const isCredit = rawAmt > 0;
              const amt = Math.abs(rawAmt);
              const impacts = checkImpactsRevenue(row.manual_category, row.manual_justification, isCredit);
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
                impacts_revenue: impacts,
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
          .select('id, store_id, bank_name, counterpart_name, amount, type, occurred_at, target_date, manual_category, manual_justification, matched_os_number')
          .eq('target_date', targetDate);

        if (!ofxErr && ofxData) {
          ofxData.forEach((row: any) => {
            // Se já for vinculada a uma OS, NÃO conta como justificativa avulsa
            if (row.matched_os_number) return;

            const hasCat = row.manual_category && String(row.manual_category).trim() !== '';
            const hasJust = row.manual_justification && String(row.manual_justification).trim() !== '';
            if (hasCat || hasJust) {
              const rawAmt = Number(row.amount || 0);
              const isCredit = row.type === 'in' || rawAmt > 0;
              const amt = Math.abs(rawAmt);
              const title = row.bank_name || row.counterpart_name || 'Extrato Itaú OFX';
              const impacts = checkImpactsRevenue(row.manual_category, row.manual_justification, isCredit);
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
                impacts_revenue: impacts,
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
              const rawAmt = Number(row.gross_amount || 0);
              const isCredit = rawAmt > 0;
              const amt = Math.abs(rawAmt);
              const title = `${row.machine_name || 'Rede'} - ${row.payment_method || 'Cartão'}`;
              const impacts = checkImpactsRevenue(row.manual_category, row.manual_justification, isCredit);
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
                impacts_revenue: impacts,
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
        totalAllByStore[item.store_id] = (totalAllByStore[item.store_id] || 0) + item.amount;
        totalAllGlobal += item.amount;

        if (item.impacts_revenue) {
          totalByStore[item.store_id] = (totalByStore[item.store_id] || 0) + item.amount;
          totalGlobal += item.amount;
        }
      });

      return {
        transactions: items,
        totalByStore,
        totalGlobal,
        totalAllByStore,
        totalAllGlobal,
      };
    },
    staleTime: 1000 * 20,
  });
}
