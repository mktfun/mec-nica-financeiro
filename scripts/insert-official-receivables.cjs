const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = '2026-09-02';

// 1. Recebíveis Operacionais Oficiais da Sheet RECEBIVEIS (Total: R$ 8.049,67)
const OPERATIONAL_RECEIVABLES = [
  {
    store_id: 'st-06',
    store_name: 'Planalto - BRASICAR',
    description: 'PGTO EM CONTA - GESTAUTO',
    value: 1120.00,
    date: targetDate,
    due_date: '2026-09-15',
    type: 'Transferência',
    status: 'pendente'
  },
  {
    store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    store_name: 'Maua - MHE',
    os_number: '22530',
    installment: '2/3',
    description: 'BOLETO ORION OS 22530 2/3',
    value: 3464.83,
    date: targetDate,
    due_date: '2026-09-22',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    store_name: 'Maua - MHE',
    os_number: '22531',
    installment: '3/3',
    description: 'BOLETO ORION OS 22531 3/3',
    value: 3464.84,
    date: targetDate,
    due_date: '2026-10-22',
    type: 'Boleto',
    status: 'pendente'
  }
];

// 2. Boletos da Sheet CARTORIO (Rei do Módulo - Cobrança/Cartório)
const CARTORIO_BOLETOS = [
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '902',
    installment: '1/1',
    description: 'BOLETO OS 902 JOAO PAULO 1/1 (Cartório)',
    value: 700.00,
    date: targetDate,
    due_date: '2025-02-17',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '379',
    description: 'BOLETO OS 379 ROBSON (Cartório)',
    value: 5212.45,
    date: targetDate,
    due_date: '2025-02-25',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '387',
    description: 'BOLETO OS 387 ADILSON (Cartório)',
    value: 2160.00,
    date: targetDate,
    due_date: '2025-03-04',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '553',
    description: 'BOLETO OS 553 ROBSON TADEU (Cartório)',
    value: 2200.00,
    date: targetDate,
    due_date: '2025-06-20',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '626',
    description: 'BOLETO OS 626 CARLOS EDUARDO (Cartório)',
    value: 2150.00,
    date: targetDate,
    due_date: '2025-08-09',
    type: 'Boleto',
    status: 'recebido',
    received_at: `${targetDate} 12:00:00+00`,
    paid_value: 2150.00
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '52',
    description: 'BOLETO OS 52 ADRIANO ALVES (Cartório)',
    value: 480.00,
    date: targetDate,
    due_date: '2025-09-16',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '675',
    description: 'BOLETO OS 675 DECIO PEREIRA (Cartório)',
    value: 480.00,
    date: targetDate,
    due_date: '2025-09-12',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '22183',
    description: 'BOLETO OS 22183 (Cartório)',
    value: 3730.70,
    date: targetDate,
    due_date: '2026-01-18',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '22323',
    description: 'BOLETO OS 22323 (Cartório)',
    value: 2192.50,
    date: targetDate,
    due_date: '2026-03-14',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '22346',
    description: 'BOLETO OS 22346 (Cartório)',
    value: 385.00,
    date: targetDate,
    due_date: '2026-03-27',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '40055',
    description: 'BOLETO OS 40055 (Cartório)',
    value: 385.00,
    date: targetDate,
    due_date: '2026-03-24',
    type: 'Boleto',
    status: 'pendente'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '81',
    description: 'BOLETO OS 81 (Cartório)',
    value: 1860.00,
    date: targetDate,
    due_date: '2026-03-26',
    type: 'Boleto',
    status: 'pendente'
  }
];

async function insertAllReceivables() {
  console.log('================================================================');
  console.log('📑 INSERINDO RECEBÍVEIS E BOLETOS DA PLANILHA OFICIAL (02/09/2026)');
  console.log('================================================================\n');

  const allItems = [...OPERATIONAL_RECEIVABLES, ...CARTORIO_BOLETOS];

  // 1. Limpar itens duplicados ou pré-existentes com a mesma descrição e data para evitar colisão na constraint
  console.log('1. Higienizando tabela receivables para inserção limpa...');
  for (const item of allItems) {
    await supabase
      .from('receivables')
      .delete()
      .eq('store_id', item.store_id)
      .eq('due_date', item.due_date)
      .eq('value', item.value);
  }

  // 2. Inserir todos os itens
  console.log('2. Inserindo itens oficiais...');
  let insertedCount = 0;
  for (const item of allItems) {
    const { error } = await supabase.from('receivables').insert(item);
    if (error) {
      console.error(`   ❌ Erro ao inserir "${item.description}":`, error.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`\n✅ ${insertedCount} de ${allItems.length} recebíveis/boletos inseridos com sucesso!`);

  // 3. Resumo por Loja e Tipo
  const { data: recs } = await supabase.from('receivables').select('*').lte('date', targetDate);

  console.log('\n📊 RECEBÍVEIS EM ABERTO / PENDENTES NO SISTEMA:');
  const byStore = {};
  let totalPending = 0;
  (recs || []).forEach(r => {
    if (r.status === 'pendente') {
      if (!byStore[r.store_name]) byStore[r.store_name] = { count: 0, sum: 0 };
      byStore[r.store_name].count++;
      byStore[r.store_name].sum += Number(r.value || 0);
      totalPending += Number(r.value || 0);
    }
  });

  for (const [st, info] of Object.entries(byStore)) {
    console.log(`- ${st.padEnd(25, ' ')}: ${info.count} título(s) | Total: R$ ${info.sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10, ' ')}`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`🎯 Total Geral de Títulos Pendentes: R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // Operacional vs Cartório
  const opPending = (recs || [])
    .filter(r => r.status === 'pendente' && (r.store_id === 'st-06' || r.store_id === '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'))
    .reduce((s, r) => s + Number(r.value || 0), 0);

  console.log(`\n🔍 A Receber Operacional do Marco Zero (Planalto + Mauá): R$ ${opPending.toFixed(2)} (Meta: R$ 8.049,67)`);
}

insertAllReceivables().catch(console.error);
