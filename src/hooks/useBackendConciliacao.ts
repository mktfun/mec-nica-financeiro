import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ConciliationDailyLog {
  store_id: string;
  store_name: string;
  faturamento_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence' | 'pending';
}

export function useBackendConciliacao(date: string) {
  return useQuery({
    queryKey: ['backend-conciliacao', date],
    queryFn: async (): Promise<ConciliationDailyLog[]> => {
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

      console.log(`[Conciliação] Solicitando cálculo via RPC calculate_daily_conciliation para a data: ${effectiveDate}`);

      const { data, error } = await supabase.rpc('calculate_daily_conciliation', {
        p_date: effectiveDate
      });

      if (error) {
        console.error("Erro ao calcular conciliação no backend:", error);
        throw error;
      }

      return data as ConciliationDailyLog[];
    },
    enabled: !!date
  });
}

export function useGlobalOfxOut(date: string) {
  return useQuery({
    queryKey: ['global-ofx-out', date],
    queryFn: async (): Promise<number> => {
      if (!date) return 0;
      
      const nextDate = new Date(new Date(date + 'T12:00:00Z').getTime() + 86400000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .or(`target_date.eq.${date},and(occurred_at.gte.${date}T00:00:00,occurred_at.lt.${nextDate}T00:00:00)`)
        .eq('type', 'out')
        .eq('source', 'ofx');
        
      if (error) {
        console.error("Erro ao buscar contas OFX:", error);
        return 0;
      }
      
      const total = data.reduce((acc, row) => acc + Math.abs(Number(row.amount) || 0), 0);
      return total;
    },
    enabled: !!date
  });
}

export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  color?: string;
  saldo_banco: number; // Saldo Consolidado (OFX + Não Entrou)
  saldo_banco_ofx?: number; // Saldo puro do extrato OFX
  saldo_devedor_real?: number; // Cheque Especial Líquido (se saldo_banco < 0 => |saldo_banco|, senão 0)
  saldo_positivo_real?: number; // Ativo Superavitário (se saldo_banco > 0 => saldo_banco, senão 0)
  dinheiro_loja?: number;
  vault_entries?: Array<{ id: string; amount: number; status: string; entry_date: string; description?: string }>;
  nao_entrou_valor?: number; // Vendas de maquininha a compensar (Não Entrou)
  rede_bruto?: number;
  rede_liquido?: number; // Total líquido das vendas na maquininha
  rede_devolucoes?: number; // Devoluções/estornos da maquininha
  ofx_maquininhas?: number;
  status_compensacao?: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento' | string;
  status_banco?: 'credor' | 'devedor' | 'compensado_rede' | string;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  patio_os?: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
  // Split Dual de Diagnóstico
  ofx_entradas_total?: number;
  entradas_conciliadas?: number;
  entradas_realizadas?: number;
  entradas_previsto?: number;
  dif_entradas?: number;
  diferenca_entradas?: number;
  ofx_saidas_total?: number;
  saidas_ofx?: number;
  contas_conciliadas?: number;
  contas_loja_total?: number;
  contas_loja?: number;
  dif_saidas?: number;
  diferenca_saidas?: number;
}

export interface StoreCardData {
  storeId: string;
  storeName: string;
  avatarUrl?: string | null;
  saldoBanco: number | null;
  maquininha: number | null;
  pix: number | null;
  naLojaOs: number | null;
  previsto: number | null;
  diferenca: number | null;
  // Novos campos do split
  entradasRealizadas?: number | null;
  entradasPrevisto?: number | null;
  diferencaEntradas?: number | null;
  saidasOfx?: number | null;
  contasLoja?: number | null;
  contasCentralizadas?: number | null;
  contasLocais?: number | null;
  diferencaSaidas?: number | null;
  dinheiroLoja?: number | null;
  ofxMaquininhas?: number | null;
  pixTotal?: number | null;
  statusCompensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento' | string;
  naoEntrouValor: number | null;
  status: 'approved' | 'divergence' | 'conciliado' | 'pending';
  isMissingData?: boolean;
}

export interface StorePosDetail {
  store_id: string;
  store_name: string;
  rede_bruto: number;
  rede_liquido: number;
  rede_taxas: number;
  rede_devolucoes?: number;
  total_vendas_rede: number;
  ofx_maquininhas: number;
  nao_entrou_valor: number;
  status_compensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento';
  ofx_transacoes: Array<{ id: string; amount: number; fitid: string; counterpart: string }>;
  os_cartao_total: number;
  os_cartao_transacoes: Array<{ id: string; os_number: string; plate: string; total_value: number; paid_value: number; credit_value?: number; debit_value?: number; payment_method: string }>;
}

export interface PosTripleReconciliationResult {
  target_date: string;
  total_rede_bruto: number;
  total_rede_liquido: number;
  total_rede_taxas: number;
  total_devolucoes: number;
  total_ofx_maquininhas: number;
  total_nao_entrou: number;
  stores: StorePosDetail[];
}

export interface DailyReconciliationSummary {
  date: string;
  data_atual?: string;
  total_saldo_banco: number;
  total_saldo_banco_positivo?: number;
  total_saldo_banco_negativo?: number;
  total_ativos_positivos?: number;
  saldo_bancos_ofx: number;
  saldo_bancos_positivo?: number;
  saldo_bancos_ofx_positivo?: number;
  saldo_negativo_itau?: number;
  dinheiro_em_lojas?: number;
  dinheiro_lojas?: number;
  cartoes_a_compensar: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  contas_base?: number;
  contas_extras?: number;
  contas_manual: number;
  contas_override?: number | null;
  has_contas_override?: boolean;
  total_bills?: number;
  juros_rede: number;
  devolucoes_rede?: number;
  ofx_out?: number;
  total_entradas_ofx?: number;
  total_saidas_ofx?: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_ofx?: number;
  faturamento_anterior?: number;
  odometro_anterior?: number;
  odometro_hoje?: number;
  faturamento_oi_base?: number;
  faturamento_ajustes?: number;
  faturamento_periodo: number;
  faturamento_itens?: Array<{ id: string; title: string; amount: number; type: string; description?: string }>;
  contas_itens?: Array<{ id: string; title: string; amount: number; category?: string; description?: string; store_id?: string }>;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  status_geral: 'approved' | 'divergence';
  is_closed?: boolean;
  is_marco_zero?: boolean;
  closed_at?: string | null;
  // Campos Bicanais (Spec 359)
  caixa_tesouraria?: number;
  status_tesouraria?: 'equilibrado' | 'descoberto' | string;
  patio_wip?: number;
  variacao_patio_delta_p4?: number;
  fast_path_eligible?: boolean;
  stores: StoreReconciliationSummary[];
  stores_detail?: StoreReconciliationSummary[];
  maquininhas_detalhe?: PosTripleReconciliationResult;
}

export function useDailyReconciliationSummary(date: string, forceDynamic: boolean = false) {
  return useQuery({
    queryKey: ['daily-reconciliation-summary', date, forceDynamic],
    queryFn: async (): Promise<DailyReconciliationSummary | null> => {
      if (!date) return null;

      const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', {
        p_date: date,
        p_force_dynamic: forceDynamic,
      });

      if (error) {
        console.error("Erro ao carregar resumo consolidado do backend via get_daily_reconciliation_summary:", error);
        throw error;
      }

      if (!data) return null;

      const raw = data as any;

      // 1. Busca transações de maquininha da data para apurar rigorosamente o que NÃO ENTROU no banco
      let posUnsettledByStore: Record<string, number> = {};
      let totalPosUnsettled = 0;
      let posQuerySuccess = false;
      try {
        const { data: posData, error: posErr } = await supabase
          .from('pos_transactions')
          .select('store_id, net_amount, settlement_status')
          .eq('target_date', date);

        if (!posErr && posData) {
          posData
            .filter(p => p.settlement_status !== 'entrou' && p.settlement_status !== 'liquidado')
            .forEach(p => {
              const sid = String(p.store_id || '').trim();
              const val = Number(p.net_amount || 0);
              posUnsettledByStore[sid] = (posUnsettledByStore[sid] || 0) + val;
              totalPosUnsettled += val;
            });
          posQuerySuccess = true;
        }
      } catch (err) {
        console.warn('Erro ao enriquecer pos_transactions:', err);
      }

      // 2. Busca store_cash_vault para apurar rigorosamente dinheiro pendente em cofre (em trânsito)
      let vaultByStore: Record<string, number> = {};
      let vaultEntriesByStore: Record<string, any[]> = {};
      let totalVaultInTransit = 0;
      let vaultQuerySuccess = false;
      try {
        const { data: vaultData, error: vaultErr } = await supabase
          .from('store_cash_vault')
          .select('id, store_id, amount, status, entry_date, description, os_number_ref, notes')
          .lte('entry_date', date);

        if (!vaultErr && vaultData) {
          vaultData.forEach(v => {
            const sid = String(v.store_id || '').trim();
            if (!vaultEntriesByStore[sid]) vaultEntriesByStore[sid] = [];
            vaultEntriesByStore[sid].push(v);

            if (v.status === 'em_transito' || v.status === 'pending') {
              const val = Number(v.amount || 0);
              vaultByStore[sid] = (vaultByStore[sid] || 0) + val;
              totalVaultInTransit += val;
            }
          });
          vaultQuerySuccess = true;
        }
      } catch (err) {
        console.warn('Erro ao enriquecer store_cash_vault:', err);
      }

      // 2.5 Busca contas manuais dinamicamente para sobrepor a RPC que exclui paid_cash
      let totalManualBills = Number(raw.contas_manual ?? 0);
      try {
        const { data: billsData, error: billsErr } = await supabase
          .from('daily_manual_bills')
          .select('amount, match_status, contabilizar_no_subtotal')
          .eq('date', date)
          .neq('match_status', 'ignored');
          
        if (!billsErr && billsData) {
          totalManualBills = billsData
            .filter(b => b.contabilizar_no_subtotal !== false)
            .reduce((acc, b) => acc + Number(b.amount || 0), 0);
        }
      } catch (err) {
        console.warn('Erro ao carregar daily_manual_bills:', err);
      }

      // 3. Busca snapshot persistido para blindar metadados canônicos (odômetro, faturamento, pátio)
      let snapshotData: any = null;
      try {
        const { data: snap } = await supabase
          .from('daily_snapshots')
          .select('is_closed, faturamento, total_patio, caixa_atual, contas_a_pagar, saldo_negativo_itau, a_receber_manual, metadata')
          .eq('date', date)
          .maybeSingle();
        if (snap) {
          snapshotData = snap;
        }
      } catch (err) {
        console.warn('Erro ao carregar daily_snapshots de segurança:', err);
      }

      const snapMeta = (snapshotData?.metadata as any) || {};

      // R4: Se o dia já estiver fechado e não estiver forçando modo dinâmico,
      // utiliza o snapshot congelado do cofre (cash_vault_snapshot) para blindagem temporal
      if (snapshotData?.is_closed && !forceDynamic && snapMeta.cash_vault_snapshot) {
        const cvSnap = snapMeta.cash_vault_snapshot;
        const fractions = cvSnap.fractions || cvSnap.entries || [];
        vaultByStore = {};
        vaultEntriesByStore = {};
        totalVaultInTransit = Number(cvSnap.total_em_transito !== undefined ? cvSnap.total_em_transito : (snapMeta.dinheiro_lojas || 0));
        fractions.forEach((v: any) => {
          const sid = String(v.store_id || '').trim();
          if (!vaultEntriesByStore[sid]) vaultEntriesByStore[sid] = [];
          vaultEntriesByStore[sid].push(v);
          if (v.status === 'em_transito' || v.status === 'pending') {
            const val = Number(v.amount || 0);
            vaultByStore[sid] = (vaultByStore[sid] || 0) + val;
          }
        });
        vaultQuerySuccess = true;
      }

      const storesList: StoreReconciliationSummary[] = (raw.stores || raw.stores_detail || []).map((s: any) => {
        const sid = String(s.store_id || '').trim();
        const storeNaoEntrou = posQuerySuccess 
          ? (posUnsettledByStore[sid] ?? 0)
          : Number(s.nao_entrou_valor ?? s.cartao_nao_entrou ?? 0);

        const redeLiq = Number(s.rede_liquido ?? s.maquininha ?? 0);
        const ofxMaq = Number(s.ofx_maquininhas ?? 0);

        // Se a busca de pos_transactions teve sucesso, respeita estritamente o valor não liquidado
        const finalNaoEntrou = posQuerySuccess 
          ? storeNaoEntrou 
          : (storeNaoEntrou > 0 ? storeNaoEntrou : (redeLiq > 0 ? Math.max(0, redeLiq - ofxMaq) : 0));

        const storeVault = vaultQuerySuccess
          ? (vaultByStore[sid] || 0)
          : Number(s.dinheiro_loja ?? 0);

        const storeVaultEntries = (vaultEntriesByStore[sid] && vaultEntriesByStore[sid].length > 0)
          ? vaultEntriesByStore[sid]
          : (s.vault_entries || []);

        return {
          store_id: s.store_id,
          store_name: s.store_name,
          color: s.color,
          saldo_banco: Number(s.saldo_banco ?? s.saldo_banco_ofx ?? 0),
          saldo_banco_ofx: Number(s.saldo_banco_ofx ?? s.saldo_banco ?? 0),
          saldo_devedor_real: Number(s.saldo_devedor_real ?? (Number(s.saldo_banco || 0) < 0 ? Math.abs(Number(s.saldo_banco)) : 0)),
          saldo_positivo_real: Number(s.saldo_positivo_real ?? (Number(s.saldo_banco || 0) > 0 ? Number(s.saldo_banco) : 0)),
          dinheiro_loja: Number(storeVault.toFixed(2)),
          vault_entries: storeVaultEntries,
          nao_entrou_valor: Number(finalNaoEntrou.toFixed(2)),
          rede_bruto: Number(s.rede_bruto ?? 0),
          rede_liquido: redeLiq,
          rede_devolucoes: Number(s.rede_devolucoes ?? s.devolucoes_rede ?? 0),
          ofx_maquininhas: ofxMaq,
          status_compensacao: (finalNaoEntrou > 0.05) ? 'nao_entrou' : (s.status_compensacao || 'entrou'),
          status_banco: s.status_banco || 'credor',
          maquininha: Number(s.maquininha ?? s.rede_liquido ?? 0),
          pix: Number(s.pix ?? s.pix_total ?? 0),
          na_loja_os: Number(s.na_loja_os ?? s.patio_os ?? 0),
          patio_os: Number(s.patio_os ?? s.na_loja_os ?? 0),
          previsto_ofx: Number(s.previsto_ofx ?? s.entradas_conciliadas ?? s.entradas_previsto ?? 0),
          diferenca: Number(s.diferenca ?? s.diferenca_total ?? 0),
          status: (s.status || (Math.abs(Number(s.diferenca || 0)) <= 0.05 ? 'approved' : 'divergence')) as 'approved' | 'divergence',
          ofx_entradas_total: Number(s.ofx_entradas_total ?? s.entradas_realizadas ?? 0),
          entradas_conciliadas: Number(s.entradas_conciliadas ?? s.entradas_previsto ?? 0),
          entradas_realizadas: Number(s.ofx_entradas_total ?? s.entradas_realizadas ?? 0),
          entradas_previsto: Number(s.entradas_conciliadas ?? s.entradas_previsto ?? 0),
          dif_entradas: Number(s.dif_entradas ?? s.diferenca_entradas ?? 0),
          diferenca_entradas: Number(s.diferenca_entradas ?? s.dif_entradas ?? 0),
          ofx_saidas_total: Number(s.ofx_saidas_total ?? s.saidas_ofx ?? 0),
          saidas_ofx: Number(s.ofx_saidas_total ?? s.saidas_ofx ?? 0),
          contas_loja_total: Number(s.contas_loja_total ?? s.contas_conciliadas ?? s.contas_loja ?? 0),
          contas_conciliadas: Number(s.contas_conciliadas ?? s.contas_loja_total ?? s.contas_loja ?? 0),
          contas_loja: Number(s.contas_loja ?? s.contas_conciliadas ?? s.contas_loja_total ?? 0),
          contas_centralizadas: Number(s.contas_centralizadas ?? 0),
          contas_locais: Number(s.contas_locais ?? 0),
          dif_saidas: Number(s.dif_saidas ?? s.diferenca_saidas ?? 0),
          diferenca_saidas: Number(s.diferenca_saidas ?? s.dif_saidas ?? 0),
        };
      });

      // Consolidação Macro Saneada dos 5 Pilares
      const finalDinheiroLojas = vaultQuerySuccess
        ? Number(totalVaultInTransit.toFixed(2))
        : (snapMeta.dinheiro_lojas !== undefined 
            ? Number(snapMeta.dinheiro_lojas) 
            : Number(raw.dinheiro_lojas || raw.dinheiro_em_lojas || 0));

      const finalCartoesACompensar = posQuerySuccess
        ? Number(totalPosUnsettled.toFixed(2))
        : (snapMeta.cartoes_a_compensar !== undefined 
            ? Number(snapMeta.cartoes_a_compensar) 
            : (Number(raw.cartoes_a_compensar || 0) < 40000 ? Number(raw.cartoes_a_compensar || 0) : 0));

      // Isolamento de Saldo Bancário Puro (OFX)
      // O saldo positivo puro das 10 contas de extrato OFX vem de saldo_bancos_ofx_positivo ou saldo_bancos_positivo
      const rawOfxPos = Number(raw.saldo_bancos_ofx_positivo ?? raw.saldo_bancos_positivo ?? 0);
      const baseBancoPositivo = rawOfxPos > 0
        ? rawOfxPos
        : Math.max(0, Number(raw.total_saldo_banco_positivo || 0) - (finalDinheiroLojas + finalCartoesACompensar));

      const baseBancoNegativo = Number(raw.saldo_negativo_itau ?? snapMeta.saldo_negativo_itau ?? 0);
      const baseBancoTotal = Number(raw.saldo_bancos_ofx ?? (baseBancoPositivo - baseBancoNegativo));

      // Dinheiro no cofre das lojas (em trânsito) compõe os ativos do Saldo Bancos + Dinheiro
      const finalDinheiroMp = Number(snapMeta.dinheiro_mp ?? raw.dinheiro_mp ?? 0);
      const cashToConsolidateInBank = finalDinheiroLojas;

      const finalTotalSaldoBancoPositivo = Number((baseBancoPositivo + cashToConsolidateInBank + finalCartoesACompensar).toFixed(2));
      const finalTotalSaldoBanco = Number((baseBancoTotal + cashToConsolidateInBank + finalCartoesACompensar).toFixed(2));

      const finalFatOiBase = Number(
        snapMeta.faturamento_oi_base ?? 
        ((snapMeta.odometro_hoje && snapMeta.faturamento_anterior && Number(snapMeta.odometro_hoje) >= Number(snapMeta.faturamento_anterior))
          ? (Number(snapMeta.odometro_hoje) - Number(snapMeta.faturamento_anterior))
          : null) ??
        raw.faturamento_oi_base ?? 
        0
      );
      const finalFatPeriodo = Number(
        (finalFatOiBase > 0 
          ? (finalFatOiBase + Number(raw.faturamento_ajustes || 0)) 
          : (raw.faturamento_periodo ?? snapMeta.faturamento_periodo ?? 0)
        ).toFixed(2)
      );

      const finalOdometroHoje = Number(snapMeta.odometro_hoje ?? raw.odometro_hoje ?? 0);
      const finalFatAnterior = Number(snapMeta.faturamento_anterior ?? raw.faturamento_anterior ?? 0);

      // Caixa Atual Canônico Universal: Ativos - Cheque Especial
      const finalAReceber = Number(
        snapshotData?.a_receber_manual ?? 
        raw.a_receber ?? 
        snapMeta.a_receber_manual ?? 
        snapMeta.a_receber ?? 
        0
      );
      const livePatio = Number(raw.na_loja_os || 0);
      const snapPatio = Number(snapshotData?.total_patio ?? snapMeta.total_patio ?? snapMeta.na_loja_os ?? 0);
      const finalNaLojaOs = livePatio > 0 ? livePatio : snapPatio;

      const calculatedCaixaAtual = Number((finalTotalSaldoBancoPositivo + finalDinheiroMp + finalAReceber + finalNaLojaOs - baseBancoNegativo).toFixed(2));
      const finalCaixaAtual = Number(
        (snapMeta.is_marco_zero && snapshotData?.caixa_atual !== undefined && snapshotData?.caixa_atual !== null)
          ? snapshotData.caixa_atual
          : calculatedCaixaAtual
      );
      const finalCaixaAnterior = Number(snapMeta.caixa_anterior ?? raw.caixa_anterior ?? 0);
      const finalFluxoCaixa = Number((finalCaixaAtual - finalCaixaAnterior).toFixed(2));

      const finalSubtotalContas = Number(totalManualBills + Number(raw.juros_rede || 0));
      const finalValorDisp = Number((finalFatPeriodo - finalFluxoCaixa).toFixed(2));
      const finalDiferenca = Number(
        (snapMeta.is_marco_zero && snapMeta.diferenca_final !== undefined)
          ? snapMeta.diferenca_final
          : (finalValorDisp - finalSubtotalContas).toFixed(2)
      );

      const totalEntradasOfx = Number(storesList.reduce((acc, s) => acc + (s.entradas_realizadas || 0), 0).toFixed(2));
      const totalSaidasOfx = Number(storesList.reduce((acc, s) => acc + (s.saidas_ofx || 0), 0).toFixed(2));

      return {
        ...raw,
        stores: storesList,
        stores_detail: storesList,
        total_entradas_ofx: totalEntradasOfx,
        total_saidas_ofx: totalSaidasOfx,
        ofx_out: totalSaidasOfx,
        faturamento_ofx: totalEntradasOfx,
        saldo_bancos_ofx: baseBancoTotal,
        saldo_bancos_positivo: baseBancoPositivo,
        saldo_negativo_itau: baseBancoNegativo,
        dinheiro_lojas: finalDinheiroLojas,
        dinheiro_em_lojas: finalDinheiroLojas,
        cartoes_a_compensar: finalCartoesACompensar,
        devolucoes_rede: Number(raw.devolucoes_rede ?? 0),
        total_saldo_banco_positivo: finalTotalSaldoBancoPositivo,
        total_saldo_banco: finalTotalSaldoBanco,
        dinheiro_mp: finalDinheiroMp,
        a_receber: finalAReceber,
        a_receber_manual: finalAReceber,
        na_loja_os: finalNaLojaOs,
        total_patio: finalNaLojaOs,
        caixa_atual: finalCaixaAtual,
        caixa_anterior: finalCaixaAnterior,
        fluxo_caixa: finalFluxoCaixa,
        faturamento_periodo: finalFatPeriodo > 0 ? finalFatPeriodo : raw.faturamento_periodo,
        faturamento_oi_base: finalFatOiBase > 0 ? finalFatOiBase : raw.faturamento_oi_base,
        faturamento_anterior: finalFatAnterior > 0 ? finalFatAnterior : raw.faturamento_anterior,
        odometro_hoje: finalOdometroHoje > 0 ? finalOdometroHoje : raw.odometro_hoje,
        faturamento_ajustes: Number(raw.faturamento_ajustes ?? 0),
        valor_disp_contas: finalValorDisp,
        contas_base: totalManualBills,
        contas_extras: Number(raw.contas_extras ?? 0),
        contas_manual: totalManualBills,
        juros_rede: Number(raw.juros_rede ?? 0),
        is_closed: Boolean(snapshotData?.is_closed ?? raw.is_closed),
        is_marco_zero: Boolean(snapMeta.is_marco_zero),
        subtotal_contas: finalSubtotalContas,
        diferenca_final: finalDiferenca,
        status_geral: (raw.status_geral === 'approved' || Math.abs(finalDiferenca) <= 50) ? 'approved' : 'divergence',
      } as DailyReconciliationSummary;
    },
    enabled: !!date,
    staleTime: 1000 * 30, // 30s cache
  });
}

export function usePosTripleReconciliation(date: string) {
  return useQuery({
    queryKey: ['pos-triple-reconciliation', date],
    queryFn: async (): Promise<PosTripleReconciliationResult | null> => {
      if (!date) return null;

      const { data, error } = await supabase.rpc('get_store_pos_triple_reconciliation', {
        p_target_date: date
      });

      if (error) {
        console.error("Erro ao carregar conciliação tripla de maquininhas:", error);
        throw error;
      }

      return data as unknown as PosTripleReconciliationResult;
    },
    enabled: !!date,
    staleTime: 1000 * 30,
  });
}


