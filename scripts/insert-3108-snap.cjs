const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert3108() {
  const snap3108 = {
    date: '2026-08-31',
    caixa_atual: 295344.02,
    faturamento: 0,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    a_receber_manual: 8049.67,
    total_patio: 173839.28,
    saldo_bancario: 88500.07,
    saldo_negativo_itau: 0.00,
    contas_a_pagar: 0,
    juros_rede: 0,
    is_closed: true,
    closed_at: '2026-08-31T23:59:59Z',
    notes: 'Homologado via CONCILIAÇÃO 3108.xlsx',
    metadata: {
      caixa_anterior: 295344.02,
      caixa_atual: 295344.02,
      fluxo_caixa: 0,
      saldo_bancos_positivo: 88500.07,
      saldo_negativo_itau: 0.00,
      dinheiro_mp: 24955.00,
      a_receber: 8049.67,
      total_patio: 173839.28,
      status_geral: 'approved',
      diferenca_final: 0
    }
  };

  await supabase.from('daily_snapshots').upsert(snap3108, { onConflict: 'date' });
  console.log('✅ 31/08 gravado com sucesso!');
}

insert3108();
