import { z } from 'zod';

export const StoreReconciliationSchema = z.object({
  store_id: z.string(),
  store_name: z.string(),
  color: z.string().optional(),
  saldo_banco: z.number().default(0),
  saldo_banco_ofx: z.number().optional().default(0),
  saldo_devedor_real: z.number().optional().default(0),
  saldo_positivo_real: z.number().optional().default(0),
  dinheiro_loja: z.number().optional().default(0),
  vault_entries: z.array(z.object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
    entry_date: z.string(),
    description: z.string().optional(),
  })).optional(),
  nao_entrou_valor: z.number().optional().default(0),
  rede_bruto: z.number().optional().default(0),
  rede_liquido: z.number().optional().default(0),
  rede_taxas: z.number().optional().default(0),
  rede_devolucoes: z.number().optional().default(0),
  ofx_maquininhas: z.number().optional().default(0),
  status_compensacao: z.enum(['entrou', 'parcial', 'nao_entrou', 'sem_movimento', 'a_compensar']).or(z.string()).default('sem_movimento'),
  status_banco: z.enum(['credor', 'devedor', 'compensado_rede']).or(z.string()).default('credor'),
  maquininha: z.number().default(0),
  pix: z.number().default(0),
  na_loja_os: z.number().default(0),
  patio_os: z.number().optional(),
  previsto_ofx: z.number().default(0),
  diferenca: z.number().default(0),
  status: z.enum(['approved', 'divergence', 'pending', 'sem_movimento', 'conciliado']).or(z.string()).default('approved'),
  
  // Dual-split diagnostics
  ofx_entradas_total: z.number().optional().default(0),
  entradas_conciliadas: z.number().optional().default(0),
  entradas_realizadas: z.number().optional().default(0),
  entradas_previsto: z.number().optional().default(0),
  dif_entradas: z.number().optional().default(0),
  diferenca_entradas: z.number().optional().default(0),
  ofx_saidas_total: z.number().optional().default(0),
  saidas_ofx: z.number().optional().default(0),
  contas_conciliadas: z.number().optional().default(0),
  contas_loja_total: z.number().optional().default(0),
  contas_loja: z.number().optional().default(0),
  contas_centralizadas: z.number().optional().default(0),
  contas_locais: z.number().optional().default(0),
  dif_saidas: z.number().optional().default(0),
  diferenca_saidas: z.number().optional().default(0),

  // Flags de integridade e presença real de dados
  has_ofx_movement: z.boolean().optional(),
  has_rede_movement: z.boolean().optional(),
  has_bills_movement: z.boolean().optional(),
  is_empty_store: z.boolean().optional(),
});

export type ValidatedStoreReconciliation = z.infer<typeof StoreReconciliationSchema>;

export const DailyReconciliationSummarySchema = z.object({
  date: z.string(),
  data_atual: z.string().optional(),
  version: z.string().optional().default('1.0'),
  revision: z.number().optional().default(1),
  source: z.enum(['dynamic', 'snapshot', 'mixed']).optional().default('dynamic'),
  integrity_status: z.enum(['verified', 'incomplete_day', 'corrupted_snapshot']).optional().default('verified'),
  is_empty_day: z.boolean().optional().default(false),

  // Macro Pilares
  total_saldo_banco: z.number().default(0),
  total_saldo_banco_positivo: z.number().optional().default(0),
  total_saldo_banco_negativo: z.number().optional().default(0),
  total_ativos_positivos: z.number().optional().default(0),
  saldo_bancos_ofx: z.number().default(0),
  saldo_bancos_positivo: z.number().optional().default(0),
  saldo_bancos_ofx_positivo: z.number().optional().default(0),
  saldo_negativo_itau: z.number().optional().default(0),
  dinheiro_em_lojas: z.number().optional().default(0),
  dinheiro_lojas: z.number().optional().default(0),
  cartoes_a_compensar: z.number().default(0),
  dinheiro_mp: z.number().default(0),
  a_receber: z.number().default(0),
  na_loja_os: z.number().default(0),
  total_patio: z.number().optional().default(0),

  // Contas & Juros
  contas_base: z.number().optional().default(0),
  contas_extras: z.number().optional().default(0),
  contas_manual: z.number().default(0),
  contas_override: z.number().nullable().optional(),
  has_contas_override: z.boolean().optional(),
  total_bills: z.number().optional().default(0),
  juros_rede: z.number().default(0),
  devolucoes_rede: z.number().optional().default(0),
  ofx_out: z.number().optional().default(0),
  total_entradas_ofx: z.number().optional().default(0),
  total_saidas_ofx: z.number().optional().default(0),

  // Fluxo de Caixa
  caixa_atual: z.number().default(0),
  caixa_anterior: z.number().default(0),
  fluxo_caixa: z.number().default(0),

  // DRE & Faturamento
  faturamento_ofx: z.number().optional().default(0),
  faturamento_anterior: z.number().optional().default(0),
  odometro_anterior: z.number().optional().default(0),
  odometro_hoje: z.number().optional().default(0),
  faturamento_oi_base: z.number().optional().default(0),
  faturamento_ajustes: z.number().optional().default(0),
  faturamento_periodo: z.number().default(0),
  faturamento_itens: z.array(z.object({
    id: z.string(),
    title: z.string(),
    amount: z.number(),
    type: z.string(),
    description: z.string().optional(),
  })).optional(),
  contas_itens: z.array(z.object({
    id: z.string(),
    title: z.string(),
    amount: z.number(),
    category: z.string().optional(),
    description: z.string().optional(),
    store_id: z.string().optional(),
  })).optional(),

  // Fechamento & Diferenças
  valor_disp_contas: z.number().default(0),
  subtotal_contas: z.number().default(0),
  diferenca_final: z.number().default(0),
  status_geral: z.enum(['approved', 'divergence']).default('approved'),
  is_closed: z.boolean().optional().default(false),
  is_marco_zero: z.boolean().optional().default(false),
  closed_at: z.string().nullable().optional(),

  // Bicanais
  caixa_tesouraria: z.number().optional(),
  status_tesouraria: z.string().optional(),
  patio_wip: z.number().optional(),
  variacao_patio_delta_p4: z.number().optional(),
  fast_path_eligible: z.boolean().optional(),

  // Detalhamento Filiais
  stores: z.array(StoreReconciliationSchema).default([]),
  stores_detail: z.array(StoreReconciliationSchema).optional(),
  cash_vault_snapshot: z.any().optional(),
});

export type ValidatedDailyReconciliationSummary = z.infer<typeof DailyReconciliationSummarySchema>;

export function safeParseDailyReconciliationSummary(raw: unknown): ValidatedDailyReconciliationSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const result = DailyReconciliationSummarySchema.safeParse(raw);
  if (!result.success) {
    console.warn('[reconciliationContract] Erro de validação Zod no DailyReconciliationSummary:', result.error.format());
    return raw as ValidatedDailyReconciliationSummary;
  }
  return result.data;
}
