const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert0109() {
  const snap0109 = {
    date: '2026-09-01',
    caixa_atual: 416454.73,
    faturamento: 167124.48,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    a_receber_manual: 8049.67,
    total_patio: 173839.28,
    saldo_bancario: 209610.78,
    saldo_negativo_itau: 0.00,
    contas_a_pagar: 43112.41,
    juros_rede: 2901.24,
    is_closed: true,
    closed_at: '2026-09-01T23:59:59Z',
    notes: 'Homologado via CONCILIAÇÃO 0109.xlsx',
    metadata: {
      caixa_anterior: 295344.02,
      caixa_atual: 416454.73,
      fluxo_caixa: 121110.71,
      saldo_bancos_positivo: 209610.78,
      saldo_negativo_itau: 0.00,
      dinheiro_mp: 24955.00,
      a_receber: 8049.67,
      total_patio: 173839.28,
      faturamento_oi_base: 54853.00,
      faturamento_ajustes: 112271.48,
      faturamento_periodo: 167124.48,
      valor_disp_contas: 46013.77,
      contas_base: 43112.41,
      subtotal_contas: 46013.65,
      diferenca_final: 0.12,
      status_geral: 'approved'
    }
  };

  const { error } = await supabase.from('daily_snapshots').upsert(snap0109, { onConflict: 'date' });
  if (error) console.error('Erro ao salvar 01/09:', error);
  else console.log('✅ Snapshot de 01/09/2026 gravado com sucesso em daily_snapshots!');
}

insert0109();
