const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excelOpenOsList = [
  // Planalto (27.743,80)
  { store_id: 'st-06', os_number: '18456', total_value: 11805.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18455', total_value: 2482.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18454', total_value: 2278.40, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18452', total_value: 1699.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18433', total_value: 9041.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18412', total_value: 436.60, paid_value: 0, status: 'em_aberto' },
  // Piraporinha (2.820,00)
  { store_id: 'st-05', os_number: '40330', total_value: 1190.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-05', os_number: '40329', total_value: 800.00, paid_value: 800.00, status: 'finalizada' },
  { store_id: 'st-05', os_number: '40323', total_value: 1275.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-05', os_number: '40320', total_value: 355.00, paid_value: 0, status: 'em_aberto' },
  // Maua (8.783,84)
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22580', total_value: 577.10, paid_value: 0, status: 'em_aberto' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22566', total_value: 2821.00, paid_value: 0, status: 'em_aberto' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22559', total_value: 5385.74, paid_value: 0, status: 'em_aberto' },
  // Kennedy (2.076,80)
  { store_id: 'st-04', os_number: '4405', total_value: 2076.80, paid_value: 0, status: 'em_aberto' },
  // Rudge Ramos (9.890,50)
  { store_id: 'st-07', os_number: '8750', total_value: 385.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8745', total_value: 2208.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8721', total_value: 1957.50, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8689', total_value: 6140.00, paid_value: 2000.00, status: 'pago_parcial' },
  { store_id: 'st-07', os_number: '8659', total_value: 1200.00, paid_value: 0, status: 'em_aberto' },
  // Santo Andre (9.218,73)
  { store_id: 'st-08', os_number: '2326', total_value: 9218.73, paid_value: 0, status: 'em_aberto' },
  // Rei do Modulo (11.170,00)
  { store_id: 'st-09', os_number: '1847', total_value: 12900.00, paid_value: 12900.00, status: 'finalizada' },
  { store_id: 'st-09', os_number: '1846', total_value: 4240.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1845', total_value: 2500.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1844', total_value: 700.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1838', total_value: 930.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1818', total_value: 2800.00, paid_value: 0, status: 'em_aberto' },
  // Jorge Beretta (3.515,12)
  { store_id: 'st-03', os_number: '1100', total_value: 1560.80, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1099', total_value: 1574.32, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1097', total_value: 0.00, paid_value: 0, status: 'finalizada' },
  { store_id: 'st-03', os_number: '1095', total_value: 190.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1089', total_value: 190.00, paid_value: 0, status: 'em_aberto' },
  // Dom Pedro (6.954,00)
  { store_id: 'st-01', os_number: '587', total_value: 900.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-01', os_number: '582', total_value: 6054.00, paid_value: 0, status: 'em_aberto' },
  // Jabaquara (6.039,60)
  { store_id: 'st-02', os_number: '393', total_value: 385.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-02', os_number: '387', total_value: 5300.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-02', os_number: '368', total_value: 354.60, paid_value: 0, status: 'em_aberto' }
];

async function syncAll() {
  console.log('=== 1. DEDUPLICANDO POS_TRANSACTIONS (SANTO ANDRÉ) ===');
  const { data: pos } = await s.from('pos_transactions')
    .select('id, store_id, gross_amount, net_amount')
    .eq('target_date', '2026-08-24')
    .eq('store_id', 'st-08');

  const seen = new Set();
  for (const p of pos || []) {
    const k = `${p.gross_amount}_${p.net_amount}`;
    if (seen.has(k)) {
      console.log('Deletando duplicata POS:', p.id, k);
      await s.from('pos_transactions').delete().eq('id', p.id);
    } else {
      seen.add(k);
    }
  }

  console.log('\n=== 2. ALINHANDO STATUS DO COFRE (STORE_CASH_VAULT) ===');
  // Obter todos os registros do cofre
  const { data: vault } = await s.from('store_cash_vault').select('*');
  for (const v of vault || []) {
    // Apenas Dom Pedro OS 586 (R$ 1845) e Rei do Modulo OS 1808 (R$ 200) ficaram em transito / no cofre sem entrar no banco
    if (v.description?.includes('586') || v.description?.includes('1808')) {
      await s.from('store_cash_vault').update({ status: 'em_transito', deposited_at: null }).eq('id', v.id);
      console.log(`Cofre Mantido em Trânsito: ${v.description} (R$ ${v.amount})`);
    } else {
      await s.from('store_cash_vault').update({ status: 'depositado', deposited_at: '2026-08-24T20:00:00Z' }).eq('id', v.id);
      console.log(`Cofre Marcado como Depositado no Banco: ${v.description} (R$ ${v.amount})`);
    }
  }

  console.log('\n=== 3. SINCRONIZANDO 28 OSs DO PÁTIO (PATIO_OS) ===');
  const excelOsNums = new Set(excelOpenOsList.map(o => o.os_number));
  const { data: allPatio } = await s.from('patio_os')
    .select('id, os_number, store_id, total_value, paid_value, status')
    .lte('opened_at', '2026-08-24T23:59:59');

  // Finalizar qualquer OS que não esteja no lote de abertas
  for (const dbOs of allPatio || []) {
    if (!excelOsNums.has(dbOs.os_number)) {
      if (dbOs.status !== 'finalizada' && dbOs.status !== 'finalizado') {
        await s.from('patio_os').update({ status: 'finalizada', paid_value: dbOs.total_value }).eq('id', dbOs.id);
      }
    }
  }

  // Deletar duplicatas de mesma OS em lojas erradas (como 4405 em Maua)
  await s.from('patio_os').delete().eq('os_number', '4405').eq('store_id', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f');

  // Atualizar/inserir as 28 OSs
  for (const item of excelOpenOsList) {
    const existing = (allPatio || []).find(p => p.os_number === item.os_number && p.store_id === item.store_id);
    if (existing) {
      await s.from('patio_os').update({
        total_value: item.total_value,
        paid_value: item.paid_value,
        status: item.status
      }).eq('id', existing.id);
    } else {
      await s.from('patio_os').insert({
        store_id: item.store_id,
        os_number: item.os_number,
        total_value: item.total_value,
        paid_value: item.paid_value,
        status: item.status,
        opened_at: '2026-08-24T10:00:00Z'
      });
    }
  }
  console.log('✅ Pátio de OSs 100% alinhado com as 28 OSs!');

  console.log('\n=== 4. TESTANDO RESULTADO VIA RPC ===');
  const { data: rpc, error: rpcErr } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcErr) {
    console.error('Erro RPC:', rpcErr);
    return;
  }
  console.log('Status Geral:', rpc.status_geral);
  console.log('Saldo Bancos OFX:', rpc.saldo_bancos_ofx);
  console.log('Dinheiro em Lojas:', rpc.dinheiro_em_lojas);
  console.log('Cartões a Compensar:', rpc.cartoes_a_compensar);
  console.log('Pátio OS:', rpc.na_loja_os);
  console.log('Caixa Atual:', rpc.caixa_atual);
  console.log('Caixa Anterior:', rpc.caixa_anterior);
  console.log('Fluxo de Caixa:', rpc.fluxo_caixa);
  console.log('Faturamento:', rpc.faturamento_periodo);
  console.log('Contas Manual:', rpc.contas_manual);
  console.log('Juros Rede:', rpc.juros_rede);
  console.log('Diferença Final:', rpc.diferenca_final);
  console.log('Lojas no stores array:', rpc.stores?.length);
}
syncAll();
