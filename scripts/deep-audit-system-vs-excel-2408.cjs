const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excelPath = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(excelPath);

async function main() {
  console.log('========================================================================');
  console.log('AUDITORIA FORENSE: SISTEMA vs EXCEL CONCILIAÇÃO 2408 (1).xlsx');
  console.log('========================================================================\n');

  // 1. Fetch current RPC output
  const { data: rpc, error: rpcErr } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
    return;
  }

  // 2. Fetch daily_snapshots
  const { data: snapshot } = await s.from('daily_snapshots').select('*').eq('date', '2026-08-24').single();
  
  // 3. Fetch reconciliations
  const { data: recons } = await s.from('reconciliations').select('*').eq('date', '2026-08-24');

  // 4. Fetch daily_manual_bills
  const { data: manualBills } = await s.from('daily_manual_bills').select('*').eq('date', '2026-08-24');

  // 5. Fetch daily_revenue_adjustments
  const { data: revAdjustments } = await s.from('daily_revenue_adjustments').select('*').eq('date', '2026-08-24');

  // 6. Fetch store_cash_vault
  const { data: vault } = await s.from('store_cash_vault').select('*').lte('entry_date', '2026-08-24');

  console.log('--- 1. SALDO BANCOS (OFX) ---');
  console.log('RPC Saldo Bancos OFX:', rpc.saldo_bancos_ofx);
  console.log('RPC Total Saldo Banco (Pilar 1):', rpc.total_saldo_banco);
  console.log('Reconciliations por loja:');
  (recons || []).forEach(r => {
    console.log(`  Loja ID: ${r.store_id} | Bank Total: ${r.bank_total}`);
  });

  console.log('\n--- 2. CONTAS A PAGAR (MANUAL) ---');
  console.log('RPC contas_base (Snapshot):', rpc.contas_base);
  console.log('RPC contas_extras (daily_manual_bills):', rpc.contas_extras);
  console.log('RPC contas_manual (Total):', rpc.contas_manual);
  console.log('daily_manual_bills rows:', manualBills);

  console.log('\n--- 3. PÁTIO (NA LOJA OS) ---');
  console.log('RPC na_loja_os:', rpc.na_loja_os);

  console.log('\n--- 4. DINHEIRO MP & A RECEBER ---');
  console.log('RPC dinheiro_mp:', rpc.dinheiro_mp);
  console.log('RPC a_receber:', rpc.a_receber);
  console.log('Snapshot data:', snapshot);

  console.log('\n--- 5. JUROS REDE ---');
  console.log('RPC juros_rede:', rpc.juros_rede);

  console.log('\n--- 6. FATURAMENTO ---');
  console.log('RPC faturamento_oi_base:', rpc.faturamento_oi_base);
  console.log('RPC faturamento_ajustes:', rpc.faturamento_ajustes);
  console.log('RPC faturamento_periodo:', rpc.faturamento_periodo);
  console.log('daily_revenue_adjustments:', revAdjustments);

  console.log('\n--- 7. CAIXA & FLUXO & DIFERENÇA ---');
  console.log('Caixa Anterior:', rpc.caixa_anterior);
  console.log('Caixa Atual:', rpc.caixa_atual);
  console.log('Fluxo Caixa:', rpc.fluxo_caixa);
  console.log('Valor Disp Contas:', rpc.valor_disp_contas);
  console.log('Subtotal Contas:', rpc.subtotal_contas);
  console.log('Diferenca Final:', rpc.diferenca_final);
  console.log('Status Geral:', rpc.status_geral);
}
main();
