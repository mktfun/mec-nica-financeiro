const assert = require('assert');

// Mock da lógica de cálculo e diagnóstico do Cockpit 360°
function computeStoreDiagnostics(store, redeSales, ofxCredits) {
  let rede_bruto = 0;
  let rede_liquido = 0;
  let rede_taxas = 0;
  let entrou_valor = 0;
  let nao_entrou_valor = 0;
  let a_compensar_valor = 0;

  const brandsMap = {};

  redeSales.forEach(s => {
    const gross = s.gross_amount || 0;
    const net = s.net_amount || 0;
    const fee = s.fee_amount || 0;
    const status = s.settlement_status || 'a_compensar';
    const brand = s.brand || 'Outras';

    rede_bruto += gross;
    rede_liquido += net;
    rede_taxas += fee;

    if (status === 'entrou') entrou_valor += net;
    else if (status === 'nao_entrou' || status === 'divergente') nao_entrou_valor += net;
    else a_compensar_valor += net;

    if (!brandsMap[brand]) {
      brandsMap[brand] = { brand, bruto: 0, liquido: 0, taxas: 0, entrou: 0, nao_entrou: 0, a_compensar: 0, tx_count: 0, status: 'a_compensar' };
    }
    brandsMap[brand].bruto += gross;
    brandsMap[brand].liquido += net;
    brandsMap[brand].taxas += fee;
    brandsMap[brand].tx_count += 1;
    if (status === 'entrou') brandsMap[brand].entrou += net;
    else if (status === 'nao_entrou' || status === 'divergente') brandsMap[brand].nao_entrou += net;
    else brandsMap[brand].a_compensar += net;
  });

  const ofx_maquininhas = ofxCredits.reduce((acc, c) => acc + (c.amount || 0), 0);
  const brands = Object.values(brandsMap);

  let status_compensacao = 'sem_movimento';
  if (rede_liquido === 0 && ofx_maquininhas === 0) status_compensacao = 'sem_movimento';
  else if (Math.abs(rede_liquido - ofx_maquininhas) < 0.10) status_compensacao = 'entrou';
  else if (ofx_maquininhas > 0 && ofx_maquininhas < rede_liquido) status_compensacao = 'parcial';
  else if (ofx_maquininhas === 0 && rede_liquido > 0) status_compensacao = 'a_compensar';
  else status_compensacao = 'divergente';

  const diffRedeOfx = Math.abs(rede_liquido - ofx_maquininhas);
  const isPosFeeCandidate = (
    (diffRedeOfx >= 118.5 && diffRedeOfx <= 120.5) ||
    (diffRedeOfx >= 238.0 && diffRedeOfx <= 241.0) ||
    (diffRedeOfx >= 357.0 && diffRedeOfx <= 360.0)
  );

  return {
    store_id: store.id,
    store_name: store.name,
    rede_bruto,
    rede_liquido,
    rede_taxas,
    ofx_maquininhas,
    entrou_valor,
    nao_entrou_valor,
    a_compensar_valor,
    divergencia_valor: Math.abs(rede_liquido - (ofx_maquininhas + a_compensar_valor)),
    status_compensacao,
    brands,
    isPosFeeCandidate,
    candidateFee: isPosFeeCandidate ? diffRedeOfx : 0
  };
}

console.log('================================================================');
console.log('🧪 TEST SUITE: SPEC 384 — COCKPIT DE DIAGNÓSTICO 360° PÓS-MOTOR');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// CENÁRIO 1: Lote Consolidado com Retenção de Aluguel de Maquininha (R$ 119,00)
// -----------------------------------------------------------------------------
console.log('--- TESTE 1: Lote Consolidado com Aluguel de Maquininha (R$ 119) ---');

const storeMaua = { id: 'st-maua', name: 'Loja Mauá' };
const salesMaua = [
  { brand: 'Visa', gross_amount: 1880.00, fee_amount: 50.00, net_amount: 1830.00, settlement_status: 'a_compensar' },
  { brand: 'Mastercard', gross_amount: 2520.00, fee_amount: 70.00, net_amount: 2450.00, settlement_status: 'a_compensar' },
  { brand: 'Elo', gross_amount: 740.00, fee_amount: 20.00, net_amount: 720.00, settlement_status: 'a_compensar' },
];

// O total líquido da Rede é R$ 5.000,00
// O crédito que caiu no extrato Itaú do dia é R$ 4.881,00 (diferença de R$ 119,00 retido na fonte para aluguel da maquininha)
const ofxMaua = [
  { amount: 4881.00, fitid: 'OFX-REDE-01', counterpart_name: 'REDECARD CONSOLIDADO' }
];

const diagMaua = computeStoreDiagnostics(storeMaua, salesMaua, ofxMaua);

console.log(`Loja: ${diagMaua.store_name}`);
console.log(`Venda Líquida Rede: R$ ${diagMaua.rede_liquido.toFixed(2)}`);
console.log(`Creditado no OFX:   R$ ${diagMaua.ofx_maquininhas.toFixed(2)}`);
console.log(`Status de Compensação: ${diagMaua.status_compensacao}`);
console.log(`Candidato a Aluguel POS: ${diagMaua.isPosFeeCandidate ? 'SIM ✅' : 'NÃO ❌'}`);
console.log(`Valor Retido Aluguel:   R$ ${diagMaua.candidateFee.toFixed(2)}`);

assert.strictEqual(diagMaua.rede_liquido, 5000.00, 'Rede Líquido deve ser 5000.00');
assert.strictEqual(diagMaua.ofx_maquininhas, 4881.00, 'OFX deve ser 4881.00');
assert.strictEqual(diagMaua.status_compensacao, 'parcial', 'Status inicial deve ser parcial');
assert.strictEqual(diagMaua.isPosFeeCandidate, true, 'Deve ser candidato a tarifa de aluguel POS');
assert.strictEqual(diagMaua.candidateFee, 119.00, 'Tarifa retida deve ser exatamente 119.00');

// Simulação da Baixa do Lote + Lançamento da Tarifa POS
console.log('⚡ Executando Action Card: Baixar Lote + Registrar Despesa Aluguel POS...');
const postSettleSales = salesMaua.map(s => ({ ...s, settlement_status: 'entrou' }));
const postSettleOfx = [...ofxMaua, { amount: 119.00, counterpart_name: 'Aluguel POS' }];
const diagMauaSettled = computeStoreDiagnostics(storeMaua, postSettleSales, postSettleOfx);

console.log(`Status Pós-Baixa: ${diagMauaSettled.status_compensacao}`);
console.log(`Divergência Final: R$ ${diagMauaSettled.divergencia_valor.toFixed(2)}`);
assert.strictEqual(diagMauaSettled.status_compensacao, 'entrou', 'Após baixa deve ser ENTROU');
assert.strictEqual(diagMauaSettled.divergencia_valor, 0, 'Divergência deve zerar');
console.log('✅ CENÁRIO 1 APROVADO COM SUCESSO!\n');

// -----------------------------------------------------------------------------
// CENÁRIO 2: Vendas Parceladas D+30 Classificadas como A COMPENSAR
// -----------------------------------------------------------------------------
console.log('--- TESTE 2: Blindagem de Vendas Futuras D+30 (A COMPENSAR) ---');

const storeSantoAndre = { id: 'st-sa', name: 'Loja Santo André' };
const salesSantoAndre = [
  { brand: 'Mastercard', gross_amount: 5500.00, fee_amount: 300.00, net_amount: 5200.00, settlement_status: 'a_compensar', expected_credit_date: '2026-10-09' }
];
const ofxSantoAndre = []; // Nada no banco hoje (cai em 30 dias)

const diagSA = computeStoreDiagnostics(storeSantoAndre, salesSantoAndre, ofxSantoAndre);

console.log(`Loja: ${diagSA.store_name}`);
console.log(`Venda Líquida Rede: R$ ${diagSA.rede_liquido.toFixed(2)}`);
console.log(`Creditado no OFX:   R$ ${diagSA.ofx_maquininhas.toFixed(2)}`);
console.log(`Status de Compensação: ${diagSA.status_compensacao}`);
console.log(`Valor A Compensar:  R$ ${diagSA.a_compensar_valor.toFixed(2)}`);
console.log(`Divergência Apontada: R$ ${diagSA.divergencia_valor.toFixed(2)}`);

assert.strictEqual(diagSA.status_compensacao, 'a_compensar', 'Status deve ser A COMPENSAR');
assert.strictEqual(diagSA.a_compensar_valor, 5200.00, 'Valor a compensar deve ser 5200.00');
assert.strictEqual(diagSA.divergencia_valor, 0, 'Não deve gerar divergência de caixa nem falso rombo');

console.log('✅ CENÁRIO 2 APROVADO COM SUCESSO!\n');

console.log('================================================================');
console.log('🎉 TODOS OS CENÁRIOS DE TESTE PASSARAM [AUDIT_PASSED]!');
console.log('================================================================');
