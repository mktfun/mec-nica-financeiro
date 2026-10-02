// tests/integration/helpers/disposable-finance-db.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Ambiente de banco de dados não configurado: SUPABASE_URL ou SUPABASE_KEY ausente no .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Trava de segurança para impedir contaminação de produção
 */
export function assertSafeTestScope(storeId, targetDate) {
  if (storeId && !storeId.startsWith('test-') && !storeId.startsWith('tst_')) {
    throw new Error(`[SAFETY_BLOCKER] storeId "${storeId}" inválido para testes descartáveis. Deve iniciar com 'test-' ou 'tst_'.`);
  }
  if (targetDate && !targetDate.startsWith('2099-')) {
    throw new Error(`[SAFETY_BLOCKER] targetDate "${targetDate}" inválido para testes descartáveis. Deve estar no ano 2099.`);
  }
}

/**
 * Cria ou garante uma loja de teste
 */
export async function ensureTestStore(storeId = 'test-store-disposable', storeName = 'Loja de Teste Descartável') {
  assertSafeTestScope(storeId, null);
  const { error } = await supabase.from('stores').upsert({
    id: storeId,
    name: storeName,
    active: true
  }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Falha ao garantir loja de teste no banco: ${error.message}`);
  }
}

/**
 * Limpa todos os dados gerados pela suíte de teste para a loja e data descartáveis
 */
export async function cleanTestData(storeId = 'test-store-disposable', targetDate = '2099-09-30') {
  assertSafeTestScope(storeId, targetDate);

  // 1. Limpar observações de OS
  await supabase.from('os_import_observations').delete().match({ store_id: storeId, target_date: targetDate });

  // 2. Limpar backups de pátio
  await supabase.from('patio_os_daily_backups').delete().match({ store_id: storeId, target_date: targetDate });

  // 3. Limpar vendas de cartão POS
  await supabase.from('pos_transactions').delete().match({ store_id: storeId, target_date: targetDate });

  // 4. Limpar conciliações de matches
  await supabase.from('conciliation_matches').delete().match({ store_id: storeId, target_date: targetDate });

  // 5. Limpar reconciliations
  await supabase.from('reconciliations').delete().match({ store_id: storeId, date: targetDate });

  // 6. Limpar pátio da loja de teste
  await supabase.from('patio_os').delete().match({ store_id: storeId });
}

/**
 * Semeia estado inicial em patio_os para a loja de teste
 */
export async function seedPatioOs(storeId, osList) {
  assertSafeTestScope(storeId, null);
  const rows = osList.map(item => ({
    store_id: storeId,
    os_number: String(item.os_number),
    client_name: item.client_name || 'CLIENTE TESTE',
    plate: item.plate || 'TST0001',
    total_value: item.total_value ?? 0,
    paid_value: item.paid_value ?? 0,
    credit_value: item.credit_value ?? 0,
    debit_value: item.debit_value ?? 0,
    status: item.status || 'em_aberto',
    raw_status: item.raw_status || 'Em Aberto',
    match_status: item.match_status || 'pending',
    last_payment_date: item.last_payment_date || null
  }));

  const { data, error } = await supabase.from('patio_os').insert(rows).select();
  if (error) {
    throw new Error(`Falha ao semear patio_os: ${error.message}`);
  }
  return data;
}

/**
 * Semeia transações POS (Rede) para a loja de teste
 */
export async function seedRedePos(storeId, targetDate, posList) {
  assertSafeTestScope(storeId, targetDate);
  const rows = posList.map(item => ({
    store_id: storeId,
    target_date: targetDate,
    gross_amount: item.gross_amount,
    net_amount: item.net_amount || (item.gross_amount * 0.95),
    fee_amount: item.fee_amount || (item.gross_amount * 0.05),
    occurred_at: item.occurred_at || `${targetDate}T12:00:00Z`,
    payment_method: item.payment_method || 'Cartão Crédito',
    machine_name: item.machine_name || 'Rede Maquininha',
    transaction_type: 'venda',
    settlement_status: 'a_compensar'
  }));

  const { data, error } = await supabase.from('pos_transactions').insert(rows).select();
  if (error) {
    throw new Error(`Falha ao semear pos_transactions: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real record_os_import_batch
 */
export async function callRecordOsImportBatch(storeId, targetDate, storeName, osBatch, receivables = []) {
  assertSafeTestScope(storeId, targetDate);
  const { data, error } = await supabase.rpc('record_os_import_batch', {
    p_store_id: storeId,
    p_target_date: targetDate,
    p_store_name: storeName,
    p_os_batch: osBatch,
    p_receivables: receivables
  });

  if (error) {
    throw new Error(`Erro na RPC record_os_import_batch: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real purge_daily_financial_data
 */
export async function callPurgeDailyFinancialData(targetDate) {
  assertSafeTestScope('test-placeholder', targetDate);
  const { data, error } = await supabase.rpc('purge_daily_financial_data', {
    p_date: targetDate
  });

  if (error) {
    throw new Error(`Erro na RPC purge_daily_financial_data: ${error.message}`);
  }
  return data;
}

/**
 * Semeia registro em conciliation_matches para testes de vínculo ativo ou órfão
 */
export async function seedConciliationMatch(storeId, targetDate, systemOsNumber, redeTransactionId, status = 'matched', divergenceAmount = 0) {
  assertSafeTestScope(storeId, targetDate);
  const { data, error } = await supabase.from('conciliation_matches').insert({
    store_id: storeId,
    target_date: targetDate,
    system_os_number: systemOsNumber,
    rede_transaction_id: redeTransactionId,
    status: status,
    divergence_amount: divergenceAmount
  }).select();

  if (error) {
    throw new Error(`Erro ao semear conciliation_matches: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real match_stage2_rede_os
 */
export async function callMatchStage2RedeOs(targetDate, storeId = null) {
  assertSafeTestScope(storeId || 'test-placeholder', targetDate);
  const { data, error } = await supabase.rpc('match_stage2_rede_os', {
    p_target_date: targetDate,
    p_store_id: storeId
  });

  if (error) {
    throw new Error(`Erro na RPC match_stage2_rede_os: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real get_rede_os_eligible_candidates
 */
export async function callGetRedeOsEligibleCandidates(posId, includeHistorical = false) {
  const { data, error } = await supabase.rpc('get_rede_os_eligible_candidates', {
    p_pos_id: posId,
    p_include_historical: includeHistorical
  });

  if (error) {
    throw new Error(`Erro na RPC get_rede_os_eligible_candidates: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real link_manual_rede_to_os
 */
export async function callLinkManualRedeToOs(posId, osNumber, storeId = null, amount = null) {
  assertSafeTestScope(storeId || 'test-placeholder', null);
  const { data, error } = await supabase.rpc('link_manual_rede_to_os', {
    p_pos_id: posId,
    p_os_number: String(osNumber),
    p_store_id: storeId,
    p_amount: amount
  });

  if (error) {
    throw new Error(`Erro na RPC link_manual_rede_to_os: ${error.message}`);
  }
  return data;
}

/**
 * Invoca a RPC real unlink_manual_os_match
 */
export async function callUnlinkManualOsMatch(transactionType, transactionId, osNumber = null) {
  const { data, error } = await supabase.rpc('unlink_manual_os_match', {
    p_transaction_type: transactionType,
    p_transaction_id: transactionId,
    p_os_number: osNumber ? String(osNumber) : null
  });

  if (error) {
    throw new Error(`Erro na RPC unlink_manual_os_match: ${error.message}`);
  }
  return data;
}

