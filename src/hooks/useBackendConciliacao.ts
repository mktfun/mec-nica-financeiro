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
        console.error("Erro ao carregar resumo consolidado do backend via get_daily_reconciliation_summary:", error);
        throw error;
      }

      if (!data) return null;

      const raw = data as any;
      const storesList: StoreReconciliationSummary[] = (raw.stores || raw.stores_detail || []).map((s: any) => ({
        store_id: s.store_id,
        store_name: s.store_name,
        color: s.color,
        saldo_banco: Number(s.saldo_banco ?? s.saldo_banco_ofx ?? 0),
        saldo_banco_ofx: Number(s.saldo_banco_ofx ?? s.saldo_banco ?? 0),
        saldo_devedor_real: Number(s.saldo_devedor_real ?? (Number(s.saldo_banco || 0) < 0 ? Math.abs(Number(s.saldo_banco)) : 0)),
        saldo_positivo_real: Number(s.saldo_positivo_real ?? (Number(s.saldo_banco || 0) > 0 ? Number(s.saldo_banco) : 0)),
        dinheiro_loja: Number(s.dinheiro_loja ?? 0),
        vault_entries: s.vault_entries || [],
        nao_entrou_valor: Number(s.nao_entrou_valor ?? s.cartao_nao_entrou ?? 0),
        rede_bruto: Number(s.rede_bruto ?? 0),
        rede_liquido: Number(s.rede_liquido ?? s.maquininha ?? 0),
        rede_devolucoes: Number(s.rede_devolucoes ?? s.devolucoes_rede ?? 0),
        ofx_maquininhas: Number(s.ofx_maquininhas ?? 0),
        status_compensacao: s.status_compensacao || (Number(s.nao_entrou_valor ?? 0) <= 0.05 ? 'entrou' : 'nao_entrou'),
        status_banco: s.status_banco || 'credor',
        maquininha: Number(s.maquininha ?? s.rede_liquido ?? 0),
        pix: Number(s.pix ?? s.pix_total ?? 0),
        na_loja_os: Number(s.na_loja_os ?? s.patio_os ?? 0),
        patio_os: Number(s.patio_os ?? s.na_loja_os ?? 0),
        previsto_ofx: Number(s.previsto_ofx ?? s.entradas_conciliadas ?? 0),
        diferenca: Number(s.diferenca ?? s.diferenca_total ?? 0),
        status: (s.status || (Math.abs(Number(s.diferenca || 0)) <= 0.05 ? 'approved' : 'divergence')) as 'approved' | 'divergence',
        entradas_realizadas: Number(s.ofx_entradas_total ?? s.entradas_realizadas ?? 0),
        entradas_previsto: Number(s.entradas_conciliadas ?? s.entradas_previsto ?? 0),
        diferenca_entradas: Number(s.dif_entradas ?? s.diferenca_entradas ?? 0),
        saidas_ofx: Number(s.ofx_saidas_total ?? s.saidas_ofx ?? 0),
        contas_loja: Number(s.contas_loja_total ?? s.contas_conciliadas ?? 0),
        diferenca_saidas: Number(s.dif_saidas ?? s.diferenca_saidas ?? 0),
      }));

      return {
        ...raw,
        stores: storesList,
        stores_detail: storesList,
        saldo_bancos_ofx: Number(raw.saldo_bancos_ofx ?? raw.total_saldo_banco ?? 0),
        saldo_bancos_positivo: Number(raw.saldo_bancos_positivo ?? raw.total_saldo_banco_positivo ?? 0),
        saldo_negativo_itau: Number(raw.saldo_negativo_itau ?? 0),
        dinheiro_lojas: Number(raw.dinheiro_lojas ?? raw.dinheiro_em_lojas ?? 0),
        dinheiro_em_lojas: Number(raw.dinheiro_em_lojas ?? raw.dinheiro_lojas ?? 0),
        cartoes_a_compensar: Number(raw.cartoes_a_compensar ?? 0),
        devolucoes_rede: Number(raw.devolucoes_rede ?? 0),
        total_saldo_banco_positivo: Number(raw.total_saldo_banco_positivo ?? raw.saldo_bancos_positivo ?? 0),
        total_saldo_banco: Number(raw.total_saldo_banco ?? raw.saldo_bancos_ofx ?? 0),
        dinheiro_mp: Number(raw.dinheiro_mp ?? 0),
        a_receber: Number(raw.a_receber ?? raw.a_receber_manual ?? 0),
        na_loja_os: Number(raw.na_loja_os ?? raw.total_patio ?? 0),
        caixa_atual: Number(raw.caixa_atual ?? 0),
        caixa_anterior: Number(raw.caixa_anterior ?? 0),
        fluxo_caixa: Number(raw.fluxo_caixa ?? 0),
        faturamento_periodo: Number(raw.faturamento_periodo ?? raw.faturamento ?? 0),
        faturamento_oi_base: Number(raw.faturamento_oi_base ?? 0),
        faturamento_anterior: Number(raw.faturamento_anterior ?? 0),
        faturamento_ajustes: Number(raw.faturamento_ajustes ?? 0),
        valor_disp_contas: Number(raw.valor_disp_contas ?? 0),
        contas_base: Number(raw.contas_base ?? 0),
        contas_extras: Number(raw.contas_extras ?? 0),
        contas_manual: Number(raw.contas_manual ?? 0),
        juros_rede: Number(raw.juros_rede ?? 0),
        subtotal_contas: Number(raw.subtotal_contas ?? raw.contas_a_pagar ?? 0),
        diferenca_final: Number(raw.diferenca_final ?? 0),
        status_geral: (raw.status_geral === 'approved' || Math.abs(Number(raw.diferenca_final || 0)) <= 50) ? 'approved' : 'divergence',
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


