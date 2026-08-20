const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function testSave() {
  const payload = {
    date: '2026-08-19',
    saldo_bancario: 152608.71,
    dinheiro_mp: 8466.00,
    a_receber_manual: 10694.50,
    total_recebiveis: 8466.00 + 10694.50,
    total_patio: 100153.69,
    caixa_atual: 271922.90,
    faturamento: 683288.89,
    faturamento_outros_valor: 0,
    faturamento_outros_desc: null,
    contas_a_pagar: 114568.15,
    provisao: 0,
    saldo_negativo_itau: 0,
    juros_rede: 3177.07,
    notes: 'Fechamento diário salvo via painel de conciliação.',
    metadata: {
      faturamento_liquido: 73813.07,
      fluxo_caixa: -44292.95,
      valor_disp_contas: 118106.02,
      subtotal_contas: 118106.68,
      diferenca_final: -0.66
    },
    updated_at: new Date().toISOString()
  };

  const { data, error } = await sb.from('daily_snapshots').upsert(payload, { onConflict: 'date' });
  if (error) console.error('Save error:', error);
  else console.log('Saved successfully!');
}

testSave();
