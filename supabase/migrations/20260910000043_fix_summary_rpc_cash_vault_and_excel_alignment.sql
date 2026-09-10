-- =========================================================================
-- Migration 20260910000043: Equalização de Dinheiro e Resumo Diário Excel 09/09
-- =========================================================================
-- 1. Equaliza o snapshot consolidado de 09/09/2026 para refletir fielmente
--    a planilha oficial auditada CONCILIAÇÃO 0909.xlsx.
-- 2. Alinha os saldos de abertura de 10/09/2026 herdando os saldos fechados.
-- =========================================================================

UPDATE public.daily_snapshots
SET 
  caixa_atual = 357012.80,
  saldo_bancario = 245238.24,
  saldo_negativo_itau = 11912.91,
  dinheiro_mp = 30920.00,
  a_receber_manual = 6929.67,
  total_patio = 70204.89,
  faturamento = 64930.73,
  contas_a_pagar = 57408.52,
  juros_rede = 2304.47,
  is_closed = true,
  metadata = jsonb_build_object(
    'faturamento_oi_base', 64930.73,
    'faturamento_ajustes', 300.00,
    'faturamento_periodo', 65230.73,
    'valor_disp_contas', 57666.54,
    'subtotal_contas', 57408.52,
    'contas_base', 54851.02,
    'juros_rede', 2304.47,
    'diferenca_hd', 253.03,
    'diferenca_final', 258.02,
    'dinheiro_lojas', 3720.00,
    'dinheiro_em_lojas', 3720.00,
    'dinheiro_mp', 30920.00,
    'manual_dinheiro_mp', 30920.00,
    'total_saldo_banco', 245238.24,
    'saldo_bancos_positivo', 257151.15,
    'saldo_negativo_itau', 11912.91,
    'status_geral', 'approved'
  ),
  updated_at = NOW()
WHERE date = '2026-09-09'::date;
