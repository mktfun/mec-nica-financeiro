import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ExecutiveStoreData {
  storeId: string;
  storeName: string;
  saldoBanco: number;
  faturamento: number;
  faturamentoProporcao: number; // 0 a 100%
  contas: number;
  resultadoLiquido: number;
  naLojaOs: number;
  veiculosPatioCount: number;
  status: 'approved' | 'divergent' | 'pending' | 'sem_movimento';
  isNegativeBank: boolean;
}

export interface ExecutiveDashboardData {
  date: string;
  previousDate: string;
  isClosed: boolean;
  statusGeral: 'approved' | 'divergent' | 'pending';
  
  // 5 Pilares de Caixa
  saldoBancosPositivo: number;
  saldoNegativoItau: number;
  saldoBancosLiquido: number;
  dinheiroMp: number;
  aReceber: number;
  naLojaOs: number;
  caixaAtual: number;
  caixaAnterior: number;
  fluxoCaixa: number;
  variacaoCaixaPerc: number;
  
  // DRE & Faturamento
  faturamentoTotal: number;
  faturamentoOiBase: number;
  faturamentoAjustes: number;
  odometroHoje: number;
  odometroAnterior: number;
  variacaoFaturamentoPerc: number;
  valorDispContas: number;
  contasSubtotal: number;
  contasBase: number;
  jurosRede: number;
  diferencaFinal: number;
  
  // Insights & Lojas
  totalVeiculosPatio: number;
  lojaLider: { name: string; faturamento: number };
  lojaMaiorPatio: { name: string; valor: number };
  lojasEmChequeEspecial: Array<{ name: string; valor: number }>;
  stores: ExecutiveStoreData[];
  historicoMacro: Array<{
    date: string;
    faturamento: number;
    contas: number;
    caixaAtual: number;
  }>;
}

export function useExecutiveDashboard(targetDate: string) {
  return useQuery({
    queryKey: ['executive-dashboard', targetDate],
    queryFn: async (): Promise<ExecutiveDashboardData> => {
      let effectiveDate = targetDate;
      
      // Se data não foi fornecida, buscar o fechamento mais recente
      if (!effectiveDate) {
        const { data: latestSnap } = await supabase
          .from('daily_snapshots')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        effectiveDate = latestSnap?.date || '2026-09-01';
      }

      // 1. Invocar a RPC get_dashboard_metrics / get_daily_reconciliation_summary
      const { data: rpcData, error } = await supabase.rpc('get_dashboard_metrics', {
        p_date: effectiveDate
      });

      if (error) {
        console.error('[ExecutiveDashboard] Erro RPC get_dashboard_metrics:', error);
        // Fallback para get_daily_reconciliation_summary
        const { data: fallbackRpc, error: fbError } = await supabase.rpc('get_daily_reconciliation_summary', {
          p_date: effectiveDate
        });
        if (fbError) throw fbError;
        return normalizeFromReconSummary(fallbackRpc, effectiveDate);
      }

      const res = (rpcData || {}) as any;
      const raw = res.summary_raw || res;

      // 2. Normalizar Lojas
      const rawStores = res.stores || raw.stores || raw.stores_detail || [];
      let maxFat = 0;
      let lojaLider = { name: 'Nenhuma', faturamento: 0 };
      let maxPatio = 0;
      let lojaMaiorPatio = { name: 'Nenhuma', valor: 0 };
      const lojasEmChequeEspecial: Array<{ name: string; valor: number }> = [];

      // Primeiro passo: identificar maiores valores para cálculo proporcional
      rawStores.forEach((s: any) => {
        const fat = Number(s.faturamento || s.ofx_entradas_total || 0);
        const patio = Number(s.na_loja_os || s.patio_total || 0);
        const saldo = Number(s.saldo_banco ?? s.saldo_total ?? 0);
        const name = s.store_name || s.name || 'Filial';

        if (fat > maxFat) {
          maxFat = fat;
          lojaLider = { name, faturamento: fat };
        }
        if (patio > maxPatio) {
          maxPatio = patio;
          lojaMaiorPatio = { name, valor: patio };
        }
        if (saldo < -0.05) {
          lojasEmChequeEspecial.push({ name, valor: Math.abs(saldo) });
        }
      });

      const stores: ExecutiveStoreData[] = rawStores.map((s: any) => {
        const fat = Number(s.faturamento || s.ofx_entradas_total || 0);
        const contas = Number(s.contas || s.contas_loja_total || 0);
        const saldo = Number(s.saldo_banco ?? s.saldo_total ?? 0);
        const patio = Number(s.na_loja_os || s.patio_total || 0);
        const status = s.status || (Math.abs(Number(s.diferenca_total || 0)) < 1.0 ? 'approved' : 'divergent');

        return {
          storeId: String(s.store_id || s.id || ''),
          storeName: String(s.store_name || s.name || 'Filial'),
          saldoBanco: saldo,
          faturamento: fat,
          faturamentoProporcao: maxFat > 0 ? Math.round((fat / maxFat) * 100) : 0,
          contas,
          resultadoLiquido: fat - contas,
          naLojaOs: patio,
          veiculosPatioCount: Number(s.veiculos_patio || (patio > 0 ? Math.ceil(patio / 2500) : 0)),
          status: status as any,
          isNegativeBank: saldo < -0.05
        };
      });

      // 3. Normalizar 5 Pilares e DRE
      const saldoBancosPositivo = Number(res.saldo_bancos_positivo ?? raw.total_saldo_banco_positivo ?? raw.saldo_bancos_positivo ?? 0);
      const saldoNegativoItau = Number(res.saldo_negativo_itau ?? raw.saldo_negativo_itau ?? 0);
      const saldoBancosLiquido = saldoBancosPositivo - saldoNegativoItau;
      const dinheiroMp = Number(res.total_dinheiro ?? raw.dinheiro_mp ?? 0);
      const aReceber = Number(res.total_areceber ?? raw.a_receber ?? raw.a_receber_manual ?? 0);
      const naLojaOs = Number(res.total_naloja ?? raw.na_loja_os ?? raw.total_patio ?? 0);
      const caixaAtual = Number(res.total_cxatual ?? raw.caixa_atual ?? 0);
      const caixaAnterior = Number(res.total_cxanterior ?? raw.caixa_anterior ?? 0);
      const fluxoCaixa = Number(res.total_fluxo ?? raw.fluxo_caixa ?? (caixaAtual - caixaAnterior));

      const variacaoCaixaPerc = caixaAnterior > 0 
        ? Number(((fluxoCaixa / caixaAnterior) * 100).toFixed(1))
        : 0;

      const faturamentoTotal = Number(res.faturamento_atual ?? raw.faturamento_periodo ?? raw.faturamento ?? 0);
      const faturamentoOiBase = Number(raw.faturamento_oi_base ?? 0);
      const faturamentoAjustes = Number(raw.faturamento_ajustes ?? 0);
      const odometroHoje = Number(raw.odometro_hoje ?? 0);
      const odometroAnterior = Number(raw.odometro_anterior ?? 0);
      const faturamentoAnterior = Number(raw.faturamento_anterior ?? 0);

      const variacaoFaturamentoPerc = faturamentoAnterior > 0
        ? Number((((faturamentoTotal - faturamentoAnterior) / faturamentoAnterior) * 100).toFixed(1))
        : 0;

      const valorDispContas = Number(raw.valor_disp_contas ?? (faturamentoTotal - fluxoCaixa));
      const contasSubtotal = Number(res.total_contas ?? raw.subtotal_contas ?? raw.contas_a_pagar ?? 0);
      const contasBase = Number(raw.contas_base ?? 0);
      const jurosRede = Number(res.juros_rede ?? raw.juros_rede ?? 0);
      const diferencaFinal = Number(res.diferenca ?? raw.diferenca_final ?? (valorDispContas - contasSubtotal));

      const statusGeral = raw.status_geral || (Math.abs(diferencaFinal) <= 250.0 ? 'approved' : 'divergent');
      const isClosed = Boolean(raw.is_closed);

      const historicoMacro = (res.historicoMacro || []).map((h: any) => ({
        date: h.date,
        faturamento: Number(h.faturamento || 0),
        contas: Number(h.contas || 0),
        caixaAtual: Number(h.saldo || h.caixa_atual || 0)
      }));

      return {
        date: effectiveDate,
        previousDate: raw.data_anterior || '',
        isClosed,
        statusGeral,
        saldoBancosPositivo,
        saldoNegativoItau,
        saldoBancosLiquido,
        dinheiroMp,
        aReceber,
        naLojaOs,
        caixaAtual,
        caixaAnterior,
        fluxoCaixa,
        variacaoCaixaPerc,
        faturamentoTotal,
        faturamentoOiBase,
        faturamentoAjustes,
        odometroHoje,
        odometroAnterior,
        variacaoFaturamentoPerc,
        valorDispContas,
        contasSubtotal,
        contasBase,
        jurosRede,
        diferencaFinal,
        totalVeiculosPatio: stores.reduce((sum, s) => sum + s.veiculosPatioCount, 0),
        lojaLider,
        lojaMaiorPatio,
        lojasEmChequeEspecial,
        stores,
        historicoMacro
      };
    },
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: false
  });
}

function normalizeFromReconSummary(raw: any, effectiveDate: string): ExecutiveDashboardData {
  const data = raw || {};
  const rawStores = data.stores || data.stores_detail || [];

  let maxFat = 0;
  let lojaLider = { name: 'Nenhuma', faturamento: 0 };
  let maxPatio = 0;
  let lojaMaiorPatio = { name: 'Nenhuma', valor: 0 };
  const lojasEmChequeEspecial: Array<{ name: string; valor: number }> = [];

  rawStores.forEach((s: any) => {
    const fat = Number(s.faturamento || s.ofx_entradas_total || 0);
    const patio = Number(s.na_loja_os || s.patio_total || 0);
    const saldo = Number(s.saldo_banco ?? s.saldo_total ?? 0);
    const name = s.store_name || s.name || 'Filial';

    if (fat > maxFat) {
      maxFat = fat;
      lojaLider = { name, faturamento: fat };
    }
    if (patio > maxPatio) {
      maxPatio = patio;
      lojaMaiorPatio = { name, valor: patio };
    }
    if (saldo < -0.05) {
      lojasEmChequeEspecial.push({ name, valor: Math.abs(saldo) });
    }
  });

  const stores: ExecutiveStoreData[] = rawStores.map((s: any) => {
    const fat = Number(s.faturamento || s.ofx_entradas_total || 0);
    const contas = Number(s.contas || s.contas_loja_total || 0);
    const saldo = Number(s.saldo_banco ?? s.saldo_total ?? 0);
    const patio = Number(s.na_loja_os || s.patio_total || 0);

    return {
      storeId: String(s.store_id || s.id || ''),
      storeName: String(s.store_name || s.name || 'Filial'),
      saldoBanco: saldo,
      faturamento: fat,
      faturamentoProporcao: maxFat > 0 ? Math.round((fat / maxFat) * 100) : 0,
      contas,
      resultadoLiquido: fat - contas,
      naLojaOs: patio,
      veiculosPatioCount: Number(s.veiculos_patio || (patio > 0 ? Math.ceil(patio / 2500) : 0)),
      status: s.status || 'approved',
      isNegativeBank: saldo < -0.05
    };
  });

  const saldoBancosPositivo = Number(data.total_saldo_banco_positivo ?? data.saldo_bancos_positivo ?? 0);
  const saldoNegativoItau = Number(data.saldo_negativo_itau ?? 0);
  const caixaAtual = Number(data.caixa_atual ?? 0);
  const caixaAnterior = Number(data.caixa_anterior ?? 0);
  const fluxoCaixa = Number(data.fluxo_caixa ?? (caixaAtual - caixaAnterior));

  return {
    date: effectiveDate,
    previousDate: '',
    isClosed: Boolean(data.is_closed),
    statusGeral: data.status_geral || 'approved',
    saldoBancosPositivo,
    saldoNegativoItau,
    saldoBancosLiquido: saldoBancosPositivo - saldoNegativoItau,
    dinheiroMp: Number(data.dinheiro_mp ?? 0),
    aReceber: Number(data.a_receber ?? data.a_receber_manual ?? 0),
    naLojaOs: Number(data.na_loja_os ?? data.total_patio ?? 0),
    caixaAtual,
    caixaAnterior,
    fluxoCaixa,
    variacaoCaixaPerc: caixaAnterior > 0 ? Number(((fluxoCaixa / caixaAnterior) * 100).toFixed(1)) : 0,
    faturamentoTotal: Number(data.faturamento_periodo ?? data.faturamento ?? 0),
    faturamentoOiBase: Number(data.faturamento_oi_base ?? 0),
    faturamentoAjustes: Number(data.faturamento_ajustes ?? 0),
    odometroHoje: Number(data.odometro_hoje ?? 0),
    odometroAnterior: Number(data.odometro_anterior ?? 0),
    variacaoFaturamentoPerc: 0,
    valorDispContas: Number(data.valor_disp_contas ?? 0),
    contasSubtotal: Number(data.subtotal_contas ?? data.contas_a_pagar ?? 0),
    contasBase: Number(data.contas_base ?? 0),
    jurosRede: Number(data.juros_rede ?? 0),
    diferencaFinal: Number(data.diferenca_final ?? 0),
    totalVeiculosPatio: stores.reduce((sum, s) => sum + s.veiculosPatioCount, 0),
    lojaLider,
    lojaMaiorPatio,
    lojasEmChequeEspecial,
    stores,
    historicoMacro: []
  };
}
