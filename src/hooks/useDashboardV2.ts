import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  saldoAtual: number;
  faturamento: number;
  contas: number;
  resultado: number;
  statusConciliacao: 'approved' | 'divergence' | 'pending';
  veiculosPatio: number;
  veiculosPatioValor: number;
}

export interface DashboardV2Data {
  dataAtual: string;
  dataAnterior: string;
  saldoTotal: number;
  caixaAtual: number;
  contasAPagar: number;
  diferenca: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFaturamento: number;
  fluxoCaixa: number;
  aReceber: number;
  veiculosPatio: number;
  veiculosPatioValor: number;
  porLoja: StoreMetrics[];
  historicoSaldos: { date: string; saldo: number }[];
}

export function useDashboardV2(selectedDateStr?: string) {
  return useQuery({
    queryKey: ['dashboard-v2', selectedDateStr || 'latest'],
    queryFn: async (): Promise<DashboardV2Data> => {
      // 1. Descobrir as datas
      const { data: datesData, error: datesErr } = await supabase
        .from('reconciliations')
        .select('date')
        .order('date', { ascending: false });

      if (datesErr) throw datesErr;

      // Pega as datas únicas, decrescentes
      const uniqueDates = Array.from(new Set((datesData || []).map(d => d.date)));
      
      let dateAtual = selectedDateStr || uniqueDates[0] || new Date().toISOString().split('T')[0];
      
      // Se a data selecionada for de um final de semana e não tiver fechamento, vamos tentar 
      // achar a conciliação mais próxima anterior. Mas o fallback seguro é apenas filtrar.
      const validPastDates = uniqueDates.filter(d => d <= dateAtual);
      dateAtual = validPastDates[0] || dateAtual; // Ancorar na data real de fechamento mais próxima

      const dateAnterior = validPastDates[1] || dateAtual;
      
      const last15Dates = validPastDates.slice(0, 15).reverse();

      // 2. Disparar queries paralelas baseadas na dateAtual
      const [
        recsAll, 
        recsCurr, 
        recsPrev, 
        patioOs, 
        contasRows, 
        storesRes,
        historicoRes
      ] = await Promise.all([
        // Saldo atual (mais recente de todas as lojas)
        supabase
          .from('reconciliations')
          .select('store_id, bank_total, date, os_total, divergence, status')
          .order('date', { ascending: false }),

        // Faturamento da ÚLTIMA CONCILIAÇÃO
        supabase
          .from('reconciliations')
          .select('store_id, os_total, financial_total, divergence, status, date')
          .eq('date', dateAtual),

        // Faturamento da PENÚLTIMA CONCILIAÇÃO
        supabase
          .from('reconciliations')
          .select('store_id, os_total')
          .eq('date', dateAnterior),

        // Pátio OS — a receber e veículos
        supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status'),

        // Contas a pagar global (o que está no cache da oficina_contas)
        supabase
          .from('oficina_contas')
          .select('store_id, valor_em_aberto, tipo, status')
          .eq('tipo', 'PAGAR')
          .not('status', 'in', '("PAG","PAGO","pago","pag")'),

        // Lojas
        supabase.from('stores').select('id, name'),

        // Histórico dos últimos 15 dias (para evolução do saldo)
        last15Dates.length > 0 
          ? supabase
              .from('reconciliations')
              .select('date, bank_total')
              .in('date', last15Dates)
          : Promise.resolve({ data: [] })
      ]);

      // Construir lookup de nomes de lojas
      const storeMap: Record<string, string> = {};
      (storesRes.data || []).forEach((s: { id: string; name: string }) => {
        storeMap[s.id] = s.name;
      });

      // --- Saldo Atual por Loja (mais recente de recsAll independente da data) ---
      // Caso alguma loja não tenha conciliação no dateAtual, pegamos o último disponível
      const latestByStore: Record<string, { bank_total: number; date: string }> = {};
      for (const row of recsAll.data || []) {
        if (!latestByStore[row.store_id] || row.date > latestByStore[row.store_id].date) {
          latestByStore[row.store_id] = { bank_total: Number(row.bank_total || 0), date: row.date };
        }
      }
      const saldoTotal = Object.values(latestByStore).reduce((acc, v) => acc + v.bank_total, 0);

      // Saldo anterior para fluxo de caixa (saldo até dateAnterior)
      const latestPrevByStore: Record<string, number> = {};
      for (const row of recsAll.data || []) {
        if (row.date <= dateAnterior && (!latestPrevByStore[row.store_id] || row.date > (latestPrevByStore[row.store_id] ?? ''))) {
          latestPrevByStore[row.store_id] = Number(row.bank_total || 0);
        }
      }
      const saldoAnterior = Object.values(latestPrevByStore).reduce((acc, v) => acc + v, 0);
      const fluxoCaixa = saldoTotal - saldoAnterior;

      // --- Faturamento Atual e Anterior ---
      const faturamentoAtual = (recsCurr.data || []).reduce((acc, r) => acc + Number(r.os_total || 0), 0);
      const faturamentoAnterior = (recsPrev.data || []).reduce((acc, r) => acc + Number(r.os_total || 0), 0);
      const variacaoFaturamento = faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : 0;

      // --- A Receber e Veículos em Pátio (Global e por Loja) ---
      const osAbertos = (patioOs.data || []).filter(
        os => os.status === 'em_aberto' || os.status === 'pago_parcial'
      );
      
      const aReceber = osAbertos.reduce(
        (acc, os) => acc + Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0)),
        0
      );
      const veiculosPatio = osAbertos.length;
      const veiculosPatioValor = osAbertos.reduce((acc, os) => acc + Number(os.total_value || 0), 0);

      // Pátio por Loja
      const patioByStore: Record<string, { qtd: number; valor: number }> = {};
      for (const os of osAbertos) {
        if (!os.store_id) continue;
        if (!patioByStore[os.store_id]) {
          patioByStore[os.store_id] = { qtd: 0, valor: 0 };
        }
        patioByStore[os.store_id].qtd += 1;
        patioByStore[os.store_id].valor += Number(os.total_value || 0);
      }

      // --- Contas a Pagar (Global e por Loja) ---
      const contasAPagar = (contasRows.data || []).reduce(
        (acc, c) => acc + Number(c.valor_em_aberto || 0),
        0
      );

      const contasByStore: Record<string, number> = {};
      for (const c of contasRows.data || []) {
        contasByStore[c.store_id] = (contasByStore[c.store_id] || 0) + Number(c.valor_em_aberto || 0);
      }

      // --- Caixa e Diferença ---
      const caixaAtual = saldoTotal + aReceber;
      const diferenca = caixaAtual - contasAPagar;

      // --- Métricas por Loja (Faturamento e Status) ---
      const fatByStore: Record<string, number> = {};
      for (const r of recsCurr.data || []) {
        fatByStore[r.store_id] = (fatByStore[r.store_id] || 0) + Number(r.os_total || 0);
      }

      const statusByStore: Record<string, 'approved' | 'divergence' | 'pending'> = {};
      for (const r of recsCurr.data || []) {
        const curr = statusByStore[r.store_id];
        const s = r.status === 'approved' ? 'approved' : r.status === 'divergence' ? 'divergence' : 'pending';
        if (!curr || s === 'divergence' || (s === 'pending' && curr === 'approved')) {
          statusByStore[r.store_id] = s;
        }
      }

      const allStoreIds = new Set([
        ...Object.keys(latestByStore),
        ...Object.keys(fatByStore),
        ...Object.keys(contasByStore),
        ...Object.keys(patioByStore),
      ]);

      const porLoja: StoreMetrics[] = Array.from(allStoreIds).map(storeId => {
        const saldoAtual = latestByStore[storeId]?.bank_total || 0;
        const faturamento = fatByStore[storeId] || 0;
        const contas = contasByStore[storeId] || 0;
        const patio = patioByStore[storeId] || { qtd: 0, valor: 0 };

        return {
          storeId,
          storeName: storeMap[storeId] || storeId,
          saldoAtual,
          faturamento,
          contas,
          resultado: faturamento - contas,
          statusConciliacao: statusByStore[storeId] || 'pending',
          veiculosPatio: patio.qtd,
          veiculosPatioValor: patio.valor,
        };
      }).sort((a, b) => b.faturamento - a.faturamento);

      // --- Histórico de Saldos (Agrupado por data) ---
      const histMap: Record<string, number> = {};
      // Inicializar com 0
      last15Dates.forEach(d => { histMap[d] = 0; });
      
      for (const row of historicoRes.data || []) {
        if (histMap[row.date] !== undefined) {
          histMap[row.date] += Number(row.bank_total || 0);
        }
      }
      
      const historicoSaldos = last15Dates.map(d => ({
        date: d,
        saldo: histMap[d]
      }));

      return {
        dataAtual: dateAtual,
        dataAnterior: dateAnterior,
        saldoTotal,
        caixaAtual,
        contasAPagar,
        diferenca,
        faturamentoAtual,
        faturamentoAnterior,
        variacaoFaturamento,
        fluxoCaixa,
        aReceber,
        veiculosPatio,
        veiculosPatioValor,
        porLoja,
        historicoSaldos,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
