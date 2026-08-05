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
  historicoMacro: { date: string; saldo: number; faturamento: number; contas: number }[];
}

export function useDashboardV2(selectedDateStr?: string) {
  return useQuery({
    queryKey: ['dashboard-v2', selectedDateStr || 'latest'],
    queryFn: async (): Promise<DashboardV2Data> => {
      // 1. Descobrir as datas via import_logs (nova fonte da verdade para importações)
      const { data: datesData, error: datesErr } = await supabase
        .from('import_logs')
        .select('target_date')
        .order('target_date', { ascending: false });

      if (datesErr) throw datesErr;

      // Pega as datas únicas, decrescentes
      const uniqueDates = Array.from(new Set((datesData || []).map(d => d.target_date)));
      
      let dateAtual = selectedDateStr || uniqueDates[0] || new Date().toISOString().split('T')[0];
      
      // Ancorar na data real de fechamento mais próxima (<= selectedDateStr)
      const validPastDates = uniqueDates.filter(d => d <= dateAtual);
      dateAtual = validPastDates[0] || dateAtual;

      const dateAnterior = validPastDates[1] || dateAtual;
      
      const [ano, mes] = dateAtual.split('-');
      const monthPrefix = `${ano}-${mes}-`;
      const monthDates = validPastDates.filter(d => d.startsWith(monthPrefix)).reverse();

      // 2. Disparar queries paralelas baseadas na dateAtual
      const [
        recsAll,         // para bank_total mais recente de cada loja
        patioOs,         // Veículos no pátio e A Receber real
        transacoesAtuais,// Transações (Entradas e Saídas) para Faturamento e Contas
        storesRes,       // Lojas
        snapshotRes,     // Dados manuais (Dinheiro MP, A Receber manual, Faturamento Outros)
        
        // Histórico Macro (Mês Atual)
        historicoSaldosRes,
        historicoTransacoesRes,
        historicoSnapshotsRes
      ] = await Promise.all([
        supabase
          .from('reconciliations')
          .select('store_id, bank_total, date, status')
          .lte('date', dateAtual)
          .order('date', { ascending: false }),

        supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status, closed_at'),

        supabase
          .from('transactions')
          .select('store_id, amount, target_date, type')
          .in('target_date', [dateAtual, dateAnterior]),

        supabase.from('stores').select('id, name'),

        supabase
          .from('daily_snapshots')
          .select('faturamento_outros_valor, dinheiro_mp, a_receber_manual, contas_a_pagar')
          .eq('date', dateAtual)
          .maybeSingle(),

        // Macro Queries
        monthDates.length > 0 
          ? supabase.from('reconciliations').select('date, bank_total').in('date', monthDates)
          : Promise.resolve({ data: [] }),
          
        monthDates.length > 0
          ? supabase.from('transactions').select('target_date, amount, type').in('target_date', monthDates)
          : Promise.resolve({ data: [] }),
          
        monthDates.length > 0
          ? supabase.from('daily_snapshots').select('date, faturamento_outros_valor, contas_a_pagar').in('date', monthDates)
          : Promise.resolve({ data: [] })
      ]);

      const storeMap: Record<string, string> = {};
      (storesRes.data || []).forEach((s: { id: string; name: string }) => {
        storeMap[s.id] = s.name;
      });

      // --- Saldo Atual por Loja (bank_total de reconciliations) ---
      const latestByStore: Record<string, { bank_total: number; date: string; status: string }> = {};
      for (const row of recsAll.data || []) {
        if (row.date <= dateAtual && (!latestByStore[row.store_id] || row.date > latestByStore[row.store_id].date)) {
          latestByStore[row.store_id] = { bank_total: Number(row.bank_total || 0), date: row.date, status: row.status || 'pending' };
        }
      }
      const saldoTotal = Object.values(latestByStore).reduce((acc, v) => acc + v.bank_total, 0);

      // Fluxo de Caixa (Usando previous_balance nativo do OFX ou fallback pro histórico corrigido)
      const latestPrevByStore: Record<string, { total: number; date: string }> = {};
      
      for (const row of recsAll.data || []) {
        if (row.date === dateAtual && row.previous_balance !== null && row.previous_balance !== undefined) {
          // OFX do próprio dia tem a verdade absoluta do saldo inicial
          latestPrevByStore[row.store_id] = { total: Number(row.previous_balance), date: row.date };
        } else if (row.date <= dateAnterior) {
          // Histórico: Pega o bank_total mais recente até o dia anterior
          if (!latestPrevByStore[row.store_id] || row.date > latestPrevByStore[row.store_id].date) {
            // Só sobrescreve se não for o valor garantido do próprio dia (dateAtual)
            if (latestPrevByStore[row.store_id]?.date !== dateAtual) {
              latestPrevByStore[row.store_id] = { total: Number(row.bank_total || 0), date: row.date };
            }
          }
        }
      }
      const saldoAnterior = Object.values(latestPrevByStore).reduce((acc, v) => acc + v.total, 0);
      const fluxoCaixa = saldoTotal - saldoAnterior;

      // --- Faturamento e Contas (Transações + Manual) ---
      const fatManual = Number(snapshotRes.data?.faturamento_outros_valor || 0);
      const contasManual = Number(snapshotRes.data?.contas_a_pagar || 0);
      
      let faturamentoAtualLog = 0;
      let faturamentoAnteriorLog = 0;
      const fatByStore: Record<string, number> = {};
      const contasByStore: Record<string, number> = {};
      let contasAPagarBase = 0;
      
      for (const tx of transacoesAtuais.data || []) {
        const val = Math.abs(Number(tx.amount || 0));
        
        if (tx.target_date === dateAtual) {
          if (tx.type === 'in') {
            faturamentoAtualLog += val;
            if (tx.store_id) {
              fatByStore[tx.store_id] = (fatByStore[tx.store_id] || 0) + val;
            }
          } else if (tx.type === 'out') {
            contasAPagarBase += val;
            if (tx.store_id) {
              contasByStore[tx.store_id] = (contasByStore[tx.store_id] || 0) + val;
            }
          }
        } else if (tx.target_date === dateAnterior) {
          if (tx.type === 'in') {
            faturamentoAnteriorLog += val;
          }
        }
      }
      
      const faturamentoAtual = faturamentoAtualLog + fatManual;
      const contasAPagar = contasAPagarBase + contasManual;

      const snapshotAnterior = (historicoSnapshotsRes.data || []).find((s: any) => s.date === dateAnterior);
      const fatManualAnterior = Number(snapshotAnterior?.faturamento_outros_valor || 0);
      const faturamentoAnterior = faturamentoAnteriorLog + fatManualAnterior;

      const variacaoFaturamento = faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : 0;

      // --- A Receber e Pátio ---
      const osAbertos = (patioOs.data || []).filter(
        os => os.status === 'em_aberto' || os.status === 'pago_parcial'
      );
      
      const aReceberManual = Number(snapshotRes.data?.a_receber_manual || 0);
      const aReceberPatio = osAbertos.reduce(
        (acc, os) => acc + Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0)),
        0
      );
      const aReceber = aReceberPatio + aReceberManual;

      const veiculosPatio = osAbertos.length;
      const veiculosPatioValor = osAbertos.reduce((acc, os) => acc + Number(os.total_value || 0), 0);

      const patioByStore: Record<string, { qtd: number; valor: number }> = {};
      for (const os of osAbertos) {
        if (!os.store_id) continue;
        if (!patioByStore[os.store_id]) {
          patioByStore[os.store_id] = { qtd: 0, valor: 0 };
        }
        patioByStore[os.store_id].qtd += 1;
        patioByStore[os.store_id].valor += Number(os.total_value || 0);
      }

      // --- Caixa e Diferença ---
      const dinheiroMp = Number(snapshotRes.data?.dinheiro_mp || 0);
      const caixaAtual = saldoTotal + aReceber + dinheiroMp;
      const diferenca = caixaAtual - contasAPagar;

      const allStoreIds = new Set([
        ...Object.keys(latestByStore),
        ...Object.keys(fatByStore),
        ...Object.keys(contasByStore),
        ...Object.keys(patioByStore),
      ]);

      const porLoja: StoreMetrics[] = Array.from(allStoreIds).map(storeId => {
        // Fallback robusto se a loja não tiver dados naquele dia
        const saldoAtual = latestByStore[storeId]?.bank_total || 0;
        const faturamento = fatByStore[storeId] || 0;
        const contas = contasByStore[storeId] || 0;
        const patio = patioByStore[storeId] || { qtd: 0, valor: 0 };
        
        let rawStatus = latestByStore[storeId]?.status || 'pending';
        const statusConciliacao: 'approved' | 'divergence' | 'pending' = 
          rawStatus === 'approved' ? 'approved' : rawStatus === 'divergence' ? 'divergence' : 'pending';

        return {
          storeId,
          storeName: storeMap[storeId] || storeId,
          saldoAtual,
          faturamento,
          contas,
          resultado: faturamento - contas,
          statusConciliacao,
          veiculosPatio: patio.qtd,
          veiculosPatioValor: patio.valor,
        };
      }).sort((a, b) => b.faturamento - a.faturamento);

      // --- Histórico Macro ---
      const histMap: Record<string, { saldo: number; faturamento: number; contas: number }> = {};
      
      monthDates.forEach(d => { 
        histMap[d] = { saldo: 0, faturamento: 0, contas: 0 }; 
      });
      
      // Saldo (já temos o total por dia no banco, mas pode vir múltiplo por loja? Se sim, somamos)
      for (const row of historicoSaldosRes.data || []) {
        if (histMap[row.date] !== undefined) {
          histMap[row.date].saldo += Number(row.bank_total || 0);
        }
      }
      
      // Faturamento e Contas via transactions
      for (const row of historicoTransacoesRes.data || []) {
        if (histMap[row.target_date] !== undefined) {
          if (row.type === 'in') {
            histMap[row.target_date].faturamento += Math.abs(Number(row.amount || 0));
          } else if (row.type === 'out') {
            histMap[row.target_date].contas += Math.abs(Number(row.amount || 0));
          }
        }
      }
      
      // Adicionar faturamento e contas manuais
      for (const row of historicoSnapshotsRes.data || []) {
        if (histMap[row.date] !== undefined) {
          histMap[row.date].faturamento += Number(row.faturamento_outros_valor || 0);
          histMap[row.date].contas += Number(row.contas_a_pagar || 0);
        }
      }

      const historicoMacro = monthDates.map(d => ({ 
        date: d, 
        saldo: histMap[d].saldo,
        faturamento: histMap[d].faturamento,
        contas: histMap[d].contas
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
        historicoMacro,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
