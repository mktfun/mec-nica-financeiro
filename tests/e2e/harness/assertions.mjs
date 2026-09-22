// tests/e2e/harness/assertions.mjs
import assert from 'node:assert';
import {
  EXPECTED_SUMMARY_FIELDS,
  EXPECTED_STORE_FIELDS,
  EXPECTED_5_PILLARS,
  CANONICAL_CLOSURE_STATUSES,
  CANONICAL_MATCH_STATUSES,
  TOLERANCE_LIMIT,
  EXPECTED_STORE_COUNT
} from './config.mjs';

/**
 * Validates that the summary object contains all canonical fields from Interface Contract
 */
export function assertSummaryContract(summary) {
  assert.ok(summary, 'Summary object must not be null or undefined');
  assert.strictEqual(typeof summary, 'object', 'Summary must be an object');

  const missingFields = EXPECTED_SUMMARY_FIELDS.filter(field => !(field in summary));
  assert.strictEqual(
    missingFields.length,
    0,
    `Summary missing canonical fields: ${missingFields.join(', ')}`
  );
}

/**
 * Validates the 5 Macro Pillars exist and are numeric
 */
export function assert5PillarsPresent(summary) {
  assert.ok(summary, 'Summary must be provided');
  for (const pillar of EXPECTED_5_PILLARS) {
    assert.ok(pillar in summary, `Macro pillar '${pillar}' must be present in summary`);
    assert.strictEqual(
      typeof summary[pillar],
      'number',
      `Macro pillar '${pillar}' must be a numeric value, got ${typeof summary[pillar]}`
    );
  }
}

/**
 * Validates the stores breakdown array structure and dual split
 */
export function assertStoresArrayValid(stores) {
  assert.ok(Array.isArray(stores), 'stores must be an array');
  assert.strictEqual(
    stores.length,
    EXPECTED_STORE_COUNT,
    `Expected exactly ${EXPECTED_STORE_COUNT} stores in breakdown, got ${stores.length}`
  );

  stores.forEach((store, idx) => {
    assert.ok(store.store_id, `Store at index ${idx} missing store_id`);
    assert.ok(store.store_name, `Store at index ${idx} missing store_name`);

    const missingStoreFields = EXPECTED_STORE_FIELDS.filter(f => !(f in store));
    assert.strictEqual(
      missingStoreFields.length,
      0,
      `Store '${store.store_name || idx}' missing required fields: ${missingStoreFields.join(', ')}`
    );

    // Dual split check
    assert.strictEqual(typeof store.saldo_positivo_real, 'number', `saldo_positivo_real must be numeric in store ${store.store_name}`);
    assert.strictEqual(typeof store.saldo_devedor_real, 'number', `saldo_devedor_real must be numeric in store ${store.store_name}`);
    assert.ok(
      ['credor', 'devedor'].includes(store.status_banco),
      `status_banco must be 'credor' or 'devedor', got '${store.status_banco}' in store ${store.store_name}`
    );
    assert.ok(
      CANONICAL_CLOSURE_STATUSES.includes(store.status),
      `store.status must be 'approved' or 'divergence', got '${store.status}' in store ${store.store_name}`
    );
  });
}

/**
 * Validates that the store totals sum up to the global macro pillars with zero difference
 */
export function assertStoresSumMatchesGlobal(summary) {
  const stores = summary.stores || [];
  assert.ok(stores.length > 0, 'Stores array must not be empty');

  const sumSaldoOfx = stores.reduce((acc, s) => acc + (Number(s.saldo_banco_ofx) || 0), 0);
  const sumDinheiro = stores.reduce((acc, s) => acc + (Number(s.dinheiro_loja) || 0), 0);
  const sumRedeLiquido = stores.reduce((acc, s) => acc + (Number(s.rede_liquido) || 0), 0);
  const sumPatioOs = stores.reduce((acc, s) => acc + (Number(s.na_loja_os) || 0), 0);

  const diffOfx = Math.abs(sumSaldoOfx - (Number(summary.saldo_bancos_ofx) || 0));
  const diffDinheiro = Math.abs(sumDinheiro - (Number(summary.dinheiro_lojas) || 0));
  const diffRede = Math.abs(sumRedeLiquido - (Number(summary.cartoes_a_compensar) || 0));
  const diffPatio = Math.abs(sumPatioOs - (Number(summary.na_loja_os) || 0));

  assert.ok(
    diffOfx <= 0.05,
    `Sum of store OFX (${sumSaldoOfx.toFixed(2)}) does not match summary saldo_bancos_ofx (${Number(summary.saldo_bancos_ofx).toFixed(2)})`
  );
  assert.ok(
    diffDinheiro <= 0.05,
    `Sum of store cash (${sumDinheiro.toFixed(2)}) does not match summary dinheiro_lojas (${Number(summary.dinheiro_lojas).toFixed(2)})`
  );
  assert.ok(
    diffRede <= 0.05,
    `Sum of store Rede (${sumRedeLiquido.toFixed(2)}) does not match summary cartoes_a_compensar (${Number(summary.cartoes_a_compensar).toFixed(2)})`
  );
  assert.ok(
    diffPatio <= 0.05,
    `Sum of store Patio OS (${sumPatioOs.toFixed(2)}) does not match summary na_loja_os (${Number(summary.na_loja_os).toFixed(2)})`
  );
}

/**
 * Validates that status vocabulary is strictly 'approved' or 'divergence'
 */
export function assertStatusVocabulary(status) {
  assert.ok(
    CANONICAL_CLOSURE_STATUSES.includes(status),
    `Status vocabulary violation: expected strictly 'approved' or 'divergence', received '${status}'`
  );
}

/**
 * Validates that status matches the tolerance threshold
 */
export function assertToleranceCalculation(diferencaFinal, status) {
  const absDiff = Math.abs(Number(diferencaFinal) || 0);
  const expectedStatus = absDiff <= TOLERANCE_LIMIT ? 'approved' : 'divergence';
  assert.strictEqual(
    status,
    expectedStatus,
    `Tolerance rule mismatch: diferenca_final=${absDiff} should yield status='${expectedStatus}', got '${status}'`
  );
}

/**
 * Validates that match_status belongs to the canonical closed vocabulary
 */
export function assertMatchStatusVocabulary(status) {
  assert.ok(
    CANONICAL_MATCH_STATUSES.includes(status),
    `Match status vocabulary violation: expected one of [${CANONICAL_MATCH_STATUSES.join(', ')}], got '${status}'`
  );
}

/**
 * Validates idempotency across two execution results
 */
export function assertIdempotentResults(res1, res2) {
  assert.ok(res1 && res2, 'Both results must be non-null');
  assert.strictEqual(res1.status_geral, res2.status_geral, 'status_geral must be identical across runs');
  assert.strictEqual(res1.diferenca_final, res2.diferenca_final, 'diferenca_final must be identical across runs');
  assert.strictEqual(res1.caixa_atual, res2.caixa_atual, 'caixa_atual must be identical across runs');
  assert.strictEqual(res1.fluxo_caixa, res2.fluxo_caixa, 'fluxo_caixa must be identical across runs');
  assert.strictEqual(res1.faturamento_periodo, res2.faturamento_periodo, 'faturamento_periodo must be identical across runs');
}
