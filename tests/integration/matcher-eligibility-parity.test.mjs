// tests/integration/matcher-eligibility-parity.test.mjs
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  supabase,
  ensureTestStore,
  cleanTestData,
  seedPatioOs,
  seedRedePos,
  seedConciliationMatch,
  callRecordOsImportBatch,
  callPurgeDailyFinancialData,
  callMatchStage2RedeOs,
  callGetRedeOsEligibleCandidates,
  callLinkManualRedeToOs,
  callUnlinkManualOsMatch
} from './helpers/disposable-finance-db.mjs';

describe('Spec 466 — Paridade de Elegibilidade Rede × OS e Desvinculação Consistente', () => {

  const storeIdA = 'test-store-parity-a';
  const storeIdB = 'test-store-parity-b';
  const targetDate = '2099-09-28';

  beforeEach(async () => {
    await ensureTestStore(storeIdA, 'Loja Paridade A');
    await ensureTestStore(storeIdB, 'Loja Paridade B');
    await cleanTestData(storeIdA, targetDate);
    await cleanTestData(storeIdB, targetDate);
  });

  it('Caso 1: Paridade Jabaquara OS 443 — OS quitada com match_status residual sem vínculo ativo realiza auto-match 1:1', async () => {
    // OS 443: total 5800, paga 5800 no crédito, com match_status residual = 'MATCHED'
    await seedPatioOs(storeIdA, [
      {
        os_number: '443',
        total_value: 5800.00,
        paid_value: 5800.00,
        credit_value: 5800.00,
        debit_value: 0.00,
        status: 'finalizada',
        match_status: 'MATCHED',
        last_payment_date: targetDate
      }
    ]);

    // Venda Rede de R$ 5.800 no crédito, sem vínculo (matched_os_number IS NULL)
    const [pos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 5800.00, payment_method: 'Cartão Crédito MASTERCARD' }
    ]);

    // 1. Consulta manual via get_rede_os_eligible_candidates deve retornar eligible
    const candidates = await callGetRedeOsEligibleCandidates(pos.id, false);
    const cand = candidates.find(c => String(c.os_number) === '443');
    assert.ok(cand, 'OS 443 deve constar na seleção manual');
    assert.strictEqual(cand.candidate_status, 'eligible', 'OS 443 deve ser classificada como eligible');

    // 2. Motor automático match_stage2_rede_os deve parear com sucesso
    const matchResult = await callMatchStage2RedeOs(targetDate, storeIdA);
    assert.strictEqual(matchResult.matched_pos_count, 1, 'Deve realizar exatamente 1 pareamento automático');

    // 3. Verifica persistência em pos_transactions e conciliation_matches
    const { data: updatedPos } = await supabase.from('pos_transactions').select('*').eq('id', pos.id).single();
    assert.strictEqual(updatedPos.matched_os_number, '443', 'POS deve estar vinculada à OS 443');

    const { data: concMatch } = await supabase.from('conciliation_matches').select('*').eq('rede_transaction_id', pos.id).single();
    assert.ok(concMatch, 'Deve existir registro em conciliation_matches');
    assert.strictEqual(concMatch.system_os_number, '443');
    assert.strictEqual(concMatch.status, 'vinculo_informativo', 'Deve registrar vínculo informativo para OS já quitada');
  });

  it('Caso 2: Isolamento por Loja — OS de mesmo número em lojas distintas não sofre bloqueio cruzado', async () => {
    // Ambas as lojas possuem OS 777
    await seedPatioOs(storeIdA, [
      { os_number: '777', total_value: 300.00, paid_value: 300.00, credit_value: 300.00, status: 'finalizada', last_payment_date: targetDate }
    ]);
    await seedPatioOs(storeIdB, [
      { os_number: '777', total_value: 300.00, paid_value: 300.00, credit_value: 300.00, status: 'finalizada', last_payment_date: targetDate }
    ]);

    // Loja A vincula OS 777
    const [posA] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 300.00, payment_method: 'Cartão Crédito' }
    ]);
    await callMatchStage2RedeOs(targetDate, storeIdA);

    // Loja B tem venda de 300.00
    const [posB] = await seedRedePos(storeIdB, targetDate, [
      { gross_amount: 300.00, payment_method: 'Cartão Crédito' }
    ]);

    // Motor roda para a Loja B (ou globalmente com p_store_id NULL)
    const matchResultB = await callMatchStage2RedeOs(targetDate, storeIdB);
    assert.strictEqual(matchResultB.matched_pos_count, 1, 'Loja B deve vincular sua OS 777 sem bloqueio da Loja A');

    const { data: updatedPosB } = await supabase.from('pos_transactions').select('*').eq('id', posB.id).single();
    assert.strictEqual(updatedPosB.matched_os_number, '777');
  });

  it('Caso 3: Preservação de Vínculos Válidos Existentes — POS já vinculada não é sobrescrita', async () => {
    await seedPatioOs(storeIdA, [
      { os_number: '101', total_value: 500.00, paid_value: 500.00, credit_value: 500.00, status: 'finalizada', last_payment_date: targetDate },
      { os_number: '102', total_value: 500.00, paid_value: 500.00, credit_value: 500.00, status: 'finalizada', last_payment_date: targetDate }
    ]);

    // Transação 1 já vinculada à OS 101
    const [pos1] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 500.00, payment_method: 'Cartão Crédito' }
    ]);
    await supabase.from('pos_transactions').update({ matched_os_number: '101' }).eq('id', pos1.id);
    await seedConciliationMatch(storeIdA, targetDate, '101', pos1.id, 'vinculo_informativo', 0);

    // Transação 2 pendente
    const [pos2] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 500.00, payment_method: 'Cartão Crédito' }
    ]);

    // Executa auto-match
    await callMatchStage2RedeOs(targetDate, storeIdA);

    // pos1 deve continuar com 101
    const { data: checkPos1 } = await supabase.from('pos_transactions').select('matched_os_number').eq('id', pos1.id).single();
    assert.strictEqual(checkPos1.matched_os_number, '101', 'Vínculo pré-existente de pos1 não pode ser alterado');

    // pos2 deve ter vinculado à OS 102 (pois 101 já estava consumida)
    const { data: checkPos2 } = await supabase.from('pos_transactions').select('matched_os_number').eq('id', pos2.id).single();
    assert.strictEqual(checkPos2.matched_os_number, '102', 'pos2 deve vincular à OS 102 disponível');
  });

  it('Caso 4: Vínculo Órfão em conciliation_matches — Registro apontando para POS inexistente não bloqueia a OS', async () => {
    await seedPatioOs(storeIdA, [
      { os_number: '555', total_value: 1200.00, paid_value: 1200.00, credit_value: 1200.00, status: 'finalizada', last_payment_date: targetDate }
    ]);

    // Transação dummy que não possui matched_os_number correspondente (referência desvinculada/órfã)
    const [dummyPos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 100.00, payment_method: 'Cartão Débito' }
    ]);

    // 1. Registro em conciliation_matches apontando para dummyPos cujo matched_os_number é NULL (não corresponde à OS 555)
    await seedConciliationMatch(storeIdA, targetDate, '555', dummyPos.id, 'matched', 0);

    // 2. Registro em conciliation_matches com rede_transaction_id NULL (transação POS deletada via ON DELETE SET NULL)
    await seedConciliationMatch(storeIdA, targetDate, '555', null, 'matched', 0);

    // Venda real pendente
    const [realPos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 1200.00, payment_method: 'Cartão Crédito' }
    ]);

    // Motor automático deve ignorar o registro órfão em conciliation_matches e parear com a venda real
    const matchResult = await callMatchStage2RedeOs(targetDate, storeIdA);
    assert.strictEqual(matchResult.matched_pos_count, 1, 'Deve ignorar conciliation_match órfão e parear a venda real');

    const { data: checkRealPos } = await supabase.from('pos_transactions').select('matched_os_number').eq('id', realPos.id).single();
    assert.strictEqual(checkRealPos.matched_os_number, '555');
  });

  it('Caso 5: Baixa Parcial e Desvinculação Repetida — Grava divergence_amount e restaura saldo exato com idempotência', async () => {
    // OS total 1000, paga 400 em aberto (saldo devedor 600)
    await seedPatioOs(storeIdA, [
      { os_number: '888', total_value: 1000.00, paid_value: 400.00, credit_value: 400.00, status: 'em_aberto' }
    ]);

    const [pos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 1000.00, payment_method: 'Cartão Crédito' }
    ]);

    // 1. Vinculação manual: baixa parcial (abate os 600 restantes até atingir 1000)
    await callLinkManualRedeToOs(pos.id, '888', storeIdA);

    const { data: linkedOs } = await supabase.from('patio_os').select('*').eq('store_id', storeIdA).eq('os_number', '888').single();
    assert.strictEqual(Number(linkedOs.paid_value), 1000.00);

    const { data: matchRecord } = await supabase.from('conciliation_matches').select('*').eq('rede_transaction_id', pos.id).single();
    assert.strictEqual(matchRecord.status, 'baixa_aplicada');
    assert.strictEqual(Number(matchRecord.divergence_amount), 600.00, 'divergence_amount deve registrar exatamente os 600 baixados');

    // 2. Primeira desvinculação: restaura os 600 revertendo paid_value para 400
    const unlink1 = await callUnlinkManualOsMatch('rede', pos.id, '888');
    assert.strictEqual(unlink1.success, true);

    const { data: unlinkedOs1 } = await supabase.from('patio_os').select('*').eq('store_id', storeIdA).eq('os_number', '888').single();
    assert.strictEqual(Number(unlinkedOs1.paid_value), 400.00, 'Deve restaurar paid_value para 400.00');
    assert.strictEqual(unlinkedOs1.match_status, 'pending', 'Deve transicionar match_status para pending');

    // 3. Segunda desvinculação (repetida/idempotente): no-op seguro
    const unlink2 = await callUnlinkManualOsMatch('rede', pos.id, '888');
    assert.strictEqual(unlink2.success, true);

    const { data: unlinkedOs2 } = await supabase.from('patio_os').select('*').eq('store_id', storeIdA).eq('os_number', '888').single();
    assert.strictEqual(Number(unlinkedOs2.paid_value), 400.00, 'Desvinculação repetida não pode alterar valores');
  });

  it('Caso 6: Desvinculação Informativa e Liberação Estrita de Modalidade — Mantém saldo do cliente e estorna só crédito', async () => {
    // Importação do dia que quita a OS com 2500 de crédito (produz delta_credit = 2500)
    await callRecordOsImportBatch(storeIdA, targetDate, 'Loja Paridade A', [
      { os_number: '999', total_value: 2500.00, paid_value: 2500.00, credit_value: 2500.00, status: 'finalizado' }
    ]);

    const [pos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 2500.00, payment_method: 'Cartão Crédito' }
    ]);

    // Vincula via matcher
    await callMatchStage2RedeOs(targetDate, storeIdA);

    // Confere consumo em os_import_observations
    const { data: obsBefore } = await supabase.from('os_import_observations').select('*').eq('store_id', storeIdA).eq('target_date', targetDate).eq('os_number', '999').single();
    assert.strictEqual(Number(obsBefore.consumed_credit), 2500.00);

    // Desvincula
    await callUnlinkManualOsMatch('rede', pos.id, '999');

    // Saldo da OS deve continuar 2500 (pagamento do cliente não é apagado)
    const { data: osAfter } = await supabase.from('patio_os').select('*').eq('store_id', storeIdA).eq('os_number', '999').single();
    assert.strictEqual(Number(osAfter.paid_value), 2500.00);
    assert.strictEqual(Number(osAfter.credit_value), 2500.00);
    assert.strictEqual(osAfter.match_status, 'pending');

    // Consumo de crédito deve ser estornado para 0, e débito continua 0
    const { data: obsAfter } = await supabase.from('os_import_observations').select('*').eq('store_id', storeIdA).eq('target_date', targetDate).eq('os_number', '999').single();
    assert.strictEqual(Number(obsAfter.consumed_credit), 0);
    assert.strictEqual(Number(obsAfter.consumed_debit), 0);
  });

  it('Caso 7: Detecção de Colisões Bidirecionais — 2 vendas POS disputando a mesma OS bloqueiam auto-match', async () => {
    await seedPatioOs(storeIdA, [
      { os_number: '301', total_value: 450.00, paid_value: 450.00, credit_value: 450.00, status: 'finalizada', last_payment_date: targetDate }
    ]);

    // 2 vendas POS no mesmo valor de 450.00
    await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 450.00, payment_method: 'Cartão Crédito' },
      { gross_amount: 450.00, payment_method: 'Cartão Crédito' }
    ]);

    const matchResult = await callMatchStage2RedeOs(targetDate, storeIdA);
    assert.strictEqual(matchResult.matched_pos_count, 0, 'Zero auto-match quando há colisão bidirecional');
    assert.strictEqual(matchResult.collision_count, 2, 'Ambas as vendas devem ser reportadas como colisão');
  });

  it('Caso 8: Ciclo Completo da Spec 465 Preservado — Importação -> Incremento R$ 2.327 -> Match -> Reset -> Reimportação', async () => {
    // Base prévia de R$ 400
    await seedPatioOs(storeIdA, [
      { os_number: '22622', total_value: 2727.00, paid_value: 400.00, credit_value: 400.00, status: 'em_aberto' }
    ]);

    // Importação atualiza para 2727 (incremento de 2327)
    await callRecordOsImportBatch(storeIdA, targetDate, 'Loja Paridade A', [
      { os_number: '22622', total_value: 2727.00, paid_value: 2727.00, credit_value: 2727.00, status: 'finalizado' }
    ]);

    const [pos] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 2327.00, payment_method: 'Cartão Crédito' }
    ]);

    // Matcher pareia com base no delta real de 2327
    const match1 = await callMatchStage2RedeOs(targetDate, storeIdA);
    assert.strictEqual(match1.matched_pos_count, 1);

    // Reset via purge_daily_financial_data
    await callPurgeDailyFinancialData(targetDate);

    // Pátio deve voltar para 400
    const { data: osReset } = await supabase.from('patio_os').select('*').eq('store_id', storeIdA).eq('os_number', '22622').single();
    assert.strictEqual(Number(osReset.paid_value), 400.00);

    // Reimportação reproduz delta de 2327
    await callRecordOsImportBatch(storeIdA, targetDate, 'Loja Paridade A', [
      { os_number: '22622', total_value: 2727.00, paid_value: 2727.00, credit_value: 2727.00, status: 'finalizado' }
    ]);

    // Semeia novamente o POS e roda o matcher
    const [posReimport] = await seedRedePos(storeIdA, targetDate, [
      { gross_amount: 2327.00, payment_method: 'Cartão Crédito' }
    ]);

    const match2 = await callMatchStage2RedeOs(targetDate, storeIdA);
    assert.strictEqual(match2.matched_pos_count, 1, 'Reimportação deve permitir parear novamente com 100% de sucesso');
  });

});

