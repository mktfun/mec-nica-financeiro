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
  saldo_negativo_itau?: number;
  dinheiro_em_lojas?: number;
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
  stores: StoreReconciliationSummary[];
  stores_detail?: StoreReconciliationSummary[];
  maquininhas_detalhe?: PosTripleReconciliationResult;
}

export function useDailyReconciliationSummary(date: string) {
  return useQuery({
    queryKey: ['daily-reconciliation-summary', date],
    queryFn: async (): Promise<DailyReconciliationSummary | null> => {
      if (!date) return null;

      const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', {
        p_date: date
      });

      if (error) {
        console.error("Erro ao carregar resumo consolidado do backend:", error);
        throw error;
      }

      return data as unknown as DailyReconciliationSummary;
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


