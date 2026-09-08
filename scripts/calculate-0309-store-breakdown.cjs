const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const targetDate = '2026-09-03';

async function getStoresBreakdown() {
  const { data: summary, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate, p_force_dynamic: true });
  if (error) {
    console.error('Erro na RPC:', error);
    return;
  }

  console.log('=== CONCILIAÇÃO POR LOJA — 03/09/2026 ===\n');

  const stores = summary.stores || [];
  stores.forEach(s => {
    const entradasTotal = Number(s.ofx_entradas_total || 0);
    const entradasConciliadas = Number(s.realizado_total || 0);
    const difEntradas = entradasTotal - entradasConciliadas;

    const saidasTotal = Number(s.ofx_saidas_total || 0);
    const contasTotal = Number(s.contas_loja_total || 0);
    const difSaidas = saidasTotal - contasTotal;

    const redeLiquido = Number(s.rede_liquido || 0);
    const redeEntrou = Number(s.ofx_maquininhas || 0);
    const difRede = redeLiquido - redeEntrou;

    console.log(`🏬 ${s.store_name} (ID: ${s.store_id})`);
    console.log(`   🏦 Saldo Bancário Final: R$ ${Number(s.saldo_banco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   🚗 Pátio OS (Em Aberto): R$ ${Number(s.na_loja_os || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   💳 Rede Vendas: R$ ${redeLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Compensou: R$ ${redeEntrou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Status: ${s.rede_status || 'N/A'}`);
    console.log(`   📥 ENTRADAS: Total OFX R$ ${entradasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs Conciliado R$ ${entradasConciliadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} -> Dif: R$ ${difEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   📤 SAÍDAS:   Total OFX R$ ${saidasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs Contas R$ ${contasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} -> Dif: R$ ${difSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   ⚖️ Diferença Total da Loja: R$ ${Number(s.diferenca_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} [${s.status}]`);
    console.log('--------------------------------------------------------------------------------------');
  });
}

getStoresBreakdown().catch(console.error);
