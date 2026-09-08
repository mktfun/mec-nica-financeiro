const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listStores() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) {
    console.error('Erro ao buscar stores:', error);
  } else {
    console.log(`Lojas cadastradas (${stores?.length}):`);
    stores.forEach(s => console.log(`- ID: "${s.id}" | Nome: "${s.name}" | Code: "${s.code}"`));
  }
}

listStores();
