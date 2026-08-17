import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CONTRACT_RATES, getContractRate, MdrParsedTransaction } from '@/lib/parsers/redeSalesParser';
import { roundCurrency } from '@/lib/parsers/numberUtils';

export interface MdrAuditFilters {
  storeId?: string | null;
  startDate?: string;
  endDate?: string;
  brand?: string | null;
  divergenceOnly?: boolean;
}

export interface DailyMdrItem {
  date: string;
  gross: number;
  net: number;
  fees: number;
  overcharge: number;
  effective_rate_pct: number;
  count: number;
  divergent_count: number;
}

export interface BrandMdrItem {
  brand: string;
  gross: number;
  net: number;
  fees: number;
  overcharge: number;
  effective_rate_pct: number;
  contracted_rate_pct: number;
}

export interface StoreMdrItem {
  store_id: string;
  store_name: string;
  gross: number;
  net: number;
  fees: number;
  overcharge: number;
  effective_rate_pct: number;
  divergent_count: number;
}

export interface TransactionMdrItem {
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
  by_day: DailyMdrItem[];
  by_brand: BrandMdrItem[];
  by_store: StoreMdrItem[];
  transactions: TransactionMdrItem[];
}

export function useMdrAudit(filters?: MdrAuditFilters) {
  const storeId = filters?.storeId || null;
  const startDate = filters?.startDate || '2026-08-01';
  const endDate = filters?.endDate || '2026-08-31';
  const brandFilter = filters?.brand || null;
  const divergenceOnly = !!filters?.divergenceOnly;

  return useQuery<MdrAuditData>({
    queryKey: ['mdr_audit_summary', storeId, startDate, endDate, brandFilter, divergenceOnly],
    queryFn: async (): Promise<MdrAuditData> => {
      // 1. Carrega contratos do banco para comparação dinâmica
      const { data: contractsData } = await supabase
        .from('pos_fee_contracts')
        .select('*')
        .eq('active', true);

      const contractMap = new Map<string, number>();
      (contractsData || []).forEach(c => {
        const key = `${c.brand.toLowerCase()}_${c.method.toLowerCase()}`;
        contractMap.set(key, Number(c.contracted_mdr_percent));
      });

      // 2. Consulta transações de maquininhas do Supabase (pos_transactions e fallback receivables)
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
      if (posError) {
        console.warn('Erro ao consultar pos_transactions:', posError.message);
      }

      let txs = (posData || []) as any[];

      // Se não houver pos_transactions, busca em receivables de cartão
      if (txs.length === 0) {
        let recQuery = supabase
          .from('receivables')
          .select(`
            id,
            store_id,
            acquirer,
            card_brand,
            gross_amount,
            net_amount,
            fee_amount,
            expected_date,
            stores ( id, name )
          `)
          .gte('expected_date', startDate)
          .lte('expected_date', endDate);

        if (storeId) {
          recQuery = recQuery.eq('store_id', storeId);
        }

        const { data: recData } = await recQuery;
        if (recData && recData.length > 0) {
          txs = recData.map(r => ({
            id: r.id,
            store_id: r.store_id,
            machine_name: r.acquirer || 'Rede',
            payment_method: r.card_brand ? `Cartão ${r.card_brand}` : 'Cartão',
            gross_amount: r.gross_amount,
            net_amount: r.net_amount,
            fee_amount: r.fee_amount,
            occurred_at: r.expected_date,
            target_date: r.expected_date,
            stores: r.stores
          }));
        }
      }

      let totalGross = 0;
      let totalNet = 0;
      let totalFees = 0;
      let totalOvercharge = 0;
      let divergentCount = 0;

      const dayMap: Record<string, { gross: number; net: number; fees: number; overcharge: number; count: number; divergent_count: number }> = {};
      const brandMap: Record<string, { gross: number; net: number; fees: number; overcharge: number; count: number; contractedRate: number }> = {};
      const storeMap: Record<string, { store_id: string; store_name: string; gross: number; net: number; fees: number; overcharge: number; divergent_count: number }> = {};

      const processedTransactions: TransactionMdrItem[] = [];

      txs.forEach((row: any) => {
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
        else if (combined.includes('parcelado') || combined.includes('parc')) methodType = 'Cartão Parcelado Loja';
        else if (combined.includes('pix')) methodType = 'PIX';

        const effectiveRate = gross > 0 ? roundCurrency(((gross - net) / gross) * 100) : 0;
        
        // Pega taxa de contrato customizada do banco ou default
        const contractKey = `${brand.toLowerCase()}_${methodType.toLowerCase()}`;
        const contractedRate = contractMap.has(contractKey) 
          ? (contractMap.get(contractKey) || 0) 
          : getContractRate(brand, methodType);

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

        // Agrupa por Dia
        const dayKey = row.target_date || (row.occurred_at ? row.occurred_at.split('T')[0] : '2026-08-17');
        if (!dayMap[dayKey]) {
          dayMap[dayKey] = { gross: 0, net: 0, fees: 0, overcharge: 0, count: 0, divergent_count: 0 };
        }
        dayMap[dayKey].gross = roundCurrency(dayMap[dayKey].gross + gross);
        dayMap[dayKey].net = roundCurrency(dayMap[dayKey].net + net);
        dayMap[dayKey].fees = roundCurrency(dayMap[dayKey].fees + fee);
        dayMap[dayKey].overcharge = roundCurrency(dayMap[dayKey].overcharge + overcharge);
        dayMap[dayKey].count++;
        if (status === 'divergente') dayMap[dayKey].divergent_count++;

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

        processedTransactions.push({
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
        });
      });

      const by_day: DailyMdrItem[] = Object.entries(dayMap).map(([date, d]) => ({
        date,
        gross: d.gross,
        net: d.net,
        fees: d.fees,
        overcharge: d.overcharge,
        effective_rate_pct: d.gross > 0 ? roundCurrency((d.fees / d.gross) * 100) : 0,
        count: d.count,
        divergent_count: d.divergent_count,
      })).sort((a, b) => b.date.localeCompare(a.date));

      const by_brand: BrandMdrItem[] = Object.entries(brandMap).map(([brand, d]) => ({
        brand,
        gross: d.gross,
        net: d.net,
        fees: d.fees,
        overcharge: d.overcharge,
        effective_rate_pct: d.gross > 0 ? roundCurrency((d.fees / d.gross) * 100) : 0,
        contracted_rate_pct: d.contractedRate,
      })).sort((a, b) => b.gross - a.gross);

      const by_store: StoreMdrItem[] = Object.values(storeMap).map(d => ({
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

      let filteredTransactions = processedTransactions;
      if (brandFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.brand.toLowerCase() === brandFilter.toLowerCase());
      }
      if (divergenceOnly) {
        filteredTransactions = filteredTransactions.filter(t => t.audit_status === 'divergente');
      }

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
        by_day,
        by_brand,
        by_store,
        transactions: filteredTransactions.sort((a, b) => b.overcharge_amount - a.overcharge_amount),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}
