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
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('target_date', date)
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
  entradas_realizadas?: number;
  entradas_previsto?: number;
  diferenca_entradas?: number;
  saidas_ofx?: number;
  contas_loja?: number;
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
        console.error("Erro ao carregar resumo consolidado do backend:", error);
        throw error;
      }

      if (!data) return null;

      const rawSummary = data as any;

      // Blindagem Defensiva: Garante que saldo_banco_ofx, dinheiro_loja acumulado em trânsito e nao_entrou_valor estejam sempre presentes
      // 1. Busca store_cash_vault para considerar dinheiro em trânsito acumulado até a data
      let extraVaultEntries: any[] = [];
      let totalVaultInTransit = 0;
      try {
        const { data: vaultData } = await supabase
          .from('store_cash_vault')
          .select('id, store_id, amount, status, entry_date, description, os_number_ref')
          .in('status', ['em_transito', 'pending'])
          .lte('entry_date', date);

        if (vaultData && vaultData.length > 0) {
          extraVaultEntries = vaultData;
          totalVaultInTransit = vaultData.reduce((sum, v) => sum + Number(v.amount || 0), 0);
        }
      } catch (err) {
        console.warn('Erro ao enriquecer vault:', err);
      }

      // 2. Busca pos_transactions pendentes (A Compensar / Não Entrou)
      let extraPosEntries: any[] = [];
      let totalPosUnsettled = 0;
      let posQuerySuccess = false;
      try {
        const { data: posData, error: posErr } = await supabase
          .from('pos_transactions')
          .select('id, store_id, net_amount, settlement_status')
          .eq('target_date', date);

        if (!posErr && posData) {
          extraPosEntries = posData.filter((p: any) => p.settlement_status === 'nao_entrou' || p.settlement_status === 'a_compensar');
          totalPosUnsettled = extraPosEntries.reduce((sum, p) => sum + Number(p.net_amount || 0), 0);
          posQuerySuccess = true;
        }
      } catch (err) {
        console.warn('Erro ao enriquecer pos_transactions:', err);
      }

      // 3. Busca daily_snapshots para proteger faturamento, odômetro e cálculos contra falha/subtração da RPC
      let snapshotData: any = null;
      try {
        const { data: snap } = await supabase
          .from('daily_snapshots')
          .select('faturamento, metadata')
          .eq('date', date)
          .maybeSingle();
        if (snap) {
          snapshotData = snap;
        }
      } catch (err) {
        console.warn('Erro ao buscar daily_snapshots para resumo:', err);
      }

      const enrichedStores = (rawSummary.stores || []).map((s: any) => {
        const saldo_banco_ofx = Number(s.saldo_banco_ofx ?? s.saldo_banco_itau ?? s.saldo_banco ?? 0);
        
        const storeVault = extraVaultEntries.filter(v => v.store_id === s.store_id);
        const vaultSum = storeVault.reduce((sum, v) => sum + Number(v.amount || 0), 0);
        const dinheiro_loja = Number(vaultSum > 0 ? vaultSum : (s.dinheiro_loja || 0));

        const storePos = extraPosEntries.filter(p => p.store_id === s.store_id);
        const posSum = storePos.reduce((sum, p) => sum + Number(p.net_amount || 0), 0);
        // Se a consulta a pos_transactions pendentes rodou com sucesso, posSum reflete a verdade de pendência
        let nao_entrou_valor = posQuerySuccess ? posSum : Number(s.nao_entrou_valor ?? 0);

        const vault_entries = Array.isArray(s.vault_entries) && s.vault_entries.length > 0 
          ? s.vault_entries 
          : storeVault;

        return {
          ...s,
          saldo_banco_ofx,
          saldo_banco_itau: s.saldo_banco_itau ?? saldo_banco_ofx,
          dinheiro_loja,
          nao_entrou_valor,
          vault_entries,
          status_compensacao: nao_entrou_valor <= 0.05 ? 'entrou' : (s.status_compensacao || 'nao_entrou')
        };
      });

      const totalVaultStores = enrichedStores.reduce((sum: number, s: any) => sum + Number(s.dinheiro_loja || 0), 0);
      const finalDinheiroLojas = totalVaultStores > 0 ? totalVaultStores : Number(totalVaultInTransit || rawSummary.dinheiro_lojas || rawSummary.dinheiro_em_lojas || 0);
      const totalNaoEntrouStores = enrichedStores.reduce((sum: number, s: any) => sum + Number(s.nao_entrou_valor || 0), 0);
      const finalCartoesACompensar = posQuerySuccess ? totalPosUnsettled : (totalNaoEntrouStores > 0 ? totalNaoEntrouStores : Number(rawSummary.cartoes_a_compensar || 0));

      // Agrega saldos bancários positivos e negativos a partir de enrichedStores
      const storesPositiveOfx = enrichedStores.reduce((sum: number, s: any) => 
        sum + (Number(s.saldo_banco_ofx || 0) > 0 ? Number(s.saldo_banco_ofx) : 0), 0
      );
      const storesNegativeOfx = enrichedStores.reduce((sum: number, s: any) => 
        sum + (Number(s.saldo_banco_ofx || 0) < 0 ? Math.abs(Number(s.saldo_banco_ofx)) : 0), 0
      );

      const baseBancoPositivo = storesPositiveOfx > 0 
        ? Number(storesPositiveOfx.toFixed(2)) 
        : Number(rawSummary.saldo_bancos_positivo ?? rawSummary.saldo_bancos_ofx_positivo ?? 0);
      const baseBancoNegativo = storesNegativeOfx > 0 
        ? Number(storesNegativeOfx.toFixed(2)) 
        : Number(rawSummary.saldo_negativo_itau ?? 0);
      const baseBancoTotal = storesPositiveOfx > 0 
        ? Number((storesPositiveOfx - baseBancoNegativo).toFixed(2)) 
        : Number(rawSummary.saldo_bancos_ofx ?? rawSummary.total_saldo_banco ?? 0);

      const finalTotalSaldoBancoPositivo = Number((baseBancoPositivo + finalDinheiroLojas + finalCartoesACompensar).toFixed(2));
      const finalTotalSaldoBanco = Number((baseBancoTotal + finalDinheiroLojas + finalCartoesACompensar).toFixed(2));

      // Protege faturamento e odômetro contra a subtração indevida da RPC get_daily_reconciliation_summary
      const snapMeta = (snapshotData?.metadata as any) || {};
      const finalFatOiBase = Number(
        snapMeta.faturamento_oi_base ?? 
        (snapshotData?.faturamento && Number(snapshotData.faturamento) < 100000 ? snapshotData.faturamento : null) ?? 
        rawSummary.faturamento_oi_base ?? 
        0
      );
      const finalFatPeriodo = Number(
        (finalFatOiBase > 0 
          ? (finalFatOiBase + Number(rawSummary.faturamento_ajustes || 0)) 
          : (rawSummary.faturamento_periodo ?? snapMeta.faturamento_periodo ?? 0)
        ).toFixed(2)
      );
      const finalOdometroHoje = Number(snapMeta.odometro_hoje ?? rawSummary.odometro_hoje ?? 0);
      const finalFatAnterior = Number(snapMeta.faturamento_anterior ?? rawSummary.faturamento_anterior ?? 0);
      const finalFluxoCaixa = Number(rawSummary.fluxo_caixa ?? 0);
      const finalSubtotalContas = Number(rawSummary.subtotal_contas ?? 0);
      const finalValorDisp = Number((finalFatPeriodo - finalFluxoCaixa).toFixed(2));
      const finalDiferenca = Number((finalValorDisp - finalSubtotalContas).toFixed(2));

      return {
        ...rawSummary,
        dinheiro_lojas: finalDinheiroLojas,
        dinheiro_em_lojas: finalDinheiroLojas,
        cartoes_a_compensar: finalCartoesACompensar,
        saldo_bancos_ofx_positivo: baseBancoPositivo,
        saldo_bancos_positivo: baseBancoPositivo,
        saldo_negativo_itau: baseBancoNegativo,
        saldo_bancos_ofx: baseBancoTotal,
        total_saldo_banco_positivo: finalTotalSaldoBancoPositivo > 0 ? finalTotalSaldoBancoPositivo : rawSummary.total_saldo_banco_positivo,
        total_saldo_banco: finalTotalSaldoBanco !== 0 ? finalTotalSaldoBanco : rawSummary.total_saldo_banco,
        faturamento_oi_base: finalFatOiBase > 0 ? finalFatOiBase : rawSummary.faturamento_oi_base,
        faturamento_periodo: finalFatPeriodo > 0 ? finalFatPeriodo : rawSummary.faturamento_periodo,
        odometro_hoje: finalOdometroHoje > 0 ? finalOdometroHoje : rawSummary.odometro_hoje,
        faturamento_anterior: finalFatAnterior > 0 ? finalFatAnterior : rawSummary.faturamento_anterior,
        valor_disp_contas: finalValorDisp,
        diferenca_final: finalDiferenca,
        stores: enrichedStores,
        stores_detail: enrichedStores
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


