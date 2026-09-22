// tests/e2e/harness/config.mjs
// Authoritative configurations derived from ORIGINAL_REQUEST.md and PROJECT.md

export const REAL_DATES = [
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-21',
  '2026-08-24',
  '2026-09-16'
];

export const CANONICAL_MATCH_STATUSES = [
  'pending',
  'matched',
  'batch',
  'intercompany',
  'cancelled',
  'ignored'
];

export const CANONICAL_CLOSURE_STATUSES = [
  'approved',
  'divergence'
];

export const TOLERANCE_LIMIT = 50.00;

export const EXPECTED_STORE_COUNT = 10;

export const EXPECTED_5_PILLARS = [
  'total_saldo_banco',
  'dinheiro_lojas',
  'cartoes_a_compensar',
  'total_patio',
  'subtotal_contas'
];

export const EXPECTED_SUMMARY_FIELDS = [
  'date',
  'is_closed',
  'is_marco_zero',
  'closed_at',
  'status_geral',
  'diferenca_final',
  'saldo_bancos_ofx',
  'saldo_bancos_positivo',
  'saldo_negativo_itau',
  'total_saldo_banco',
  'dinheiro_lojas',
  'cartoes_a_compensar',
  'devolucoes_rede',
  'dinheiro_mp',
  'a_receber',
  'na_loja_os',
  'total_patio',
  'caixa_atual',
  'caixa_anterior',
  'fluxo_caixa',
  'faturamento_periodo',
  'faturamento_oi_base',
  'faturamento_ajustes',
  'odometro_anterior',
  'odometro_hoje',
  'contas_base',
  'juros_rede',
  'subtotal_contas',
  'valor_disp_contas',
  'stores'
];

export const EXPECTED_STORE_FIELDS = [
  'store_id',
  'store_name',
  'saldo_banco',
  'saldo_banco_ofx',
  'saldo_positivo_real',
  'saldo_devedor_real',
  'dinheiro_loja',
  'rede_bruto',
  'rede_liquido',
  'rede_taxas',
  'rede_devolucoes',
  'ofx_maquininhas',
  'nao_entrou_valor',
  'status_compensacao',
  'status_banco',
  'pix',
  'na_loja_os',
  'entradas_realizadas',
  'entradas_previsto',
  'diferenca_entradas',
  'saidas_ofx',
  'contas_loja',
  'diferenca_saidas',
  'diferenca',
  'status'
];
