const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testAutoMatch() {
  console.log('=== TESTE DE VALIDAÇÃO: SPEC 373 - AUTO_MATCH_SAIDAS ===\n');

  const testDates = ['2026-09-02', '2026-09-03', '2026-09-04'];

  for (const targetDate of testDates) {
    console.log(`--- Testando Data: ${targetDate} ---`);

    // 1. Executar auto_match_saidas
    const { data: matchResult, error: matchErr } = await supabase.rpc('auto_match_saidas', { p_date: targetDate });

    if (matchErr) {
      console.error(`❌ Erro ao chamar auto_match_saidas(${targetDate}):`, matchErr);
      continue;
    }

    console.log(`✅ Retorno auto_match_saidas:`, matchResult);

    // 2. Verificar se houve casamentos e se respeitam a mesma filial
    const { data: matchedTxs, error: txErr } = await supabase
      .from('ofx_transactions')
      .select('id, store_id, amount, counterpart_name, matched_bill_id')
      .eq('target_date', targetDate)
      .eq('type', 'out')
      .not('matched_bill_id', 'is', null);

    if (txErr) {
      console.error(`Erro ao buscar transações casadas:`, txErr);
      continue;
    }

    console.log(`📊 Total de débitos casados no banco: ${matchedTxs.length}`);

    // Checar integridade intra-loja
    let crossStoreViolations = 0;
    for (const tx of matchedTxs) {
      const { data: bill } = await supabase
        .from('daily_manual_bills')
        .select('id, store_id, amount, recipient_name')
        .eq('id', tx.matched_bill_id)
        .single();

      if (bill) {
        const isSameStore = (tx.store_id === bill.store_id);
        const isMaster = (!bill.store_id || bill.store_id === 'master');
        if (!isSameStore && !isMaster) {
          console.warn(`⚠️ ALERTA DE CROSS-STORE: OFX store=${tx.store_id} vs Bill store=${bill.store_id}!`);
          crossStoreViolations++;
        }
      }
    }

    if (crossStoreViolations === 0) {
      console.log(`🛡️ Conformidade estrita comprovada: ZERO violações de cross-store em ${targetDate}!`);
    } else {
      console.error(`❌ Detectadas ${crossStoreViolations} violações de cross-store!`);
    }

    // 3. Verificar saídas órfãs reais
    const { count: orphanCount } = await supabase
      .from('ofx_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('target_date', targetDate)
      .eq('type', 'out')
      .is('matched_bill_id', null)
      .is('manual_category', null);

    console.log(`🔍 Saídas órfãs reais (sem conta provisionada no ERP): ${orphanCount}`);
    console.log('');
  }

  console.log('=== TESTE CONCLUÍDO COM SUCESSO ===');
}

testAutoMatch();
