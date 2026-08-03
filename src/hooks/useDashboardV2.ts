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
}

export interface DashboardV2Data {
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
}

function getPrevMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function useDashboardV2(monthStr: string) {
  return useQuery({
    queryKey: ['dashboard-v2', monthStr],
    queryFn: async (): Promise<DashboardV2Data> => {
      const prevMonth = getPrevMonth(monthStr);
      const { start: startCurr, end: endCurr } = getMonthRange(monthStr);
      const { start: startPrev, end: endPrev } = getMonthRange(prevMonth);

      // 5 queries paralelas
      const [recsAll, recsCurr, recsPrev, patioOs, contasRows, storesRes] = await Promise.all([
        // 1. Saldo atual: última reconciliação por loja (todos os tempos)
        supabase
          .from('reconciliations')
          .select('store_id, bank_total, date, os_total, divergence, status')
          .order('date', { ascending: false }),

        // 2. Faturamento mês atual
        supabase
          .from('reconciliations')
          .select('store_id, os_total, financial_total, divergence, status, date')
          .gte('date', startCurr)
          .lte('date', endCurr),

        // 3. Faturamento mês anterior
        supabase
          .from('reconciliations')
          .select('store_id, os_total')
          .gte('date', startPrev)
          .lte('date', endPrev),

        // 4. Pátio OS — a receber e veículos
        supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status'),

        // 5. Contas a pagar (oficina_contas pode estar vazia se sync ainda não rodou)
        supabase
          .from('oficina_contas')
          .select('store_id, valor_em_aberto, tipo, status')
          .eq('tipo', 'PAGAR')
          .not('status', 'in', '("PAG","PAGO","pago","pag")'),

        // 6. Lojas
        supabase.from('stores').select('id, name'),
      ]);

      // Construir lookup de nomes de lojas
      const storeMap: Record<string, string> = {};
      (storesRes.data || []).forEach((s: { id: string; name: string }) => {
        storeMap[s.id] = s.name;
      });

      // --- Saldo Atual por Loja (mais recente de recsAll) ---
      const latestByStore: Record<string, { bank_total: number; date: string }> = {};
      for (const row of recsAll.data || []) {
        if (!latestByStore[row.store_id] || row.date > latestByStore[row.store_id].date) {
          latestByStore[row.store_id] = { bank_total: Number(row.bank_total || 0), date: row.date };
        }
      }
      const saldoTotal = Object.values(latestByStore).reduce((acc, v) => acc + v.bank_total, 0);

      // Saldo mês anterior para fluxo de caixa
      const latestPrevByStore: Record<string, number> = {};
      for (const row of recsAll.data || []) {
        if (row.date <= endPrev && (!latestPrevByStore[row.store_id] || row.date > (latestPrevByStore[row.store_id] ?? ''))) {
          latestPrevByStore[row.store_id] = Number(row.bank_total || 0);
        }
      }
      const saldoAnterior = Object.values(latestPrevByStore).reduce((acc, v) => acc + v, 0);
      const fluxoCaixa = saldoTotal - saldoAnterior;

      // --- Faturamento mês atual e anterior ---
      const faturamentoAtual = (recsCurr.data || []).reduce((acc, r) => acc + Number(r.os_total || 0), 0);
      const faturamentoAnterior = (recsPrev.data || []).reduce((acc, r) => acc + Number(r.os_total || 0), 0);
      const variacaoFaturamento = faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : 0;

      // --- A Receber e Veículos em Pátio ---
      const osAbertos = (patioOs.data || []).filter(
        os => os.status === 'em_aberto' || os.status === 'pago_parcial'
      );
      const aReceber = osAbertos.reduce(
        (acc, os) => acc + Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0)),
        0
      );
      const veiculosPatio = osAbertos.length;
      const veiculosPatioValor = osAbertos.reduce((acc, os) => acc + Number(os.total_value || 0), 0);

      // --- Contas a Pagar ---
      const contasAPagar = (contasRows.data || []).reduce(
        (acc, c) => acc + Number(c.valor_em_aberto || 0),
        0
      );

      // --- Caixa e Diferença ---
      const caixaAtual = saldoTotal + aReceber;
      const diferenca = caixaAtual - contasAPagar;

      // --- Métricas por Loja ---
      // Faturamento por loja no mês atual
      const fatByStore: Record<string, number> = {};
      for (const r of recsCurr.data || []) {
        fatByStore[r.store_id] = (fatByStore[r.store_id] || 0) + Number(r.os_total || 0);
      }

      // Contas por loja
      const contasByStore: Record<string, number> = {};
      for (const c of contasRows.data || []) {
        contasByStore[c.store_id] = (contasByStore[c.store_id] || 0) + Number(c.valor_em_aberto || 0);
      }

      // Status de conciliação por loja (pior status do mês atual)
      const statusByStore: Record<string, 'approved' | 'divergence' | 'pending'> = {};
      for (const r of recsCurr.data || []) {
        const curr = statusByStore[r.store_id];
        const s = r.status === 'approved' ? 'approved' : r.status === 'divergence' ? 'divergence' : 'pending';
        if (!curr || s === 'divergence' || (s === 'pending' && curr === 'approved')) {
          statusByStore[r.store_id] = s;
        }
      }

      // Montar porLoja usando as lojas com dados em qualquer das fontes
      const allStoreIds = new Set([
        ...Object.keys(latestByStore),
        ...Object.keys(fatByStore),
      ]);

      const porLoja: StoreMetrics[] = Array.from(allStoreIds).map(storeId => {
        const saldoAtual = latestByStore[storeId]?.bank_total || 0;
        const faturamento = fatByStore[storeId] || 0;
        const contas = contasByStore[storeId] || 0;
        return {
          storeId,
          storeName: storeMap[storeId] || storeId,
          saldoAtual,
          faturamento,
          contas,
          resultado: faturamento - contas,
          statusConciliacao: statusByStore[storeId] || 'pending',
        };
      }).sort((a, b) => b.faturamento - a.faturamento);

      return {
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
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
