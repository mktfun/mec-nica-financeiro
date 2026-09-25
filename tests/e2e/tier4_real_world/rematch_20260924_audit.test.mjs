// tests/e2e/tier4_real_world/rematch_20260924_audit.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { supabase, getDailyReconciliationSummary } from '../harness/client.mjs';

describe('Tier 4 — Real-World Application: Auditoria Pericial 24/09 & Saneamento de Fechamento (Spec 438)', () => {

  it('Rematch-Audit-01: Transferências intercompany MP (R$ 1.510,00 e R$ 1.000,00) não estão casadas com OS #619/#1894', async () => {
    const { data: txs, error } = await supabase
      .from('ofx_transactions')
      .select('id, amount, counterpart_name, matched_os_number')
      .in('amount', [1510.00, 1000.00])
      .in('matched_os_number', ['619', '1894']);

    assert.ok(!error, `Erro ao consultar ofx_transactions: ${error?.message}`);
    assert.strictEqual(txs?.length || 0, 0, `Nenhuma transação intercompany MP pode ter matched_os_number #619 ou #1894. Encontradas: ${JSON.stringify(txs)}`);
  });

  it('Rematch-Audit-02: Entrada de R$ 5.000,00 em HD Centro não está casada indevidamente com OS #2439', async () => {
    const { data: txs, error } = await supabase
      .from('ofx_transactions')
      .select('id, amount, counterpart_name, matched_os_number')
      .eq('amount', 5000.00)
      .eq('matched_os_number', '2439');

    assert.ok(!error, `Erro ao consultar ofx_transactions: ${error?.message}`);
    assert.strictEqual(txs?.length || 0, 0, `Entrada de R$ 5.000,00 não pode ter matched_os_number = '2439'. Encontradas: ${JSON.stringify(txs)}`);
  });

  it('Rematch-Audit-03: Jorge Beretta (st-03) possui dif_saidas = 0.00 (sem débito órfão falso de -850)', async () => {
    const res = await getDailyReconciliationSummary('2026-09-25', true);
    assert.ok(!res.error, `get_daily_reconciliation_summary falhou: ${res.error?.message}`);

    const stores = res.data.stores || [];
    const beretta = stores.find(s => s.store_id === 'st-03' || s.store_name?.includes('Jorge'));
    assert.ok(beretta, 'Loja Jorge Beretta (st-03) deve estar presente no resumo');

    assert.strictEqual(Number(beretta.dif_saidas), 0, `dif_saidas deve ser 0.00, obteve ${beretta.dif_saidas}`);
    assert.strictEqual(Number(beretta.dif_entradas), 0, `dif_entradas deve ser 0.00, obteve ${beretta.dif_entradas}`);
    assert.strictEqual(beretta.status, 'approved', `Status da loja deve ser approved, obteve ${beretta.status}`);
  });

  it('Rematch-Audit-04: Kennedy (st-04) sem dupla contagem de justificativa e com dif_entradas = 0.00 e dif_saidas = 0.00', async () => {
    const res = await getDailyReconciliationSummary('2026-09-25', true);
    assert.ok(!res.error, `get_daily_reconciliation_summary falhou: ${res.error?.message}`);

    const stores = res.data.stores || [];
    const kennedy = stores.find(s => s.store_id === 'st-04' || s.store_name?.includes('Kennedy'));
    assert.ok(kennedy, 'Loja Kennedy (st-04) deve estar presente no resumo');

    assert.strictEqual(Number(kennedy.dif_entradas), 0, `Kennedy dif_entradas deve ser 0.00, obteve ${kennedy.dif_entradas}`);
    assert.strictEqual(Number(kennedy.dif_saidas), 0, `Kennedy dif_saidas deve ser 0.00, obteve ${kennedy.dif_saidas}`);
    assert.strictEqual(kennedy.status, 'approved', `Status da loja deve ser approved, obteve ${kennedy.status}`);
  });

});
