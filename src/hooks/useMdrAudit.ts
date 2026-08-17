import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CONTRACT_RATES, getContractRate, MdrParsedTransaction } from '@/lib/parsers/redeSalesParser';
import { roundCurrency } from '@/lib/parsers/numberUtils';

export interface MdrAuditFilters {
  storeId?: string | null;
  startDate?: string;
  endDate?: string;
}

export interface MdrAuditData {
  totals: {
    total_gross: number;
    total_net: number;
    total_fees: number;
    total_overcharge: number;
    avg_effective_rate_pct: number;
    divergent_count: number;
    total_count: number;
  };
  by_brand: Array<{
    brand: string;
    gross: number;
    net: number;
    fees: number;
    overcharge: number;
    effective_rate_pct: number;
    contracted_rate_pct: number;
  }>;
  by_store: Array<{
    store_id: string;
    store_name: string;
    gross: number;
    net: number;
    fees: number;
    overcharge: number;
    effective_rate_pct: number;
    divergent_count: number;
  }>;
  transactions: Array<{
    id: string;
    store_id: string;
    store_name: string;
    machine_name: string;
    payment_method: string;
    brand: string;
    gross_amount: number;
    net_amount: number;
    fee_amount: number;
    effective_rate_pct: number;
    contracted_rate_pct: number;
    divergence_pct: number;
    overcharge_amount: number;
    audit_status: 'conforme' | 'atencao' | 'divergente' | 'sem_contrato';
    occurred_at: string;
    target_date: string;
  }>;
}

export function useMdrAudit(filters?: MdrAuditFilters) {
  const storeId = filters?.storeId || null;
  const startDate = filters?.startDate || '2026-08-13';
  const endDate = filters?.endDate || '2026-08-14';

  return useQuery<MdrAuditData>({
    queryKey: ['mdr_audit_summary', storeId, startDate, endDate],
    queryFn: async () => {
      // 1. Tenta chamada direta à RPC
      try {
        const { data, error } = await supabase.rpc('get_mdr_audit_summary', {
          p_store_id: storeId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (!error && data && data.totals) {
          return data as MdrAuditData;
        }
      } catch (e) {
        console.warn('Fallback para cálculo cliente de auditoria MDR...');
      }

      // 2. Fallback resiliente no cliente com dados do banco
      let query = supabase
        .from('pos_transactions')
        .select(`
          id,
          store_id,
          machine_name,
          payment_method,
          gross_amount,
          net_amount,
          fee_amount,
          occurred_at,
          target_date,
          stores ( id, name )
        `)
        .gte('target_date', startDate)
        .lte('target_date', endDate);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: posData, error: posError } = await query;
      if (posError) throw posError;

      const txs = posData || [];
      let totalGross = 0;
      let totalNet = 0;
      let totalFees = 0;
      let totalOvercharge = 0;
      let divergentCount = 0;

      const brandMap: Record<string, { gross: number; net: number; fees: number; overcharge: number; count: number; contractedRate: number }> = {};
      const storeMap: Record<string, { store_id: string; store_name: string; gross: number; net: number; fees: number; overcharge: number; divergent_count: number }> = {};

      const processedTransactions = txs.map((row: any) => {
        const gross = Number(row.gross_amount || 0);
        const net = Number(row.net_amount || 0);
        let fee = Number(row.fee_amount || 0);
        if (fee === 0 && gross > net) fee = gross - net;

        const storeName = row.stores?.name || row.store_id || 'Loja Não Identificada';
        const machine = (row.machine_name || '').toLowerCase();
        const method = (row.payment_method || '').toLowerCase();
        const combined = `${machine} ${method}`;

        let brand = 'Outras';
        if (combined.includes('visa')) brand = 'Visa';
        else if (combined.includes('mast')) brand = 'Mastercard';
        else if (combined.includes('elo')) brand = 'Elo';
        else if (combined.includes('hiper')) brand = 'Hipercard';
        else if (combined.includes('pix')) brand = 'PIX';

        let methodType: MdrParsedTransaction['method'] = 'Cartão Crédito À Vista';
        if (combined.includes('débito') || combined.includes('debito')) methodType = 'Cartão Débito';
        else if (combined.includes('pix')) methodType = 'PIX';

        const effectiveRate = gross > 0 ? roundCurrency(((gross - net) / gross) * 100) : 0;
        const contractedRate = getContractRate(brand, methodType);
        const divergence = roundCurrency(effectiveRate - contractedRate);

        let overcharge = 0;
        let status: 'conforme' | 'atencao' | 'divergente' = 'conforme';

        if (divergence > 0.30) {
          status = 'divergente';
          overcharge = roundCurrency((divergence * gross) / 100);
          divergentCount++;
        } else if (divergence > 0.10) {
          status = 'atencao';
          overcharge = roundCurrency((divergence * gross) / 100);
        }

        totalGross = roundCurrency(totalGross + gross);
        totalNet = roundCurrency(totalNet + net);
        totalFees = roundCurrency(totalFees + fee);
        totalOvercharge = roundCurrency(totalOvercharge + overcharge);

        // Agrupa por Brand
        if (!brandMap[brand]) {
          brandMap[brand] = { gross: 0, net: 0, fees: 0, overcharge: 0, count: 0, contractedRate };
        }
        brandMap[brand].gross = roundCurrency(brandMap[brand].gross + gross);
        brandMap[brand].net = roundCurrency(brandMap[brand].net + net);
        brandMap[brand].fees = roundCurrency(brandMap[brand].fees + fee);
        brandMap[brand].overcharge = roundCurrency(brandMap[brand].overcharge + overcharge);
        brandMap[brand].count++;

        // Agrupa por Store
        if (!storeMap[row.store_id]) {
          storeMap[row.store_id] = { store_id: row.store_id, store_name: storeName, gross: 0, net: 0, fees: 0, overcharge: 0, divergent_count: 0 };
        }
        storeMap[row.store_id].gross = roundCurrency(storeMap[row.store_id].gross + gross);
        storeMap[row.store_id].net = roundCurrency(storeMap[row.store_id].net + net);
        storeMap[row.store_id].fees = roundCurrency(storeMap[row.store_id].fees + fee);
        storeMap[row.store_id].overcharge = roundCurrency(storeMap[row.store_id].overcharge + overcharge);
        if (status === 'divergente') storeMap[row.store_id].divergent_count++;

        return {
          id: row.id,
          store_id: row.store_id,
          store_name: storeName,
          machine_name: row.machine_name || 'Rede',
          payment_method: row.payment_method || 'Cartão',
          brand,
          gross_amount: gross,
          net_amount: net,
          fee_amount: fee,
          effective_rate_pct: effectiveRate,
          contracted_rate_pct: contractedRate,
          divergence_pct: divergence,
          overcharge_amount: overcharge,
          audit_status: status,
          occurred_at: row.occurred_at || row.target_date,
          target_date: row.target_date,
        };
      });

      const by_brand = Object.entries(brandMap).map(([brand, d]) => ({
        brand,
        gross: d.gross,
        net: d.net,
        fees: d.fees,
        overcharge: d.overcharge,
        effective_rate_pct: d.gross > 0 ? roundCurrency((d.fees / d.gross) * 100) : 0,
        contracted_rate_pct: d.contractedRate,
      })).sort((a, b) => b.gross - a.gross);

      const by_store = Object.values(storeMap).map(d => ({
        store_id: d.store_id,
        store_name: d.store_name,
        gross: d.gross,
        net: d.net,
        fees: d.fees,
        overcharge: d.overcharge,
        effective_rate_pct: d.gross > 0 ? roundCurrency((d.fees / d.gross) * 100) : 0,
        divergent_count: d.divergent_count,
      })).sort((a, b) => b.overcharge - a.overcharge);

      const avg_effective_rate_pct = totalGross > 0 ? roundCurrency((totalFees / totalGross) * 100) : 0;

      return {
        totals: {
          total_gross: totalGross,
          total_net: totalNet,
          total_fees: totalFees,
          total_overcharge: totalOvercharge,
          avg_effective_rate_pct,
          divergent_count: divergentCount,
          total_count: txs.length,
        },
        by_brand,
        by_store,
        transactions: processedTransactions.sort((a, b) => b.overcharge_amount - a.overcharge_amount),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}
