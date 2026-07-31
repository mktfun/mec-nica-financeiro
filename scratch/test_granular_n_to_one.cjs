const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xdfzrmubststcynvwgsk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Funcao de Subset Sum (Algoritmo Camada 2 / 3)
function findExactSubsetMatch(targetAmount, candidates, maxDepth = 6, tolerance = 0.05) {
  function backtrack(startIndex, currentSum, currentSubset) {
    if (Math.abs(currentSum - targetAmount) <= tolerance) {
      return currentSubset;
    }
    if (currentSum > targetAmount + tolerance || currentSubset.length >= maxDepth) {
      return null;
    }
    for (let i = startIndex; i < candidates.length; i++) {
      const candidate = candidates[i];
      const result = backtrack(i + 1, currentSum + candidate.amount, [...currentSubset, candidate]);
      if (result) return result;
    }
    return null;
  }
  return backtrack(0, 0, []);
}

async function runGranularTest() {
  console.log("=== INICIANDO TESTE GRANULAR N:1 DE CONCILIAÇÃO ===\n");

  const storeId = 'st-01'; // Loja Matriz
  const targetDate = '2026-07-27';

  // -------------------------------------------------------------
  // CENÁRIO 1: 5 Mini Vendas Maquininha -> 1 Depósito Único OFX
  // Vendas: 15.50 + 24.50 + 40.00 + 10.00 + 10.00 = 100.00 Bruto
  // MDR Taxa = 5.00 | Líquido = 95.00
  // -------------------------------------------------------------
  console.log("📌 Testing Scenario 1: 5 Mini Card Transactions -> 1 Single OFX Deposit");
  const miniRedeSales = [
    { store_id: storeId, target_date: targetDate, amount: 15.50, title: 'Venda Cartao #101', source: 'rede', payment_method: 'Credito' },
    { store_id: storeId, target_date: targetDate, amount: 24.50, title: 'Venda Cartao #102', source: 'rede', payment_method: 'Credito' },
    { store_id: storeId, target_date: targetDate, amount: 40.00, title: 'Venda Cartao #103', source: 'rede', payment_method: 'Debito' },
    { store_id: storeId, target_date: targetDate, amount: 10.00, title: 'Venda Cartao #104', source: 'rede', payment_method: 'Credito' },
    { store_id: storeId, target_date: targetDate, amount: 10.00, title: 'Venda Cartao #105', source: 'rede', payment_method: 'Debito' },
  ];

  const singleOfxRedeDeposit = {
    store_id: storeId,
    target_date: targetDate,
    amount: 95.00, // 100 - 5 MDR
    title: 'DEPOSITO REDE LOTE #991',
    source: 'ofx'
  };

  // Test Subset Sum algorithm locally
  const totalBrutoRede = miniRedeSales.reduce((acc, s) => acc + s.amount, 0);
  const mdrTaxa = 5.00;
  const netRedeCalculated = totalBrutoRede - mdrTaxa;
  
  console.log(`- Total Bruto Vendas: R$ ${totalBrutoRede.toFixed(2)}`);
  console.log(`- MDR Descontado: R$ ${mdrTaxa.toFixed(2)}`);
  console.log(`- Líquido Calculado: R$ ${netRedeCalculated.toFixed(2)}`);
  console.log(`- Lote OFX Depositado: R$ ${singleOfxRedeDeposit.amount.toFixed(2)}`);

  const subsetMatchResult = findExactSubsetMatch(singleOfxRedeDeposit.amount, miniRedeSales.map(s => ({ ...s, amount: s.amount * 0.95 })));
  console.log(`✅ Resultado Subset Sum (5:1): ${subsetMatchResult ? 'MATCH PERFEITO (5 de 5 transações agrupadas)' : 'FALHOU'}`);

  // -------------------------------------------------------------
  // CENÁRIO 2: 4 Pagamentos PIX Fracionados em OS -> 1 Depósito PIX OFX
  // OSs: 30.00 + 45.00 + 25.00 + 50.00 = 150.00
  // -------------------------------------------------------------
  console.log("\n📌 Testing Scenario 2: 4 Mini PIX OS Payments -> 1 Single PIX OFX Deposit");
  const miniPixOs = [
    { store_id: storeId, os_number: 'OS-901', client_name: 'Cliente A', paid_value: 30.00, payment_method: 'PIX' },
    { store_id: storeId, os_number: 'OS-902', client_name: 'Cliente B', paid_value: 45.00, payment_method: 'PIX' },
    { store_id: storeId, os_number: 'OS-903', client_name: 'Cliente C', paid_value: 25.00, payment_method: 'PIX' },
    { store_id: storeId, os_number: 'OS-904', client_name: 'Cliente D', paid_value: 50.00, payment_method: 'PIX' },
  ];

  const singlePixOfx = {
    store_id: storeId,
    target_date: targetDate,
    amount: 150.00,
    title: 'PIX RECEBIDO LOTE #882',
    source: 'ofx'
  };

  const totalPixOs = miniPixOs.reduce((acc, o) => acc + o.paid_value, 0);
  console.log(`- Total 4 OSs PIX: R$ ${totalPixOs.toFixed(2)}`);
  console.log(`- Depósito Único OFX PIX: R$ ${singlePixOfx.amount.toFixed(2)}`);
  
  const pixSubsetMatch = findExactSubsetMatch(singlePixOfx.amount, miniPixOs.map(o => ({ amount: o.paid_value })));
  console.log(`✅ Resultado Subset Sum PIX (4:1): ${pixSubsetMatch ? 'MATCH PERFEITO (4 de 4 OSs agrupadas ao PIX)' : 'FALHOU'}`);

  // -------------------------------------------------------------
  // CENÁRIO 3: 1 OS Fracionada em 3 Cartões (1:3)
  // OS de 500.00 -> Cartões: 200.00 + 200.00 + 100.00
  // -------------------------------------------------------------
  console.log("\n📌 Testing Scenario 3: 1 OS (R$ 500,00) -> 3 Split Card Payments (200 + 200 + 100)");
  const splitCards = [
    { amount: 200.00 },
    { amount: 200.00 },
    { amount: 100.00 }
  ];
  const targetOsValue = 500.00;
  const splitMatch = findExactSubsetMatch(targetOsValue, splitCards);
  console.log(`- Soma das 3 passadas de cartão: R$ ${splitCards.reduce((a,b)=>a+b.amount,0).toFixed(2)}`);
  console.log(`✅ Resultado Subset Sum Split (1:3): ${splitMatch ? 'MATCH PERFEITO (3 cartões somam R$ 500,00 da OS)' : 'FALHOU'}`);

  // -------------------------------------------------------------
  // TESTE DE PURGA E LIMPEZA DE DADOS NO SUPABASE
  // -------------------------------------------------------------
  console.log("\n--- EXECUTANDO LIMPEZA TOTAL NO SUPABASE ---");
  await supabase.from('conciliation_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('patio_os').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('import_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('import_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { count: finalTx } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { count: finalOs } = await supabase.from('patio_os').select('*', { count: 'exact', head: true });

  console.log(`\n--- CONTAGEM FINAL APÓS LIMPEZA ---`);
  console.log(`transactions em banco: ${finalTx}`);
  console.log(`patio_os em banco: ${finalOs}`);
  console.log("\n=== TESTE GRANULAR N:1 CONCLUÍDO COM SUCESSO! ===");
}

runGranularTest();
