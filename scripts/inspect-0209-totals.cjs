const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTotals() {
  // 1. OSs finalizadas em 02/09
  const { data: oss } = await supabase.from('patio_os').select('store_name, os_number, total_value, paid_value, status, payment_method, debit_value, credit_value, pix_transfer_value, cash_value');
  
  let totalOsBilled = 0;
  let totalOsPaid = 0;
  oss.forEach(o => {
    totalOsBilled += Number(o.total_value) || 0;
    totalOsPaid += Number(o.paid_value) || 0;
  });

  // 2. Entradas OFX de 02/09
  const { data: ofxIn } = await supabase.from('ofx_transactions').select('amount, counterpart_name').eq('target_date', '2026-09-02').eq('type', 'in');
  const totalOfxIn = (ofxIn || []).reduce((s, t) => s + t.amount, 0);

  // 3. Vendas Rede
  const { data: pos } = await supabase.from('pos_transactions').select('gross_amount, net_amount').eq('target_date', '2026-09-02');
  const totalRedeGross = (pos || []).reduce((s, t) => s + t.gross_amount, 0);
  const totalRedeNet = (pos || []).reduce((s, t) => s + t.net_amount, 0);

  // 4. Contas a Pagar
  const { data: bills } = await supabase.from('daily_manual_bills').select('amount').eq('date', '2026-09-02');
  const totalBills = (bills || []).reduce((s, b) => s + b.amount, 0);

  console.log('=== TOTAIS APURADOS EM 02/09/2026 ===');
  console.log(`- Total OSs Cadastradas: R$ ${totalOsBilled.toFixed(2)} (Pago: R$ ${totalOsPaid.toFixed(2)})`);
  console.log(`- Total Vendas Cartão Rede (Bruto): R$ ${totalRedeGross.toFixed(2)} | Líquido: R$ ${totalRedeNet.toFixed(2)}`);
  console.log(`- Total Entradas Bancárias OFX: R$ ${totalOfxIn.toFixed(2)}`);
  console.log(`- Total Contas a Pagar (Boletos/Pagamentos): R$ ${totalBills.toFixed(2)}`);
}

inspectTotals();
