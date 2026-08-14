import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  faturamento_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence' | 'pending';
}

export interface DashboardMetrics {
  dataAtual: string;
  saldoTotal: number;
  dinheiroMp: number;
  aReceber: number;
  naLoja: number;
  caixaAtual: number;
  fluxoCx: number;
  fatura: number;
  valorDispContas: number;
  valorContas: number;
  diferenca: number;

  // Campos para compatibilidade com o UI do React (index.tsx)
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFaturamento: number;
  fluxoCaixa: number; // Mapeado de fluxoCx
  contasAPagar: number; // Mapeado de valorContas
  veiculosPatio: number;
  veiculosPatioValor: number;
  
  // Compatibilidade Legado / Componentes
  porLoja: StoreMetrics[];
  historicoMacro: any[];
}

export function useBackendDashboard(date: string) {
  return useQuery({
    queryKey: ['backend-dashboard', date],
    queryFn: async (): Promise<DashboardMetrics> => {
      let effectiveDate = date;
      if (!effectiveDate) {
        const { data: latestSnap } = await supabase
          .from('daily_snapshots')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: latestBatch } = await supabase
          .from('import_batches')
          .select('target_date')
          .order('target_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        effectiveDate = latestSnap?.date || latestBatch?.target_date || new Date().toISOString().split('T')[0];
      }
      
      console.log(`[Dashboard] Solicitando métricas via RPC get_dashboard_metrics para a data: ${effectiveDate}`);
      
      // 1. Puxa métricas globais invioláveis
      const { data: globalMetrics, error: globalErr } = await supabase.rpc('get_dashboard_metrics', {
        p_date: effectiveDate
      });

      if (globalErr) throw globalErr;

      // 2. Puxa a tabela por loja
      const { data: storeMetrics, error: storeErr } = await supabase.rpc('calculate_daily_conciliation', {
        p_date: effectiveDate
      });

      if (storeErr) throw storeErr;

      // 3. Puxa o histórico (dashboard_daily_logs)
      const targetDateObj = new Date(effectiveDate);
      const searchDates: string[] = [];
      for (let d = 0; d <= 7; d++) {
        const dObj = new Date(targetDateObj.getTime() - d * 86400000);
        searchDates.push(dObj.toISOString().split('T')[0]);
      }

      const { data: logsData } = await supabase
        .from('dashboard_daily_logs')
        .select('*')
        .in('date', searchDates)
        .order('date', { ascending: true });

      const historicoMacro = (logsData || []).map((l: any) => ({
        date: l.date,
        saldo: l.saldo_total,
        faturamento: l.faturamento_atual,
        contas: l.contas_a_pagar
      }));

      const todayLog = (logsData || []).find((l: any) => l.date === effectiveDate) || {};

      const faturamentoAtual = Number(globalMetrics?.faturamentoAtual ?? globalMetrics?.fatura ?? todayLog.faturamento_atual ?? 0);
      const faturamentoAnterior = Number(todayLog.faturamento_anterior || 0);
      const variacaoFaturamento = faturamentoAnterior > 0 
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100 
        : 0;

      return {
        ...globalMetrics,
        faturamentoAtual,
        faturamentoAnterior,
        variacaoFaturamento,
        fluxoCaixa: globalMetrics.fluxoCx,
        contasAPagar: globalMetrics.valorContas,
        veiculosPatio: Number(todayLog.veiculos_patio || 0),
        veiculosPatioValor: Number(globalMetrics.naLoja ?? todayLog.veiculos_patio_valor ?? 0),
        porLoja: storeMetrics || [],
        historicoMacro
      } as DashboardMetrics;
    },
    enabled: true
  });
}
