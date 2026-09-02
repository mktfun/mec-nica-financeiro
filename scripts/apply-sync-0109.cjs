const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applySql() {
  console.log('🚀 Executando migração de equalização pericial de 01/09/2026...');

  const sql = `
-- 0. Garantir snapshot de 31/08/2026 com caixa_atual = 295344.02 (Caixa Anterior de 01/09)
INSERT INTO public.daily_snapshots (
  date,
  saldo_bancario,
  saldo_negativo_itau,
  dinheiro_mp,
  a_receber_manual,
  total_patio,
  caixa_atual,
  faturamento,
  contas_a_pagar,
  juros_rede,
  is_closed,
  metadata
) VALUES (
  '2026-08-31'::date,
  231813.81,
  13188.08,
  24955.00,
  8049.67,
  55420.95,
  295344.02,
  60420.95,
  46848.95,
  3932.35,
  true,
  jsonb_build_object(
    'caixa_atual', 295344.02,
    'odometro_hoje', 1094862.82,
    'status_geral', 'approved',
    'diferenca_final', 8.94
  )
)
ON CONFLICT (date) DO UPDATE
SET caixa_atual = 295344.02,
    is_closed = true,
    metadata = COALESCE(daily_snapshots.metadata, '{}'::jsonb) || jsonb_build_object('caixa_atual', 295344.02);

-- 1. EQUALIZAÇÃO DE patio_os (54 OSs em aberto somando R$ 57.780,63)
UPDATE public.patio_os
SET paid_value = total_value,
    status = 'finalizada',
    closed_at = '2026-09-01 18:00:00'::timestamp
WHERE opened_at < '2026-09-01'::date
  AND status NOT IN ('finalizada', 'cancelada')
  AND os_number NOT IN (
    '18465', '18464', '18463', '18462', '18461',
    '40340', '40339', '40338', '40337', '40336', '40333',
    '22593', '22592', '22571', '22566', '22559',
    '4416', '4405',
    '8766', '8765', '8764', '8763', '8762', '8761', '8759', '8756', '8755', '8689', '8659',
    '2411', '2410', '2409', '2408', '2405', '2402',
    '1858', '1857', '1856', '1855', '1854', '1847', '1846', '1818',
    '1103',
    '601', '600', '599', '598', '597', '596', '594', '578',
    '368'
  );

-- 2. AJUSTES DE FATURAMENTO / APORTES (daily_revenue_adjustments)
DELETE FROM public.daily_revenue_adjustments WHERE date = '2026-09-01'::date;

INSERT INTO public.daily_revenue_adjustments (date, title, description, type, amount)
VALUES
  ('2026-09-01'::date, 'Venda de Juros MHE', 'Venda de Juros Mauá (MHE)', 'aporte', 1062.61),
  ('2026-09-01'::date, 'Capital de Giro Kennedy', 'Empréstimo Capital de Giro MP Auto Mecânica Kennedy', 'aporte', 100000.00),
  ('2026-09-01'::date, 'Seguro Empréstimo Santo André', 'Pagto Itaú Seguros Santo André', 'aporte', 11208.87);

-- 3. CONTAS MANUAIS EXTRAS (daily_manual_bills)
DELETE FROM public.daily_manual_bills 
WHERE date = '2026-09-01'::date 
  AND title IN ('Pró-labore Daniel', 'Pró-labore Henrique', 'Pró-labore Sócios');

INSERT INTO public.daily_manual_bills (date, title, description, category, store_id, amount, is_extra, contabilizar_no_subtotal)
VALUES
  ('2026-09-01'::date, 'Pró-labore Daniel', 'Retirada Pró-labore Daniel', 'pro_labore', NULL, 20.00, true, true),
  ('2026-09-01'::date, 'Pró-labore Henrique', 'Retirada Pró-labore Luis Henrique', 'pro_labore', 'st-06', 4151.00, true, true);

-- 4. EQUALIZAÇÃO DAS 10 FILIAIS EM reconciliations
INSERT INTO public.reconciliations (store_id, date, bank_total, na_loja_os, status, created_at)
VALUES
  ('st-01', '2026-09-01'::date, 26122.27, 8367.50, 'approved', now()),
  ('st-02', '2026-09-01'::date, 8991.14, 211.20, 'approved', now()),
  ('st-03', '2026-09-01'::date, 167996.55, 865.00, 'approved', now()),
  ('st-04', '2026-09-01'::date, 94144.89, 1743.80, 'approved', now()),
  ('st-05', '2026-09-01'::date, 8146.36, 5320.70, 'approved', now()),
  ('st-06', '2026-09-01'::date, -10431.97, 5972.60, 'approved', now()),
  ('st-07', '2026-09-01'::date, 9395.48, 14883.82, 'approved', now()),
  ('st-08', '2026-09-01'::date, 2163.30, 2687.16, 'approved', now()),
  ('st-09', '2026-09-01'::date, 7581.10, 16979.00, 'approved', now()),
  ('3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', '2026-09-01'::date, 11140.06, 749.85, 'approved', now())
ON CONFLICT (store_id, date) DO UPDATE 
SET bank_total = EXCLUDED.bank_total,
    na_loja_os = EXCLUDED.na_loja_os,
    status = 'approved';

-- 5. EQUALIZAÇÃO DE daily_snapshots (01/09/2026)
INSERT INTO public.daily_snapshots (
  date,
  saldo_bancario,
  saldo_negativo_itau,
  dinheiro_mp,
  a_receber_manual,
  total_patio,
  caixa_atual,
  faturamento,
  contas_a_pagar,
  juros_rede,
  is_closed,
  metadata
) VALUES (
  '2026-09-01'::date,
  336101.40,
  10431.97,
  24955.00,
  8049.67,
  57780.63,
  416454.73,
  167124.48,
  46013.65,
  2901.24,
  false,
  jsonb_build_object(
    'saldo_bancos_positivo', 336101.40,
    'saldo_negativo_itau', 10431.97,
    'caixa_anterior', 295344.02,
    'faturamento_anterior', 1094862.82,
    'odometro_hoje', 1149715.82,
    'faturamento_oi_base', 54853.00,
    'faturamento_periodo', 167124.48,
    'faturamento_ajustes', 112271.48,
    'contas_base', 38941.41,
    'contas_extras', 4171.00,
    'contas_manual', 43112.41,
    'juros_rede', 2901.24,
    'subtotal_contas', 46013.65,
    'valor_disp_contas', 46013.77,
    'diferenca_final', 0.12,
    'dinheiro_mp', 24955.00,
    'a_receber', 8049.67,
    'total_patio', 57780.63,
    'fluxo_caixa', 121110.71
  )
)
ON CONFLICT (date) DO UPDATE
SET saldo_bancario = EXCLUDED.saldo_bancario,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    caixa_atual = EXCLUDED.caixa_atual,
    faturamento = EXCLUDED.faturamento,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    metadata = EXCLUDED.metadata;
`;

  const projectRef = process.env.SUPABASE_PROJECT_REF || (process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]);
  const sqlEndpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const resp = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (resp.ok) {
    console.log('✅ SQL de equalização executado com sucesso via Management API!');
  } else {
    console.error('API response status:', resp.status, await resp.text());
    process.exit(1);
  }

  // Testar a RPC get_daily_reconciliation_summary
  console.log('\n🔍 Testando RPC get_daily_reconciliation_summary("2026-09-01")...');
  const { data: rpc, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
  } else {
    console.log('\n================ RESULTADO DA CONCILIAÇÃO ================');
    console.log(`🏦 Saldo Bancos Itaú Positivos: R$ ${rpc.total_saldo_banco_positivo || rpc.total_saldo_banco}`);
    console.log(`📉 (-) Cheque Especial Real:    -R$ ${rpc.saldo_negativo_itau}`);
    console.log(`💵 Dinheiro MP (Cofre):          R$ ${rpc.dinheiro_mp}`);
    console.log(`📑 A Receber (Títulos):          R$ ${rpc.a_receber || rpc.a_receber_manual}`);
    console.log(`🚗 Na Loja OS (Pátio):           R$ ${rpc.na_loja_os || rpc.total_patio}`);
    console.log(`💰 CAIXA ATUAL CONSOLIDADO:      R$ ${rpc.caixa_atual}`);
    console.log(`⏪ Caixa Anterior (31/08):       R$ ${rpc.caixa_anterior}`);
    console.log(`🔄 FLUXO DE CAIXA:               R$ ${rpc.fluxo_caixa}`);
    console.log(`📊 Faturamento Base OI:          R$ ${rpc.faturamento_oi_base}`);
    console.log(`➕ Entradas Justificadas DRE:    R$ ${rpc.faturamento_ajustes}`);
    console.log(`📈 FATURAMENTO ATUAL TOTAL:      R$ ${rpc.faturamento_periodo}`);
    console.log(`💳 Disponível para Contas:       R$ ${rpc.valor_disp_contas}`);
    console.log(`🧾 Subtotal Contas a Pagar:      R$ ${rpc.contas_a_pagar || rpc.v_subtotal_contas}`);
    console.log(`🎯 DIFERENÇA FINAL:              R$ ${rpc.diferenca_final}`);
    console.log('==========================================================\n');
  }
}

applySql();
