const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseAll() {
  console.log('=== 1. DIAGNOSTICO DE TABELAS APOS RE-IMPORTACAO ===');

  // OFX
  const { data: ofx } = await s.from('ofx_transactions').select('id, store_id, type, amount, counterpart_name').eq('target_date', '2026-08-24');
  console.log(`OFX Transactions: ${ofx ? ofx.length : 0}`);

  // POS
  const { data: pos } = await s.from('pos_transactions').select('id, store_id, gross_amount, net_amount, fee_amount, transaction_type').eq('target_date', '2026-08-24');
  console.log(`POS Transactions: ${pos ? pos.length : 0}`);
  let posGross = 0, posNet = 0, posFee = 0;
  (pos || []).forEach(p => {
    posGross += Number(p.gross_amount || 0);
    posNet += Number(p.net_amount || 0);
    posFee += Number(p.fee_amount || 0);
  });
  console.log(`POS Totais: Bruto R$ ${posGross.toFixed(2)} | Liquido R$ ${posNet.toFixed(2)} | Taxas R$ ${posFee.toFixed(2)}`);

  // Check duplicate POS
  const posCounts = {};
  (pos || []).forEach(p => {
    const k = `${p.store_id}_${p.gross_amount}_${p.net_amount}`;
    posCounts[k] = (posCounts[k] || 0) + 1;
  });
  const dupes = Object.entries(posCounts).filter(([k, count]) => count > 1);
  console.log('POS Duplicados encontrados:', dupes);

  // PATIO OS
  const { data: patio } = await s.from('patio_os').select('id, os_number, store_id, total_value, paid_value, status').lte('opened_at', '2026-08-24T23:59:59');
  console.log(`Total de OS no Pátio: ${patio ? patio.length : 0}`);
  const openPatio = (patio || []).filter(p => !['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes((p.status || '').toLowerCase()));
  console.log(`OSs em aberto no Pátio: ${openPatio.length}`);

  // DAILY MANUAL BILLS
  const { data: bills } = await s.from('daily_manual_bills').select('*').eq('date', '2026-08-24');
  console.log(`Contas a Pagar (daily_manual_bills): ${bills ? bills.length : 0}`);
  (bills || []).forEach(b => console.log(`  Conta: ${b.title} | Valor: R$ ${b.amount}`));

  // STORE CASH VAULT
  const { data: vault } = await s.from('store_cash_vault').select('*');
  console.log(`Dinheiro no Cofre (store_cash_vault): ${vault ? vault.length : 0}`);
  (vault || []).forEach(v => console.log(`  Cofre: ${v.description} | R$ ${v.amount} | Status: ${v.status} | Data: ${v.entry_date}`));

  // DAILY SNAPSHOTS
  const { data: snap } = await s.from('daily_snapshots').select('*').eq('date', '2026-08-24');
  console.log('Daily Snapshot 2026-08-24:', snap);
}
diagnoseAll();
