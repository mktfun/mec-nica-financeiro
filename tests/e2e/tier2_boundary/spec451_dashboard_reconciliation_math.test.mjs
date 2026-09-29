import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testSpec451() {
  console.log('--- Testing Spec 451: Dashboard Reconciliation Math SSOT ---');
  const date = '2026-09-29';

  // 1. Fetch RPC raw
  const { data: raw, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', {
    p_date: date,
    p_force_dynamic: false
  });
  if (rpcErr) throw rpcErr;

  // 2. Fetch snapshot
  const { data: snapshotData, error: snapErr } = await supabase
    .from('daily_snapshots')
    .select('is_closed, faturamento, total_patio, caixa_atual, contas_a_pagar, saldo_negativo_itau, a_receber_manual, metadata')
    .eq('date', date)
    .maybeSingle();
  if (snapErr) throw snapErr;

  const snapMeta = (snapshotData?.metadata || {});
  const isSnapshotClosed = Boolean(snapshotData?.is_closed);

  // 3. Fetch manual bills
  const { data: billsData } = await supabase
    .from('daily_manual_bills')
    .select('amount, match_status, contabilizar_no_subtotal')
    .eq('date', date)
    .neq('match_status', 'ignored');
  const totalManualBills = billsData
    ? billsData.filter(b => b.contabilizar_no_subtotal !== false).reduce((a, b) => a + Number(b.amount || 0), 0)
    : 0;

  // Simulate useBackendConciliacao logic
  const snapContas = snapshotData?.contas_a_pagar !== undefined && snapshotData?.contas_a_pagar !== null
    ? Number(Number(snapshotData.contas_a_pagar).toFixed(2))
    : (raw.contas_base !== undefined && raw.contas_base !== null ? Number(Number(raw.contas_base).toFixed(2)) : Number(totalManualBills.toFixed(2)));
  const finalContasBase = Number((isSnapshotClosed ? snapContas : totalManualBills).toFixed(2));

  const dynamicSubtotal = Number((finalContasBase + Number(raw.juros_rede || 0)).toFixed(2));
  const snapSubtotal = snapMeta.subtotal_contas !== undefined && snapMeta.subtotal_contas !== null
    ? Number(snapMeta.subtotal_contas)
    : (raw.subtotal_contas !== undefined && raw.subtotal_contas !== null
        ? Number(raw.subtotal_contas)
        : dynamicSubtotal);
  const finalSubtotalContas = isSnapshotClosed ? snapSubtotal : dynamicSubtotal;

  const finalFatPeriodo = Number(
    snapMeta.is_marco_zero && snapMeta.faturamento_periodo !== undefined
      ? snapMeta.faturamento_periodo
      : (snapshotData?.faturamento !== undefined && snapshotData?.faturamento !== null && Number(snapshotData.faturamento) > 0
          ? Number(snapshotData.faturamento)
          : (raw.faturamento_periodo ?? 0))
  );

  const finalCaixaAtual = Number(snapshotData?.caixa_atual ?? raw.caixa_atual ?? 0);
  const finalCaixaAnterior = Number(snapMeta.caixa_anterior ?? raw.caixa_anterior ?? 0);
  const finalFluxoCaixa = Number((finalCaixaAtual - finalCaixaAnterior).toFixed(2));

  const dynamicValorDisp = Number((finalFatPeriodo - finalFluxoCaixa).toFixed(2));
  const snapValorDisp = snapMeta.valor_disp_contas !== undefined && snapMeta.valor_disp_contas !== null
    ? Number(snapMeta.valor_disp_contas)
    : (raw.valor_disp_contas !== undefined && raw.valor_disp_contas !== null
        ? Number(raw.valor_disp_contas)
        : dynamicValorDisp);
  const finalValorDisp = isSnapshotClosed ? snapValorDisp : dynamicValorDisp;

  const dynamicDiferenca = Number((finalValorDisp - finalSubtotalContas).toFixed(2));
  const snapDiferenca = snapMeta.diferenca_final !== undefined && snapMeta.diferenca_final !== null
    ? Number(snapMeta.diferenca_final)
    : (raw.diferenca_final !== undefined && raw.diferenca_final !== null
        ? Number(raw.diferenca_final)
        : dynamicDiferenca);

  const finalDiferenca = isSnapshotClosed
    ? snapDiferenca
    : (snapMeta.is_marco_zero && snapMeta.diferenca_final !== undefined
        ? Number(snapMeta.diferenca_final)
        : dynamicDiferenca);

  console.log('finalContasBase:', finalContasBase);
  console.log('finalSubtotalContas:', finalSubtotalContas);
  console.log('finalValorDisp:', finalValorDisp);
  console.log('finalDiferenca:', finalDiferenca);

  // Assertions
  if (finalContasBase !== 41771.21) {
    throw new Error(`finalContasBase expected 41771.21, got ${finalContasBase}`);
  }
  if (finalSubtotalContas !== 45145.92) {
    throw new Error(`finalSubtotalContas expected 45145.92, got ${finalSubtotalContas}`);
  }
  if (finalValorDisp !== 48805.95) {
    throw new Error(`finalValorDisp expected 48805.95, got ${finalValorDisp}`);
  }
  if (finalDiferenca !== 3660.03) {
    throw new Error(`finalDiferenca expected 3660.03, got ${finalDiferenca}`);
  }

  // Simulate ResumoDiaPanel: View Mode vs Edit Mode
  const viewModeDiferenca = finalDiferenca;
  const editModeValorDisp = finalValorDisp;
  const editModeSubtotal = finalSubtotalContas;
  const editModeDiferenca = Number((editModeValorDisp - editModeSubtotal).toFixed(2));

  console.log('viewModeDiferenca:', viewModeDiferenca);
  console.log('editModeDiferenca:', editModeDiferenca);

  if (viewModeDiferenca !== editModeDiferenca) {
    throw new Error(`View mode (${viewModeDiferenca}) does not match Edit mode (${editModeDiferenca})!`);
  }

  console.log('✅ ALL SPEC 451 ASSERTIONS PASSED!');
}

testSpec451().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
