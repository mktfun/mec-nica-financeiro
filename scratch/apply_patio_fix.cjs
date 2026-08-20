const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function applyPatioFix() {
  console.log('=== 1. FIXING GHOST/DUPLICATE OSs IN PATIO_OS ===');
  
  // 1. Finalize ghost OSs in Kennedy (st-04)
  const ghostNumbers = ['8733', '8736', '8721', '8737', '8732', '8738'];
  const { error: ghostErr } = await sb
    .from('patio_os')
    .update({ status: 'finalizada', updated_at: new Date().toISOString() })
    .eq('store_id', 'st-04')
    .in('os_number', ghostNumbers);
  if (ghostErr) console.error('Error finalizing ghost OSs in Kennedy:', ghostErr);
  else console.log('✅ Ghost OSs under Kennedy marked as finalizada:', ghostNumbers);

  // 2. Move OS 8659 and 8689 from Kennedy (st-04) to Rudge Ramos (st-07)
  const { error: moveErr } = await sb
    .from('patio_os')
    .update({ store_id: 'st-07', store_name: 'MPrudge', updated_at: new Date().toISOString() })
    .eq('store_id', 'st-04')
    .in('os_number', ['8659', '8689']);
  if (moveErr) console.error('Error moving 8659 and 8689 to Rudge Ramos:', moveErr);
  else console.log('✅ OS 8659 and 8689 moved to Rudge Ramos (st-07)');

  // 3. Update Jorge Beretta OS 1092 paid_value to 2264.89 (leaving remaining 144.57)
  const { error: os1092Err } = await sb
    .from('patio_os')
    .update({ 
      paid_value: 2264.89, 
      status: 'pago_parcial', 
      updated_at: new Date().toISOString() 
    })
    .eq('store_id', 'st-03')
    .eq('os_number', '1092');
  if (os1092Err) console.error('Error updating OS 1092:', os1092Err);
  else console.log('✅ Jorge Beretta OS 1092 paid_value updated to R$ 2.264,89 (PIX)');

  // 4. Finalize Dom Pedro OS 583
  const { error: os583Err } = await sb
    .from('patio_os')
    .update({ status: 'finalizada', updated_at: new Date().toISOString() })
    .eq('store_id', 'st-01')
    .eq('os_number', '583');
  if (os583Err) console.error('Error finalizing OS 583:', os583Err);
  else console.log('✅ Dom Pedro OS 583 marked as finalizada');

  // 5. Check new patio total
  const { data: patio } = await sb.from('patio_os').select('store_id, total_value, paid_value, status');
  let newTotal = 0;
  patio?.forEach(p => {
    const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes((p.status || '').toLowerCase());
    const val = Number(p.total_value || 0) - Number(p.paid_value || 0);
    if (!isClosed && val > 0) newTotal += val;
  });
  console.log(`\n🎉 New Patio Total (Na Loja OS): R$ ${newTotal.toFixed(2)} (Target: R$ 100.153,69)`);

  // 6. Update daily_snapshots for 2026-08-19
  console.log('\n=== 2. UPDATING DAILY SNAPSHOT FOR 19/08 ===');
  const snapshotPayload = {
    date: '2026-08-19',
    saldo_bancario: 152608.71,
    dinheiro_mp: 8466.00,
    a_receber_manual: 10694.50,
    total_recebiveis: 8466.00 + 10694.50,
    total_patio: Number(newTotal.toFixed(2)),
    caixa_atual: 271922.90,
    faturamento: 683288.89,
    faturamento_outros_valor: 0,
    faturamento_outros_desc: null,
    contas_a_pagar: 114568.15,
    provisao: 0,
    saldo_negativo_itau: 0,
    juros_rede: 3177.07,
    notes: 'Fechamento oficial conciliado 19/08',
    metadata: {
      faturamento_liquido: 73813.07,
      fluxo_caixa: -44292.95,
      valor_disp_contas: 118106.02,
      subtotal_contas: 118106.68,
      diferenca_final: -0.66
    },
    updated_at: new Date().toISOString()
  };

  const { error: snapErr } = await sb.from('daily_snapshots').upsert(snapshotPayload, { onConflict: 'date' });
  if (snapErr) console.error('Error saving snapshot:', snapErr);
  else console.log('✅ Daily snapshot 19/08 saved successfully with Diferença: -R$ 0,66!');
}

applyPatioFix().catch(console.error);
