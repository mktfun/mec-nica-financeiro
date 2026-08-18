import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldoAtual?: number;
  faturamento: number;
  contas: number;
  valor_contas?: number;
  resultado: number;
  veiculos_patio: number;
  veiculosPatio?: number;
  na_loja_os: number;
  veiculosPatioValor?: number;
  status?: 'approved' | 'divergence' | 'pending';
  statusConciliacao?: string;
}

export interface DashboardMetrics {
  dataAtual: string;
  dataAnterior: string;
  saldoTotal: number;
  dinheiroMp: number;
  aReceber: number;
  naLoja: number;
  caixaAtual: number;
  caixaAnterior: number;
  fluxoCx: number;
  fluxoCaixa: number;
  fatura: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  faturamentoOdometroAtual?: number;
  faturamentoOdometroAnterior?: number;
  variacaoFaturamento: number;
  valorDispContas: number;
  valorContas: number;
  contasAPagar: number;
  diferenca: number;
  veiculosPatio: number;
  veiculosPatioValor: number;
  porLoja: StoreMetrics[];
  historicoMacro: Array<{
    date: string;
    saldo: number;
    faturamento: number;
    contas: number;
  }>;
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
      
      // Chamada 100% Backend da RPC mestre que consolida todos os indicadores
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_date: effectiveDate
      });

      if (error) {
        console.error('[Dashboard] Erro ao invocar get_dashboard_metrics RPC:', error);
        throw error;
      }

      const res = (data || {}) as any;

      // Mapeamento direto das propriedades calculadas pelo PostgreSQL
      const porLoja = (res.porLoja || []).map((s: any) => ({
        ...s,
        storeId: s.storeId || s.store_id || '',
        storeName: s.storeName || s.store_name || '',
        saldoAtual: Number(s.saldoAtual ?? s.saldo_banco ?? 0),
        faturamento: Number(s.faturamento || 0),
        contas: Number(s.contas ?? s.valor_contas ?? 0),
        resultado: Number(s.resultado || (Number(s.faturamento || 0) - Number(s.contas || 0))),
        veiculosPatio: Number(s.veiculosPatio ?? s.veiculos_patio ?? 0),
        veiculosPatioValor: Number(s.veiculosPatioValor ?? s.na_loja_os ?? 0),
        statusConciliacao: s.statusConciliacao || s.status || 'approved'
      }));

      return {
        dataAtual: res.dataAtual || effectiveDate,
        dataAnterior: res.dataAnterior || '',
        saldoTotal: Number(res.saldoTotal || 0),
        dinheiroMp: Number(res.dinheiroMp || 0),
        aReceber: Number(res.aReceber || 0),
        naLoja: Number(res.naLoja || 0),
        caixaAtual: Number(res.caixaAtual || 0),
        caixaAnterior: Number(res.caixaAnterior || 0),
        fluxoCx: Number(res.fluxoCx || 0),
        fluxoCaixa: Number(res.fluxoCaixa ?? res.fluxoCx ?? 0),
        fatura: Number(res.fatura ?? res.faturamentoAtual ?? 0),
        faturamentoAtual: Number(res.faturamentoAtual ?? res.fatura ?? 0),
        faturamentoAnterior: Number(res.faturamentoAnterior || 0),
        faturamentoOdometroAtual: Number(res.faturamentoOdometroAtual || 0),
        faturamentoOdometroAnterior: Number(res.faturamentoOdometroAnterior || 0),
        variacaoFaturamento: Number(res.variacaoFaturamento || 0),
        valorDispContas: Number(res.valorDispContas ?? res.caixaAtual ?? 0),
        valorContas: Number(res.valorContas ?? res.contasAPagar ?? 0),
        contasAPagar: Number(res.contasAPagar ?? res.valorContas ?? 0),
        diferenca: Number(res.diferenca || 0),
        veiculosPatio: Number(res.veiculosPatio || 0),
        veiculosPatioValor: Number(res.veiculosPatioValor ?? res.naLoja ?? 0),
        porLoja,
        historicoMacro: res.historicoMacro || []
      } as DashboardMetrics;
    },
    enabled: true,
    staleTime: 1000 * 30
  });
}
