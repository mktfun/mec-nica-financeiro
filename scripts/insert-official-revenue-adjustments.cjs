const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const adjustments = [
  // 03/09/2026: Total R$ 11.100,00
  {
    date: '2026-09-03',
    store_id: 'st-02',
    title: 'Aporte Jabaquara',
    amount: 5100.00,
    type: 'aporte',
    description: 'Aporte financeiro Jabaquara identificado na planilha oficial'
  },
  {
    date: '2026-09-03',
    store_id: null,
    title: 'Custo Master',
    amount: 6000.00,
    type: 'outros',
    description: 'Custo Master identificado na célula G17 da planilha oficial'
  },

  // 04/09/2026: Total R$ 5.020,00
  {
    date: '2026-09-04',
    store_id: 'st-02',
    title: 'Aporte Jabaquara',
    amount: 4900.00,
    type: 'aporte',
    description: 'PIX Luís Henrique R$ 2.000 + RS4 R$ 2.900'
  },
  {
    date: '2026-09-04',
    store_id: 'st-07',
    title: 'Sucata CAP',
    amount: 50.00,
    type: 'outros',
    description: 'PIX Roberto Carlos Perez R$ 50,00'
  },
  {
    date: '2026-09-04',
    store_id: 'st-01',
    title: 'Sucata MP',
    amount: 70.00,
    type: 'outros',
    description: 'PIX Roberto Carlos Perez R$ 70,00'
  }
];

async function insertAdjustments() {
  console.log('📌 Inserindo ajustes de faturamento canônicos para 03/09 e 04/09...');
  
  await supabase.from('daily_revenue_adjustments').delete().in('date', ['2026-09-03', '2026-09-04']);
  
  const { data, error } = await supabase.from('daily_revenue_adjustments').insert(adjustments).select();
  if (error) {
    console.error('❌ Erro ao inserir ajustes:', error);
  } else {
    console.log(`✅ ${data.length} ajustes inseridos com sucesso!`);
    console.log(data.map(d => `${d.date} | ${d.title} | R$ ${d.amount}`));
  }
}

insertAdjustments().catch(console.error);
